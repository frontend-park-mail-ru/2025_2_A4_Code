import { Component } from "@shared/base/Component";
import { HeaderComponent } from "@shared/widgets/Header/Header";
import { ProfileSidebarComponent } from "@pages/profile/components/ProfileSidebar/ProfileSidebar";
import { MainLayout } from "@app/components/MainLayout/MainLayout";
import { fetchProfile, type ProfileData } from "@entities/profile";
import { deriveProfilePreview, getProfileCache, primeProfilePreview, saveProfileCache } from "@features/profile";
import { Router } from "@infra";
import { navigateToAuthPage } from "@shared/utils/authNavigation";
import { performLogout } from "@features/auth";
import { ProfileInfoFormComponent } from "./components/ProfileInfoForm/ProfileInfoForm";
import template from "./views/ProfileInfoPage.hbs";
import "./views/ProfileInfoPage.scss";

export class ProfileInfoPage extends Component {
    private readonly router = Router.getInstance();
    private readonly layout = new MainLayout();
    private readonly sidebar: ProfileSidebarComponent;
    private readonly header: HeaderComponent;
    private readonly infoForm: ProfileInfoFormComponent;
    private profile: ProfileData | null = null;
    private loadingDepth = 0;

    constructor() {
        super();

        this.sidebar = new ProfileSidebarComponent({
            name: "",
            email: "",
            avatarUrl: null,
            onNavigateInbox: () => this.router.navigate("/mail"),
            activeTab: "personal",
            showTabs: false,
        });

        this.header = new HeaderComponent({
            avatarLabel: "--",
            avatarImageUrl: null,
            userName: "",
            userEmail: "",
            onLogout: () => this.handleLogout(),
            onMenuToggle: () => this.layout.toggleSidebar(),
            onSettings: () => this.router.navigate("/profile"),
            onLogoClick: () => this.router.navigate("/mail"),
        });

        this.infoForm = new ProfileInfoFormComponent({
            onSave: (data) => this.handleSave(data),
        });
    }

    protected renderTemplate(): string {
        return template({});
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
        this.applyCachedProfile();
        await this.loadProfile();
    }

    public async unmount(): Promise<void> {
        this.layout.setContentBackground(true);
        this.layout.setSidebarWidth(null);
        await this.layout.unmount();
        this.element = null;
    }

    private getSlotContent() {
        return {
            header: this.header,
            sidebar: this.sidebar,
            main: this.infoForm,
        };
    }

    private async loadProfile(): Promise<void> {
        this.beginLoading();
        try {
            const profile = await fetchProfile();
            this.applyProfile(profile);
        } catch (error) {
            // console.error("Failed to load profile info", error);
        } finally {
            this.endLoading();
        }
    }

    private applyProfile(profile: ProfileData): void {
        this.profile = profile;
        saveProfileCache(profile);
        const preview = deriveProfilePreview(profile);
        primeProfilePreview(preview);

        this.sidebar.setProps({
            name: profile.fullName || profile.username,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
        });

        this.header.setProps({
            avatarLabel: preview.initials,
            avatarImageUrl: preview.avatarUrl,
            userName: preview.fullName,
            userEmail: preview.email,
        });
    }

    private applyCachedProfile(): void {
        const cached = getProfileCache();
        if (!cached) return;
        this.applyProfile(cached);
    }

    private beginLoading(): void {
        this.loadingDepth += 1;
        this.layout.setLoading(this.loadingDepth > 0);
    }

    private endLoading(): void {
        if (this.loadingDepth === 0) return;
        this.loadingDepth -= 1;
        this.layout.setLoading(this.loadingDepth > 0);
    }

    private async handleSave(data: { description: string; timeRange: { from: string; to: string } }): Promise<void> {
        // console.info("Profile info saved", data);
    }

    private async handleLogout(): Promise<void> {
        const navigationPromise = navigateToAuthPage(this.router, "header-logout");
        try {
            await performLogout();
        } catch (error) {
            // console.error("Failed to logout", error);
        } finally {
            await navigationPromise;
        }
    }
}
