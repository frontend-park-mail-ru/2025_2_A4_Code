import { setOnlineStatus } from "@shared/utils/onlineStatus";
import { DATA_CACHE_PREFIX } from "../../serviceWorker/cacheConfig";

export interface RequestOptions extends Omit<RequestInit, "body" | "headers"> {
    parseJson?: boolean;
    body?: unknown;
    headers?: Record<string, string>;
    skipAuthRefresh?: boolean;
}

declare global {
    interface Window {
        __API_BASE_URL__?: string;
    }
}

const OFFLINE_HEADER = "X-Flintmail-Offline";

export class OfflineError extends Error {
    constructor(message = "не в сети") {
        super(message);
        this.name = "OfflineError";
    }
}

export function isOfflineError(error: unknown): error is OfflineError {
    return error instanceof OfflineError;
}

export class HttpError extends Error {
    public readonly status: number;
    public readonly url: string;

    constructor(status: number, url: string, message?: string) {
        super(message || `Request failed with status ${status}`);
        this.name = "HttpError";
        this.status = status;
        this.url = url;
    }
}

export function isHttpError(error: unknown): error is HttpError {
    return error instanceof HttpError;
}

export class ApiService {
    private refreshPromise: Promise<boolean> | null = null;

    constructor(private readonly baseUrl: string = "") {}

    public async request<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
        const {
            parseJson = true,
            headers = {},
            body,
            skipAuthRefresh = false,
            ...rest
        } = options;

        const method = typeof rest.method === "string" ? rest.method.toUpperCase() : "GET";
        const requestUrl = `${this.baseUrl}${url}`;
        const startedAt =
            typeof performance !== "undefined" && typeof performance.now === "function"
                ? performance.now()
                : Date.now();

        const isJsonPayload =
            body !== undefined &&
            typeof body === "object" &&
            !(body instanceof FormData) &&
            !(body instanceof Blob) &&
            !(body instanceof ArrayBuffer);

        const payloadInfo =
            isJsonPayload && body && typeof body === "object"
                ? Object.keys(body as Record<string, unknown>)
                : body;

        console.info("[api] request", {
            method,
            url: requestUrl,
            bodyKeys: Array.isArray(payloadInfo) ? payloadInfo : undefined,
            hasBody: body !== undefined,
            bodyType: body === undefined ? "none" : isJsonPayload ? "json" : typeof body,
        });

        const preparedHeaders: Record<string, string> = {
            ...(isJsonPayload ? { "Content-Type": "application/json" } : {}),
            ...headers,
        };

        const preparedBody =
            body === undefined
                ? undefined
                : isJsonPayload
                ? JSON.stringify(body)
                : (body as BodyInit);

        try {
            const response = await fetch(requestUrl, {
                credentials: "include",
                headers: preparedHeaders,
                body: preparedBody,
                ...rest,
            });

            setOnlineStatus(true);

            if (response.headers.get(OFFLINE_HEADER) === "1") {
                setOnlineStatus(false);
                throw new OfflineError();
            }

            if (
                response.status === 401 &&
                !skipAuthRefresh &&
                this.shouldAttemptRefresh(url) &&
                (await this.tryRefreshTokens())
            ) {
                return this.request<T>(url, { ...options, skipAuthRefresh: true });
            }

            const finishedAt =
                typeof performance !== "undefined" && typeof performance.now === "function"
                    ? performance.now()
                    : Date.now();
            const duration = Math.round(finishedAt - startedAt);

            console.info("[api] response", { method, url: requestUrl, status: response.status, durationMs: duration });

            if (!response.ok) {
                const errorText = await response.text();
                throw new HttpError(response.status, requestUrl, errorText || undefined);
            }

            if (!parseJson || response.status === 204) {
                return undefined as T;
            }

            return (await response.json()) as T;
        } catch (error) {
            const navigatorOffline = typeof navigator !== "undefined" && !navigator.onLine;

            if (error instanceof OfflineError) {
                setOnlineStatus(false);
                throw error;
            }

            if (navigatorOffline) {
                setOnlineStatus(false);
                throw new OfflineError();
            }

            if (error instanceof TypeError) {
                setOnlineStatus(false);
            }

            const fallback = await this.tryReadFromCache<T>(requestUrl, parseJson);
            if (fallback !== undefined) {
                setOnlineStatus(false);
                return fallback;
            }

            console.error("[api] error", { method, url: requestUrl, error });
            throw error;
        }
    }

    private shouldAttemptRefresh(url: string): boolean {
        return (
            !url.startsWith("/auth/login") &&
            !url.startsWith("/auth/signup") &&
            !url.startsWith("/auth/refresh") &&
            !url.startsWith("/auth/logout")
        );
    }

    private async tryRefreshTokens(): Promise<boolean> {
        if (!this.refreshPromise) {
            this.refreshPromise = this.performRefresh()
                .catch((error) => {
                    console.error("[api] refresh error", error);
                    return false;
                })
                .finally(() => {
                    this.refreshPromise = null;
                });
        }

        return this.refreshPromise;
    }

    private async performRefresh(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: "POST",
                credentials: "include",
            });

            if (!response.ok) {
                console.warn("[api] token refresh failed", { status: response.status });
                return false;
            }

            console.info("[api] token refresh success");
            return true;
        } catch (error) {
            console.error("[api] token refresh network error", error);
            return false;
        }
    }

    private async tryReadFromCache<T>(url: string, parseJson: boolean): Promise<T | undefined> {
        if (!parseJson || typeof caches === "undefined") {
            return undefined;
        }

        try {
            const cacheKeys = await caches.keys();
            for (const key of cacheKeys) {
                if (!key.startsWith(DATA_CACHE_PREFIX)) {
                    continue;
                }

                const cache = await caches.open(key);
                const cachedResponse = await cache.match(url);
                if (!cachedResponse) {
                    continue;
                }

                const clone = cachedResponse.clone();
                const contentType = clone.headers.get("content-type") ?? "";

                if (contentType === "" || contentType.includes("application/json")) {
                    return (await clone.json()) as T;
                }
            }
        } catch (cacheError) {
            console.warn("[api] cache lookup failed", cacheError);
        }

        return undefined;
    }
}

const runtimeBaseUrl =
    (typeof window !== "undefined" && typeof window.__API_BASE_URL__ === "string"
        ? window.__API_BASE_URL__
        : undefined) ||
    "";

export const apiService = new ApiService(runtimeBaseUrl);
export type { ApiResponse } from './types';
