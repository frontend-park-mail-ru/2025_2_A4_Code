import { Page } from "../../shared/base/Page";
import { HeaderComponent } from "../../shared/widgets/Header/Header";
import { ProfileSidebarComponent } from "./components/ProfileSidebar/ProfileSidebar";
import { ProfileFormComponent } from "./components/ProfileForm/ProfileForm";
import { MainLayout } from "../../app/components/MainLayout/MainLayout";
import { fetchProfile, ProfileData, updateProfile, uploadProfileAvatar } from "./api";
import { logout } from "../auth/api";
import { authManager } from "../../infra";
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
    fullName: "Профиль",
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
            avatarLabel: this.getInitials(DEFAULT_PLACEHOLDER.fullName),
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

        await this.loadProfile();
    }

    public async unmount(): Promise<void> {
        if (this.layout instanceof MainLayout) {
            this.layout.setContentBackground(true);
            this.layout.setSidebarWidth(null);
        }
        await super.unmount();
    }

    private async loadProfile(): Promise<void> {
        try {
            const fetchedProfile = await fetchProfile();
            const normalizedProfile = this.normalizeProfile(fetchedProfile);
            this.applyProfile(normalizedProfile);
        } catch (error) {
            console.error("Failed to load profile", error);
        }
    }

    private async handleAvatarSelect(file: File): Promise<void> {
        if (!file) {
            return;
        }

        try {
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
        }
    }

    private async handleProfileSubmit(values: {
        firstName: string;
        lastName: string;
        middleName: string;
        birthDate: string;
        gender: ProfileData["gender"];
    }): Promise<void> {
        try {
            this.form.setSubmitting(true);

            const updatedProfile = await updateProfile({
                firstName: values.firstName,
                lastName: values.lastName,
                middleName: values.middleName,
                birthday: values.birthDate,
                gender: values.gender,
            });

            const normalizedProfile = this.normalizeProfile(updatedProfile);
            this.applyProfile(normalizedProfile);
        } catch (error) {
            console.error("Failed to update profile", error);
        } finally {
            this.form.setSubmitting(false);
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
            await logout();
        } catch (error) {
            console.error("Failed to logout", error);
        } finally {
            authManager.setAuthenticated(false);
            this.router.navigate("/auth").then();
        }
    }

    private applyProfile(profile: ProfileData): void {
        const { fullName, email, username, firstName, lastName, middleName, birthday, gender, avatarUrl } = profile;
        const resolvedAvatar = avatarUrl ?? null;

        this.profile = profile;

        this.sidebar.setProps({
            name: fullName,
            email,
            avatarUrl: resolvedAvatar,
        });

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

        this.header.setProps({
            avatarLabel: this.getInitials(fullName),
            avatarImageUrl: resolvedAvatar,
            userName: fullName,
            userEmail: email,
        });

        HeaderComponent.updateProfileCache({
            avatarUrl: resolvedAvatar,
            initials: this.getInitials(fullName),
            fullName,
            email,
        });
    }

    private normalizeProfile(profile: ProfileData): ProfileData {
        const displayName = (profile.fullName || profile.username).trim();
        return {
            ...profile,
            fullName: displayName || profile.username,
        };
    }

    private getInitials(value: string): string {
        const initials = value
            .split(" ")
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

        return initials || "--";
    }
}
