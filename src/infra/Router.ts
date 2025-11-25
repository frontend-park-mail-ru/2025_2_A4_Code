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
    /** Bypass access guards and force navigation */
    force?: boolean;
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
        console.info("[Router] navigate requested", { path, normalizedPath, options });
        const match = this.findRoute(normalizedPath);

        if (match && this.onNavigateCallback) {
            const { config, params } = match;
            console.info("[Router] route match", { path: normalizedPath, params, config });

            if (!options.force) {
                const accessAllowed = await this.ensureRouteAccess(config, normalizedPath, options);
                if (!accessAllowed) {
                    console.info("[Router] access denied, navigation stopped", { path: normalizedPath });
                    return;
                }
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
        const target = status === "authenticated" ? "/mail" : "/auth";
        console.warn(`Router: route not found, redirecting to ${target}`, { path, normalizedPath });
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

        const pathname =
            path.includes("http://") || path.includes("https://")
                ? new URL(path).pathname
                : path.split(/[?#]/)[0];

        if (pathname.length > 1 && pathname.endsWith("/")) {
            return pathname.slice(0, -1);
        }
        return pathname;
    }

    private async ensureRouteAccess(
        config: RouteConfig,
        currentPath: string,
        _options: NavigateOptions
    ): Promise<boolean> {
        const requiresAuth = config.requiresAuth ?? false;
        const guestOnly = config.guestOnly ?? false;

        if (!requiresAuth && !guestOnly) {
            console.info("[Router] access allowed (no auth/guest flags)", { path: currentPath });
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
            console.info("[Router] blocked: requires auth, redirecting to /auth", {
                path: currentPath,
                status,
            });
            if (currentPath !== "/auth") {
                await this.navigate("/auth", { replace: true });
            }
            return false;
        }

        if (guestOnly && isAuthenticated) {
            console.info("[Router] blocked: guest-only route while authenticated, redirecting to /mail", {
                path: currentPath,
                status,
            });
            if (currentPath !== "/mail") {
                await this.navigate("/mail", { replace: true });
            }
            return false;
        }

        console.info("[Router] access allowed", { path: currentPath, status });
        return true;
    }
}
