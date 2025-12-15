export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
};

type RawTokens = {
    access_token?: string;
    refresh_token?: string;
    accessToken?: string;
    refreshToken?: string;
    body?: RawTokens;
};

const ACCESS_KEY = "flintmail_access_token";
const REFRESH_KEY = "flintmail_refresh_token";

let memoryTokens: AuthTokens | null = null;

export function extractTokens(payload: RawTokens | null | undefined): AuthTokens | null {
    if (!payload) {
        return null;
    }

    const source = payload.body ?? payload;
    const access = source.access_token ?? source.accessToken;
    const refresh = source.refresh_token ?? source.refreshToken;

    if (typeof access === "string" && typeof refresh === "string") {
        return {
            accessToken: access,
            refreshToken: refresh,
        };
    }

    return null;
}

export function setTokens(accessToken: string, refreshToken: string): void {
    memoryTokens = { accessToken, refreshToken };
    try {
        if (typeof localStorage !== "undefined") {
            localStorage.setItem(ACCESS_KEY, accessToken);
            localStorage.setItem(REFRESH_KEY, refreshToken);
        }
    } catch {
        // ignore storage errors
    }
}

export function clearTokens(): void {
    memoryTokens = null;
    try {
        if (typeof localStorage !== "undefined") {
            localStorage.removeItem(ACCESS_KEY);
            localStorage.removeItem(REFRESH_KEY);
        }
    } catch {
        // ignore storage errors
    }
}

export function getAccessToken(): string | null {
    if (memoryTokens?.accessToken) {
        return memoryTokens.accessToken;
    }
    try {
        if (typeof localStorage !== "undefined") {
            const stored = localStorage.getItem(ACCESS_KEY);
            if (stored) {
                memoryTokens = {
                    accessToken: stored,
                    refreshToken: memoryTokens?.refreshToken ?? localStorage.getItem(REFRESH_KEY) ?? "",
                };
                return stored;
            }
        }
    } catch {
        // ignore storage errors
    }
    return null;
}

export function getRefreshToken(): string | null {
    if (memoryTokens?.refreshToken) {
        return memoryTokens.refreshToken;
    }
    try {
        if (typeof localStorage !== "undefined") {
            const stored = localStorage.getItem(REFRESH_KEY);
            if (stored) {
                memoryTokens = {
                    refreshToken: stored,
                    accessToken: memoryTokens?.accessToken ?? localStorage.getItem(ACCESS_KEY) ?? "",
                };
                return stored;
            }
        }
    } catch {
        // ignore storage errors
    }
    return null;
}
