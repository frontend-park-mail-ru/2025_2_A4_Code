import { Component } from "@shared/base/Component";
import { HeaderComponent } from "@shared/widgets/Header/Header";
import { ProfileSidebarComponent } from "./components/ProfileSidebar/ProfileSidebar";
import { ProfileFormComponent } from "./components/ProfileForm/ProfileForm";
import { InterfaceSettingsComponent, type ItemId as InterfaceItemId } from "./components/InterfaceSettings/InterfaceSettings";
import { MainLayout } from "@app/components/MainLayout/MainLayout";
import { fetchProfile, type ProfileData, updateProfile, uploadProfileAvatar } from "@entities/profile";
import {
    deriveProfilePreview,
    primeProfilePreview,
    saveProfileCache,
    getProfileCache,
} from "@features/profile";
import { performLogout } from "@features/auth";
import { Router, authManager } from "@infra";
import { validateProfileForm } from "@utils/validation";
import "./views/ProfilePage.scss";
import { apiService } from "@shared/api/ApiService";
import { navigateToAuthPage } from "@shared/utils/authNavigation";

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

export class ProfilePage extends Component {
    private readonly router = Router.getInstance();
    private readonly layout = new MainLayout();
    private readonly sidebar: ProfileSidebarComponent;
    private readonly form: ProfileFormComponent;
    private readonly interfaceView: InterfaceSettingsComponent;
    private readonly header: HeaderComponent;
    private currentMain: Component | null = null;
    private profile: ProfileData | null = null;
    private globalLoadingDepth = 0;
    private profileLoadPromise: Promise<void> | null = null;
    private activeTab: "personal" | "interface" = "personal";
    private interfaceSection: InterfaceItemId = "folders";
    private postLogoutCheckStarted = false;

    constructor(params: { activeTab?: "personal" | "interface"; interfaceSection?: InterfaceItemId } = {}) {
        super();

        if (params.activeTab) {
            this.activeTab = params.activeTab;
        }
        if (params.interfaceSection) {
            this.interfaceSection = params.interfaceSection;
        }

        this.sidebar = new ProfileSidebarComponent({
            name: DEFAULT_PLACEHOLDER.fullName,
            email: DEFAULT_PLACEHOLDER.email,
            avatarUrl: DEFAULT_PLACEHOLDER.avatarUrl,
            onNavigateInbox: () => this.router.navigate("/mail"),
            onTabChange: (tabId) => this.handleTabChange(tabId as "personal" | "interface"),
            activeTab: this.activeTab,
        });

        this.form = new ProfileFormComponent({
            ...DEFAULT_PLACEHOLDER,
            onAvatarSelect: (file) => this.handleAvatarSelect(file),
            onSubmit: (values) => this.handleProfileSubmit(values),
            onCancel: () => this.handleProfileCancel(),
        });

        this.interfaceView = new InterfaceSettingsComponent({ initialItem: this.interfaceSection });

        this.header = new HeaderComponent({
            avatarLabel: "--",
            avatarImageUrl: DEFAULT_PLACEHOLDER.avatarUrl,
            userName: DEFAULT_PLACEHOLDER.fullName,
            userEmail: DEFAULT_PLACEHOLDER.email,
            onLogout: () => this.handleLogout(),
            onMenuToggle: () => this.layout.toggleSidebar(),
            onSettings: () => this.router.navigate("/profile"),
            onLogoClick: () => this.router.navigate("/mail"),
        });
    }

    protected renderTemplate(): string {
        return `<div class="profile-page"></div>`;
    }

    public render(): HTMLElement {
        const element = this.layout.render(this.getSlotContent());
        this.element = this.layout.getElement();
        return element;
    }

    public async mount(rootElement?: HTMLElement): Promise<void> {
        if (!this.element) {
            this.render();
        }
        await this.layout.mount(rootElement);
        this.element = this.layout.getElement();
    }

    public async init(): Promise<void> {
        this.layout.setContentBackground(false);
        this.layout.setSidebarWidth("240px");
        this.form.refreshOnlineState();
        this.applyCachedProfile();

        await this.loadProfile();
        await this.renderActiveMain();
    }

    public async unmount(): Promise<void> {
        this.layout.setContentBackground(true);
        this.layout.setSidebarWidth(null);
        this.profileLoadPromise = null;
        await this.layout.unmount();
        this.element = null;
    }

    private getSlotContent() {
        const main = this.activeTab === "interface" ? this.interfaceView : this.form;
        this.currentMain = main;
        return {
            header: this.header,
            sidebar: this.sidebar,
            main,
        };
    }

    private async renderActiveMain(): Promise<void> {
        const target = this.activeTab === "interface" ? this.interfaceView : this.form;
        if (this.currentMain === target) {
            return;
        }

        if (this.activeTab === "interface") {
            this.interfaceView.setActiveItem(this.interfaceSection);
        }

        await this.layout.updateSlot("main", target);
        this.currentMain = target;
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
        console.info("[auth] profile logout requested");
        const navigationPromise = navigateToAuthPage(this.router, "manual-logout");
        try {
            await performLogout();
        } catch (error) {
            console.error("Failed to logout", error);
        } finally {
            console.info("[auth] profile logout completed, starting post-logout check");
            await navigationPromise;
            await this.triggerPostLogoutAuthCheck();
        }
    }

    private async triggerPostLogoutAuthCheck(): Promise<void> {
        if (this.postLogoutCheckStarted) {
            console.info("[auth] profile post-logout check already started");
            return;
        }
        this.postLogoutCheckStarted = true;
        console.info("[auth] profile post-logout profile probe");
        try {
            await apiService.request("/user/profile", { skipAuthRefresh: true, parseJson: false });
            console.warn("[auth] post-logout profile request succeeded unexpectedly (still authenticated?)");
        } catch (error) {
            console.info("[auth] post-logout profile request failed (expected)", error);
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
            role: profile.role,
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
        this.layout.setLoading(this.globalLoadingDepth > 0);
    }

    private handleTabChange(tabId: "personal" | "interface"): void {
        if (this.activeTab === tabId) {
            return;
        }
        this.activeTab = tabId;
        if (tabId === "personal") {
            this.interfaceSection = "folders";
        }
        this.sidebar.setProps({ activeTab: tabId });
        this.layout.setSidebarOpen(false);
        this.currentMain = null;
        void this.renderActiveMain();
    }

    public async update(params: Record<string, string>): Promise<void> {
        const tab = params.section ? "interface" : params.tab === "interface" ? "interface" : "personal";
        const sectionParam = (params.section as InterfaceItemId | undefined) ?? "folders";
        const nextSection: InterfaceItemId = ["theme", "signature", "folders"].includes(sectionParam)
            ? sectionParam
            : "folders";

        this.activeTab = tab;
        this.interfaceSection = nextSection;
        this.sidebar.setProps({ activeTab: this.activeTab });
        await this.renderActiveMain();
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
