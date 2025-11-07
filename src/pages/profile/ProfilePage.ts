import { Page } from "@shared/base/Page";
import { HeaderComponent } from "@shared/widgets/Header/Header";
import { ProfileSidebarComponent } from "./components/ProfileSidebar/ProfileSidebar";
import { ProfileFormComponent } from "./components/ProfileForm/ProfileForm";
import { MainLayout } from "@app/components/MainLayout/MainLayout";
import { fetchProfile, type ProfileData, updateProfile, uploadProfileAvatar } from "@entities/profile";
import {
    deriveProfilePreview,
    primeProfilePreview,
    saveProfileCache,
    getProfileCache,
} from "@features/profile";
import { performLogout } from "@features/auth";
import { authManager } from "@infra";
import { validateProfileForm } from "@utils/validation";
import "./views/ProfilePage.scss";

type PlaceholderProfile = {
    fullName: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    middleName: string;
    birthDate: string;
    gender: ProfileData["gender"];
    avatarUrl: string | null;
};

const DEFAULT_PLACEHOLDER: PlaceholderProfile = {
    fullName: "",
    email: "",
    username: "",
    firstName: "",
    lastName: "",
    middleName: "",
    birthDate: "",
    gender: "",
    avatarUrl: null,
};

export class ProfilePage extends Page {
    private readonly sidebar: ProfileSidebarComponent;
    private readonly form: ProfileFormComponent;
    private readonly header: HeaderComponent;
    private profile: ProfileData | null = null;
    private globalLoadingDepth = 0;
    private profileLoadPromise: Promise<void> | null = null;

    constructor() {
        super();

        this.sidebar = new ProfileSidebarComponent({
            name: DEFAULT_PLACEHOLDER.fullName,
            email: DEFAULT_PLACEHOLDER.email,
            avatarUrl: DEFAULT_PLACEHOLDER.avatarUrl,
            onNavigateInbox: () => this.router.navigate("/inbox"),
        });

        this.form = new ProfileFormComponent({
            ...DEFAULT_PLACEHOLDER,
            onAvatarSelect: (file) => this.handleAvatarSelect(file),
            onSubmit: (values) => this.handleProfileSubmit(values),
            onCancel: () => this.handleProfileCancel(),
        });

        this.header = new HeaderComponent({
            showSearch: false,
            avatarLabel: "--",
            avatarImageUrl: DEFAULT_PLACEHOLDER.avatarUrl,
            userName: DEFAULT_PLACEHOLDER.fullName,
            userEmail: DEFAULT_PLACEHOLDER.email,
            onLogout: () => this.handleLogout(),
        });
    }

    protected renderTemplate(): string {
        return `<div class="profile-page"></div>`;
    }

    protected getSlotContent() {
        return {
            header: this.header,
            sidebar: this.sidebar,
            main: this.form,
        };
    }

    public async init(): Promise<void> {
        if (this.layout instanceof MainLayout) {
            this.layout.setContentBackground(false);
            this.layout.setSidebarWidth("240px");
        }
        this.form.refreshOnlineState();
        this.applyCachedProfile();

        await this.loadProfile();
    }

    public async unmount(): Promise<void> {
        if (this.layout instanceof MainLayout) {
            this.layout.setContentBackground(true);
            this.layout.setSidebarWidth(null);
        }
        this.profileLoadPromise = null;
        await super.unmount();
    }

    private async loadProfile(): Promise<void> {
        if (this.profileLoadPromise) {
            return this.profileLoadPromise;
        }

        this.profileLoadPromise = this.performProfileLoad().finally(() => {
            this.profileLoadPromise = null;
        });

        await this.profileLoadPromise;
    }

    private async performProfileLoad(): Promise<void> {
        this.beginGlobalLoading();
        try {
            const fetchedProfile = await fetchProfile();
            const normalizedProfile = this.normalizeProfile(fetchedProfile);
            this.applyProfile(normalizedProfile);
        } catch (error) {
            console.error("Failed to load profile", error);
            this.showInitialsFallback();
        } finally {
            this.endGlobalLoading();
        }
    }

