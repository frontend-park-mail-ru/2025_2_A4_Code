import {
    login,
    logout,
    register,
    type LoginPayload,
    type RegisterPayload,
} from "@entities/auth";
import { AUTH_ERROR_TEXTS, REGISTER_ERROR_TEXTS } from "../constants/messages";
import { extractApiErrorMessage } from "@shared/utils/apiError";
import { DATA_CACHE_PREFIX } from "../../../serviceWorker/cacheConfig";
import { SW_MESSAGES } from "../../../serviceWorker/messages";
import { fetchProfile } from "@entities/profile";
import {
    deriveProfilePreview,
    primeProfilePreview,
    saveProfileCache,
    clearProfileCache,
} from "@features/profile";
import { clearAllCookies } from "@shared/utils/cookies";
import { extractTokens, setTokens, clearTokens } from "@shared/api/authTokens";

export type AuthResult = { success: true } | { success: false; message: string };

export async function authenticate(payload: LoginPayload): Promise<AuthResult> {
    try {
        const response = await login(payload);
        persistTokens(response);
        await setupProfileCache();
        return { success: true };
    } catch (error) {
        clearTokens();
        return {
            success: false,
            message: extractApiErrorMessage(error, AUTH_ERROR_TEXTS.generic),
        };
    }
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResult> {
    try {
        await register(payload);
        const response = await login({
            login: payload.username,
            password: payload.password,
        });
        persistTokens(response);
        await setupProfileCache();
        return { success: true };
    } catch (error) {
        clearTokens();
        return {
            success: false,
            message: extractApiErrorMessage(error, REGISTER_ERROR_TEXTS.generic),
        };
    }
}

export async function performLogout(): Promise<void> {
    try {
        await logout();
    } finally {
        clearTokens();
        clearAllCookies();
        clearProfileCache();
        await clearCachedData();
    }
}

async function clearCachedData(): Promise<void> {
    await Promise.all([clearBrowserCaches(), notifyServiceWorkerToClearCaches()]);
}

async function clearBrowserCaches(): Promise<void> {
    if (typeof window === "undefined" || typeof caches === "undefined") {
        return;
    }

    try {
        const keys = await caches.keys();
        const targets = keys.filter((key) => key.startsWith(DATA_CACHE_PREFIX));
        if (targets.length === 0) {
            return;
        }

        await Promise.all(targets.map((key) => caches.delete(key)));
    } catch (error) {
        console.warn("[auth] failed to clear cached data", error);
    }
}

async function notifyServiceWorkerToClearCaches(): Promise<void> {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
        return;
    }

    try {
        const registration =
            (await navigator.serviceWorker.getRegistration().catch(() => undefined)) ??
            (await navigator.serviceWorker.ready.catch(() => undefined));

        const target = registration?.active ?? registration?.waiting ?? registration?.installing;
        target?.postMessage({ type: SW_MESSAGES.CLEAR_DATA_CACHE });
    } catch (error) {
        console.warn("[auth] failed to notify service worker about cache cleanup", error);
    }
}

async function setupProfileCache(): Promise<void> {
    try {
        const profile = await fetchProfile();
        saveProfileCache(profile);
        const preview = deriveProfilePreview(profile);
        primeProfilePreview(preview);
    } catch (error) {
        console.warn("[auth] failed to preload profile after authentication", error);
    }
}

function persistTokens(response: unknown): void {
    const tokens = extractTokens(response as any);
    if (!tokens) {
        throw new Error("No tokens in auth response");
    }
    setTokens(tokens.accessToken, tokens.refreshToken);
}
