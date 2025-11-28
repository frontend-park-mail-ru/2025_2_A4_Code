import { Router, authManager } from "@infra";

const AUTH_PATH = "/auth";

export type AuthNavigationReason =
    | "status-change"
    | "manual-logout"
    | "unauthorized-handler"
    | "api-401"
    | "header-avatar"
    | "header-logout"
    | "post-logout-check"
    | "unknown";

/**
 * Mark the user as unauthenticated and navigate to the auth page without reloading.
 */
export async function navigateToAuthPage(
    router: Router,
    reason: AuthNavigationReason = "unknown"
): Promise<void> {
    if (typeof window === "undefined") {
        return;
    }

    authManager.setAuthenticated(false);

    console.info("[auth] navigateToAuthPage", {
        reason,
        path: window.location.pathname,
    });

    const initialPath = window.location.pathname;
    try {
        await router.navigate(AUTH_PATH, { replace: true, force: true });
    } catch (error) {
        console.warn("[auth] router navigate to auth failed", error);
    }

    // Fallback: if history/location did not change, force the URL and trigger popstate.
    if (window.location.pathname === initialPath) {
        window.history.replaceState({}, "", AUTH_PATH);
        window.dispatchEvent(new PopStateEvent("popstate"));
    }
}
