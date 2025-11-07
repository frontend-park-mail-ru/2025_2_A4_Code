import type { ProfileData } from "@entities/profile";

const STORAGE_KEY = "flintmail:profile";

export function saveProfileCache(profile: ProfileData): void {
    if (typeof window === "undefined" || !window.localStorage) {
        return;
    }

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
        console.warn("[profile] failed to persist profile cache", error);
    }
}

export function getProfileCache(): ProfileData | null {
    if (typeof window === "undefined" || !window.localStorage) {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw) as ProfileData;
    } catch (error) {
        console.warn("[profile] failed to read profile cache", error);
        return null;
    }
}

export function clearProfileCache(): void {
    if (typeof window === "undefined" || !window.localStorage) {
        return;
    }

    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.warn("[profile] failed to clear profile cache", error);
    }
}
