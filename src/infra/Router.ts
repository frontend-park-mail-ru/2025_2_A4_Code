import {Layout} from "../shared/base/Layout";
import {Page} from "../shared/base/Page";

export type RouteConfig = {
    path: string;
    createPage: (params: Record<string, string>) => Page;
    layoutKey: string;
    createLayout: () => Layout;
};

export type NavigatePayload = {
    path: string;
    layout: Layout;
    params: Record<string, string>;
    config: RouteConfig;
};

type NavigateOptions = {
    skipHistory?: boolean;
    replace?: boolean;
};

export class Router {
    private static instance: Router | null = null;

    private routes: RouteConfig[] = [];
    private layouts: Map<string, Layout> = new Map();
    private onNavigateCallback?: (payload: NavigatePayload) => void;

    private constructor() {
        this.attachPopstate();
    }

    public static getInstance(): Router {
        if (!Router.instance) {
            Router.instance = new Router();
        }

        return Router.instance;
    }

    public addRoute(config: RouteConfig): void {
        this.routes.push(config);
    }

    public onNavigate(callback: (payload: NavigatePayload) => void): void {
        this.onNavigateCallback = callback;
    }

    public start(initialPath: string = window.location.pathname || "/auth"): void {
        const normalized = !initialPath || initialPath === "/" ? "/auth" : initialPath;
        this.navigate(normalized, { replace: true }).then();
    }

    public async navigate(path: string, options: NavigateOptions = {}): Promise<void> {
        const normalizedPath = this.normalizePath(path);
        const match = this.findRoute(normalizedPath);

        if (match && this.onNavigateCallback) {
            const { config, params } = match;
            const layout = this.getOrCreateLayout(config);

            if (!options.skipHistory) {
                if (options.replace) {
                    window.history.replaceState({}, "", normalizedPath);
                } else {
                    window.history.pushState({}, "", normalizedPath);
                }
            }

            this.onNavigateCallback({ path: normalizedPath, layout, params, config });
            return;
        }

        if (path === "/404") {
            console.error("Not found");
            return;
        }

        const notFoundRoute = this.findRoute("/404");
        if (notFoundRoute && this.onNavigateCallback) {
            const { config, params } = notFoundRoute;
            const layout = this.getOrCreateLayout(config);
            if (!options.skipHistory) {
                window.history.replaceState({}, "", "/404");
            }
            this.onNavigateCallback({ path: "/404", layout, params, config });
            return;
        }

        console.error("Router: route not found");
    }

    public getQueryParams(): URLSearchParams {
        return new URLSearchParams(window.location.search);
    }

    private getOrCreateLayout(route: RouteConfig): Layout {
        const cached = this.layouts.get(route.layoutKey);
        if (cached) {
            return cached;
        }

        const layout = route.createLayout();
        this.layouts.set(route.layoutKey, layout);
        return layout;
    }

    private findRoute(path: string): { config: RouteConfig; params: Record<string, string> } | null {
        for (const route of this.routes) {
            const params = this.matchRoute(path, route.path);
            if (params) {
                return { config: route, params };
            }
        }
        return null;
    }

    private matchRoute(path: string, pattern: string): Record<string, string> | null {
        const { regex, paramNames } = this.compilePath(pattern);
        const match = path.match(regex);
        if (!match) {
            return null;
        }

        const params: Record<string, string> = {};
        paramNames.forEach((name, index) => {
            const value = match[index + 1];
            if (typeof value !== "undefined") {
                params[name] = value;
            }
        });
        return params;
    }

    private compilePath(path: string): { regex: RegExp; paramNames: string[] } {
        if (path === "/") {
            return { regex: /^\/$/, paramNames: [] };
        }

        const segments = path.split("/").filter(Boolean);
        const paramNames: string[] = [];
        let pattern = "";

        segments.forEach((segment) => {
            if (segment.startsWith(":")) {
                const optional = segment.endsWith("?");
                const name = segment.replace(/^:/, "").replace(/\?$/, "");
                paramNames.push(name);
                pattern += optional ? "(?:/([^/]+))?" : "/([^/]+)";
            } else {
                pattern += "/" + segment.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
            }
        });

        return {
            regex: new RegExp(`^${pattern}$`),
            paramNames,
        };
    }

    private attachPopstate(): void {
        window.addEventListener("popstate", () => {
            this.navigate(window.location.pathname, { skipHistory: true });
        });
    }

    private normalizePath(path: string): string {
        if (!path) {
            return "/";
        }

        const url = path.includes("http://") || path.includes("https://") ? new URL(path).pathname : path;
        if (url.length > 1 && url.endsWith("/")) {
            return url.slice(0, -1);
        }
        return url;
    }
}
