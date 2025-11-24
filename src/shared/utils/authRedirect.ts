import { Router } from "@infra";

const AUTH_PATH = "/auth";

type RedirectReason =
    | "status-change"
    | "manual-logout"
    | "unauthorized-handler"
    | "api-401"
    | "header-avatar"
    | "unknown";

type RedirectOptions = {
    /** Force full reload even if already on /auth */
    forceReload?: boolean;
};

/**
 * Navigate user to the auth page with a hard redirect fallback.
 * Uses router navigation first, then forces location replacement on next tick.
 */
export function redirectToAuth(
    router?: Router,
    reason: RedirectReason = "unknown",
    options: RedirectOptions = {}
): void {
    if (typeof window === "undefined") {
        return;
    }

    console.info("[auth] redirectToAuth", {
        reason,
        path: window.location.pathname,
        forceReload: options.forceReload ?? false,
    });

    if (router) {
        router.navigate(AUTH_PATH, { replace: true }).catch((error) => {
            console.warn("[auth] router navigate to auth failed", error);
        });
    }

    // Always force navigation; if already on /auth, this will reload the page.
    window.setTimeout(() => {
        if (options.forceReload || window.location.pathname !== AUTH_PATH) {
            window.location.replace(AUTH_PATH);
        }
    }, 0);
}
