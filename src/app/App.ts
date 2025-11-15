import { Router, NavigatePayload, RouteConfig, authManager } from "@infra";
import { setupRoutes } from "@pages/config";
import { Page } from "@shared/base/Page";
import { Layout } from "@shared/base/Layout";
import { getProfileCache, saveProfileCache } from "@features/profile";
import { fetchProfile } from "@entities/profile";

export class App {
    private rootElement: HTMLElement;
    private router!: Router;
    private activePage: Page | null = null;
    private activeLayout: Layout | null = null;
    private activeRouteConfig: RouteConfig | null = null;
    private roleLoaded = false;
    private resolvedRole: string | null = null;

    constructor() {
        this.rootElement = document.getElementById('app') as HTMLElement;
        if (!this.rootElement) {
            console.error('Root element #app not found. Check your index.html');
            return;
        }

        this.router = Router.getInstance();
        setupRoutes(this.router);

        this.router.onNavigate(async (payload) => {
            await this.initNavigate(payload);
        });

        this.router.start();
    }

    async init(): Promise<void> { }

    private async initNavigate({ layout, params, config }: NavigatePayload): Promise<void> {
        const shouldRedirect = await this.shouldRedirectToSupport(config.path);
        if (shouldRedirect) {
            await this.router.navigate("/support/admin", { replace: true });
            return;
        }

        if (!this.rootElement) return;

        const reuseLayout = this.activeLayout === layout && !!layout.getElement();

        if (this.activePage && this.activeRouteConfig === config) {
            await this.activePage.update(params);
            this.activeLayout = layout;
            this.activeRouteConfig = config;
            return;
        }

        const page = config.createPage(params);

        if (this.activePage && !reuseLayout) {
            await this.activePage.unmount();
        }

        await page.renderWithLayout(layout, reuseLayout);

        if (!reuseLayout || !layout.getElement()?.isConnected) {
            this.rootElement.innerHTML = '';
            await page.mount(this.rootElement);
        } else {
            await page.mount(this.rootElement, { skipAppend: true });
        }

        if (Object.keys(params).length > 0) {
            await page.update(params);
        }

        this.activePage = page;
        this.activeLayout = layout;
        this.activeRouteConfig = config;
    }

    private async shouldRedirectToSupport(targetPath: string): Promise<boolean> {
        if (!targetPath || targetPath.startsWith("/support/admin")) {
            return false;
        }
        const isAuthenticated = await authManager.ensureAuthenticated();
        if (!isAuthenticated) {
            return false;
        }
        const role = await this.resolveUserRole();
        return this.isSupportRole(role);
    }

    private async resolveUserRole(): Promise<string | null> {
        if (this.roleLoaded) {
            return this.resolvedRole;
        }

        const cached = getProfileCache();
        if (cached?.role) {
            this.resolvedRole = cached.role;
            this.roleLoaded = true;
            return cached.role;
        }

        try {
            const profile = await fetchProfile();
            saveProfileCache(profile);
            this.resolvedRole = profile.role ?? null;
        } catch (error) {
            console.warn("Failed to resolve user role", error);
            this.resolvedRole = null;
        }

        this.roleLoaded = true;
        return this.resolvedRole;
    }

    private isSupportRole(role: string | null | undefined): boolean {
        const normalized = role?.trim().toLowerCase();
        return normalized === "support" || normalized === "admin";
    }
}
