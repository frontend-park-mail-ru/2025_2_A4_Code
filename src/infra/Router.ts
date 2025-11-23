import { Component } from "@shared/base/Component";
import { authManager } from "./AuthManager";

export type RouteConfig = {
    path: string;
    createView: (params: Record<string, string>) => Component;
    requiresAuth?: boolean;
    guestOnly?: boolean;
};

export type NavigatePayload = {
    path: string;
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

            const accessAllowed = await this.ensureRouteAccess(config, normalizedPath, options);
            if (!accessAllowed) {
                return;
            }

            if (!options.skipHistory) {
                if (options.replace) {
                    window.history.replaceState({}, "", normalizedPath);
                } else {
                    window.history.pushState({}, "", normalizedPath);
                }
            }

            this.onNavigateCallback({ path: normalizedPath, params, config });
            return;
        }

        const status = authManager.getStatus();
        const target = status === "authenticated" ? "/inbox" : "/auth";
        console.warn(`Router: route not found, redirecting to ${target}`);
        await this.navigate(target, { replace: true, skipHistory: options.skipHistory });
    }

    public getQueryParams(): URLSearchParams {
        return new URLSearchParams(window.location.search);
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

    private async ensureRouteAccess(
        config: RouteConfig,
        currentPath: string,
        _options: NavigateOptions
    ): Promise<boolean> {
        const requiresAuth = config.requiresAuth ?? false;
        const guestOnly = config.guestOnly ?? false;

        if (!requiresAuth && !guestOnly) {
            return true;
        }

        const status = authManager.getStatus();
        let isAuthenticated: boolean;

        if (status === "unknown") {
            isAuthenticated = await authManager.ensureAuthenticated();
        } else {
            isAuthenticated = status === "authenticated";
        }

        if (requiresAuth && !isAuthenticated) {
            if (currentPath !== "/auth") {
                await this.navigate("/auth", { replace: true });
            }
            return false;
        }

        if (guestOnly && isAuthenticated) {
            if (currentPath !== "/inbox") {
                await this.navigate("/inbox", { replace: true });
            }
            return false;
        }

        return true;
    }
}