    private async handleAvatarSelect(file: File): Promise<void> {
        if (!file) {
            return;
        }

        try {
            this.beginGlobalLoading();
            this.form.setAvatarUploading(true);
            const avatarPath = await uploadProfileAvatar(file);
            const avatarUrl = avatarPath || null;

            if (this.profile) {
                this.profile.avatarUrl = avatarUrl;
                this.applyProfile(this.profile);
            }
        } catch (error) {
            console.error("Failed to upload avatar", error);
        } finally {
            this.form.setAvatarUploading(false);
            this.endGlobalLoading();
        }
    }

    private async handleProfileSubmit(values: {
        firstName: string;
        lastName: string;
        middleName: string;
        birthDate: string;
        gender: ProfileData["gender"];
    }): Promise<void> {
        const errors = validateProfileForm({
            firstName: values.firstName,
            lastName: values.lastName,
            middleName: values.middleName,
            birthDate: values.birthDate,
            gender: values.gender ?? "",
        });
        this.form.setErrors(errors);
        if (errors.length > 0) {
            return;
        }

        this.beginGlobalLoading();
        this.form.setSubmitting(true);
        try {
            const updatedProfile = await updateProfile({
                firstName: values.firstName,
                lastName: values.lastName,
                middleName: values.middleName,
                birthday: values.birthDate,
                gender: values.gender,
            });

            const normalizedProfile = this.normalizeProfile(updatedProfile);
            this.applyProfile(normalizedProfile);
            this.form.clearErrors();
        } catch (error) {
            console.error("Failed to update profile", error);
        } finally {
            this.form.setSubmitting(false);
            this.endGlobalLoading();
        }
    }

    private handleProfileCancel(): void {
        if (!this.profile) {
            this.form.setProfile({ ...DEFAULT_PLACEHOLDER });
            return;
        }

        this.applyProfile(this.profile);
    }

    private async handleLogout(): Promise<void> {
        try {
            await performLogout();
        } catch (error) {
            console.error("Failed to logout", error);
        } finally {
            authManager.setAuthenticated(false);
            this.router.navigate("/auth", { replace: true }).then();
        }
    }

    private applyProfile(profile: ProfileData): void {
        const { fullName, email, username, firstName, lastName, middleName, birthday, gender, avatarUrl } = profile;
        const resolvedAvatar = avatarUrl ?? null;

        this.profile = profile;
        saveProfileCache(profile);

        this.sidebar.setProps({
            name: fullName,
            email,
            avatarUrl: resolvedAvatar,
        });

        this.form.clearErrors();
        this.form.setProfile({
            fullName,
            email,
            username,
            firstName,
            lastName,
            middleName,
            birthDate: birthday,
            gender,
            avatarUrl: resolvedAvatar,
        });

        const preview = deriveProfilePreview(profile);

        this.header.setProps({
            avatarLabel: preview.initials,
            avatarImageUrl: preview.avatarUrl,
            userName: preview.fullName,
            userEmail: preview.email,
        });

        primeProfilePreview(preview);
    }

    private normalizeProfile(profile: ProfileData): ProfileData {
        const displayName = (profile.fullName || profile.username).trim();
        return {
            ...profile,
            fullName: displayName || profile.username,
        };
    }

    private beginGlobalLoading(): void {
        this.globalLoadingDepth += 1;
        this.updateLayoutLoadingState();
    }

    private endGlobalLoading(): void {
        if (this.globalLoadingDepth === 0) {
            return;
        }
        this.globalLoadingDepth -= 1;
        this.updateLayoutLoadingState();
    }

    private updateLayoutLoadingState(): void {
        if (this.layout instanceof MainLayout) {
            this.layout.setLoading(this.globalLoadingDepth > 0);
        }
    }

    private applyCachedProfile(): void {
        const cachedProfile = getProfileCache();
        if (!cachedProfile) {
            return;
        }

        const normalizedCached = this.normalizeProfile(cachedProfile);
        this.applyProfile(normalizedCached);
    }

    private showInitialsFallback(): void {
        this.sidebar.setProps({ avatarUrl: null });
        this.form.setAvatarUrl(null);

        const preview = this.profile ? deriveProfilePreview(this.profile) : null;
        this.header.setProps({
            avatarImageUrl: null,
            avatarLabel: preview?.initials ?? "--",
        });
    }
}


