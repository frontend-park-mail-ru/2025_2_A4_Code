import { Router, NavigatePayload, RouteConfig } from "@infra";
import { setupRoutes } from "@pages/config";
import { Page } from "@shared/base/Page";
import { Layout } from "@shared/base/Layout";

export class App {
    private rootElement: HTMLElement;
    private router!: Router;
    private activePage: Page | null = null;
    private activeLayout: Layout | null = null;
    private activeRouteConfig: RouteConfig | null = null;

    constructor() {
        this.rootElement = document.getElementById('app') as HTMLElement;
        if (!this.rootElement) {
            console.error('Root element #app not found. Check your index.html');
            return;
        }

        this.router = Router.getInstance();
        setupRoutes(this.router);

        this.router.onNavigate(async (payload) => {
            await this.handleNavigate(payload);
        });

        this.router.start();
    }

    async init(): Promise<void> {
    }

    private async handleNavigate({ layout, params, config }: NavigatePayload): Promise<void> {
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
}
