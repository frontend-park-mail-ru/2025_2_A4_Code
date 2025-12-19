import { Router, NavigatePayload, RouteConfig, authManager } from "@infra";
import { setupRoutes } from "@pages/config";
import { Component } from "@shared/base/Component";
import { apiService } from "@shared/api/ApiService";
import { navigateToAuthPage } from "@shared/utils/authNavigation";

type RoutableComponent = Component & {
    update?(params: Record<string, string>): Promise<void> | void;
    init?(): Promise<void> | void;
};

export class App {
    private rootElement: HTMLElement;
    private router!: Router;
    private activePage: RoutableComponent | null = null;
    private activeRouteConfig: RouteConfig | null = null;
    private stopAuthListener?: () => void;

    constructor() {
        this.rootElement = document.getElementById('app') as HTMLElement;
        if (!this.rootElement) {
            // console.error('Root element #app not found. Check your index.html');
            return;
        }

        this.router = Router.getInstance();
        setupRoutes(this.router);

        this.router.onNavigate(async (payload) => {
            await this.initNavigate(payload);
        });

        this.stopAuthListener = authManager.onStatusChange((status) => {
            if (status === "unauthenticated" && window.location.pathname !== "/auth") {
                // console.info("[auth] status change -> unauthenticated, redirecting");
                void navigateToAuthPage(this.router, "status-change");
            }
        });

        apiService.setUnauthorizedHandler(({ url, method, status }) => {
            // console.warn("[auth] unauthorized from api", { url, method, status });
            void navigateToAuthPage(this.router, "api-401");
        });

        this.router.start();
    }

    async init(): Promise<void> { }

    private async initNavigate({ params, config }: NavigatePayload): Promise<void> {
        if (!this.rootElement) return;

        if (this.activePage && this.activeRouteConfig === config) {
            if (typeof this.activePage.update === "function") {
                await this.activePage.update(params);
            }
            this.activeRouteConfig = config;
            return;
        }

        if (this.activePage) {
            await this.activePage.unmount();
        }

        const page = config.createView(params) as RoutableComponent;
        page.render();

        this.rootElement.innerHTML = "";
        await page.mount(this.rootElement);

        if (typeof page.init === "function") {
            await page.init();
        }

        if (Object.keys(params).length > 0 && typeof page.update === "function") {
            await page.update(params);
        }

        this.activePage = page;
        this.activeRouteConfig = config;
    }
}
