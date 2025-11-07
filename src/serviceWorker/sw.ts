/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */
declare const self: ServiceWorkerGlobalScope;

import {
    APP_CACHE_NAME,
    DATA_CACHE_NAME,
    DATA_CACHE_PREFIX,
    PUBLIC_ASSETS,
} from "./cacheConfig";
import { SW_MESSAGES, type ServiceWorkerMessage } from "./messages";

const DEBUG_SW_LOGS = true;
const LOG_PREFIX = "[sw]";
const OFFLINE_HEADER = "X-Flintmail-Offline";
const API_PATH_PREFIXES = ["/messages", "/profile", "/auth"];
const API_HOSTS = ["217.16.16.26", "localhost", "127.0.0.1"];
const MESSAGE_FEED_PATHS = ["/messages/inbox"];
const DOCUMENT_FALLBACKS = ["/index.html", "/"] as const;
const STATIC_DESTINATIONS = new Set<RequestDestination>([
    "style",
    "script",
    "image",
    "font",
    "worker",
    "manifest",
]);
const CACHEABLE_PROTOCOLS = new Set(["http:", "https:"]);

const OFFLINE_PAGE_HTML = `
<!doctype html>
<html lang="ru">
    <head>
        <meta charset="utf-8" />
        <title>Flintmail офлайн</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
            * {
                box-sizing: border-box;
            }
            body {
                margin: 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Arial, sans-serif;
                background: #f5f6fb;
                color: #1f2544;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 32px;
            }
            .offline-card {
                max-width: 360px;
                text-align: center;
            }
            .offline-card img {
                width: 104px;
                height: 104px;
                margin-bottom: 20px;
            }
            h1 {
                font-size: 22px;
                margin: 0 0 12px;
            }
            p {
                margin: 0;
                color: #5d6381;
                line-height: 1.4;
            }
        </style>
    </head>
    <body>
        <div class="offline-card">
            Нет доступа к сети.
        </div>
    </body>
</html>
`;

class OfflineSignalError extends Error {
    constructor() {
        super("Server requested offline mode");
    }
}

self.addEventListener("install", (event) => {
    debugLog("install:start");
    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(APP_CACHE_NAME);
                await cache.addAll(PUBLIC_ASSETS);
                debugLog("install:app-shell cached", PUBLIC_ASSETS.length, "assets");
                await precachePublicImages(cache);
                await self.skipWaiting();
                debugLog("install:completed");
            } catch (error) {
                warnLog("install:failed", error);
                throw error;
            }
        })()
    );
});

self.addEventListener("activate", (event) => {
    debugLog("activate:start");
    event.waitUntil(
        (async () => {
            try {
                await removeStaleCaches();
                await self.clients.claim();
                debugLog("activate:completed");
            } catch (error) {
                warnLog("activate:failed", error);
                throw error;
            }
        })()
    );
});

self.addEventListener("message", (event) => {
    const data = (event.data ?? {}) as Partial<ServiceWorkerMessage>;
    if (!data || typeof data.type !== "string") {
        return;
    }

    debugLog("message:received", data.type);

    if (data.type === SW_MESSAGES.CLEAR_DATA_CACHE) {
        debugLog("message:clear-data-cache");
        event.waitUntil(clearCachesByPrefix(DATA_CACHE_PREFIX));
    }
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);
    if (!CACHEABLE_PROTOCOLS.has(url.protocol)) {
        return;
    }

    if (isDocumentRequest(request)) {
        event.respondWith(cacheFirstDocument(event, request));
        return;
    }

    if (STATIC_DESTINATIONS.has(request.destination)) {
        event.respondWith(cacheFirstAsset(event, request));
        return;
    }

    if (isMessagesFeedRequest(url)) {
        event.respondWith(networkFirstMessages(request));
        return;
    }

    if (isApiRequest(url)) {
        event.respondWith(cacheFirstData(event, request));
        return;
    }

    event.respondWith(cacheFirstAsset(event, request));
});

function isDocumentRequest(request: Request): boolean {
    return request.mode === "navigate" || request.destination === "document";
}

function isApiRequest(url: URL): boolean {
    const matchesHost = API_HOSTS.includes(url.hostname);
    const matchesPrefix = API_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
    return matchesHost && matchesPrefix;
}

function isMessagesFeedRequest(url: URL): boolean {
    return isApiRequest(url) && MESSAGE_FEED_PATHS.some((path) => url.pathname.startsWith(path));
}

function shouldIgnoreSearch(request: Request): boolean {
    return request.destination === "document" || STATIC_DESTINATIONS.has(request.destination);
}

async function cacheFirstDocument(event: FetchEvent, request: Request): Promise<Response> {
    const cache = await caches.open(APP_CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });

    if (cached) {
        debugLog("document:cache-hit", request.url);
        event.waitUntil(refreshDocument(cache, request));
        return cached;
    }

    debugLog("document:cache-miss", request.url);
    return fetchDocumentWithFallback(cache, request);
}

async function refreshDocument(cache: Cache, request: Request): Promise<void> {
    try {
        const response = await fetch(request);
        if (response?.ok) {
            await cache.put(normalizeRequestForCache(request, true), response.clone());
            debugLog("document:refreshed", request.url);
        } else {
            warnLog("document:refresh-status", request.url, response?.status);
        }
    } catch (error) {
        warnLog("document:refresh-error", request.url, error);
    }
}

async function fetchDocumentWithFallback(cache: Cache, request: Request): Promise<Response> {
    try {
        const response = await fetch(request);
        if (response?.ok) {
            await cache.put(normalizeRequestForCache(request, true), response.clone());
        } else {
            warnLog("document:network-status", request.url, response?.status);
        }
        return response;
    } catch (error) {
        warnLog("document:network-failed", request.url, error);
        if (shouldServeOfflinePage(error)) {
            debugLog("document:offline-page", request.url);
            return offlinePageResponse();
        }
        const shell = await matchAppShell(cache);
        if (shell) {
            debugLog("document:shell-fallback", request.url);
            return shell;
        }
        return offlinePageResponse();
    }
}

async function cacheFirstData(event: FetchEvent, request: Request): Promise<Response> {
    const cache = await caches.open(DATA_CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
        debugLog("api:cache-hit", request.url);
        event.waitUntil(
            fetchAndCacheApi(request, cache).catch((error) => {
                warnLog("api:refresh-failed", request.url, error);
            })
        );
        return cached;
    }

    debugLog("api:cache-miss", request.url);

    try {
        return await fetchAndCacheApi(request, cache);
    } catch (error) {
        if (error instanceof OfflineSignalError) {
            const fallback = await cache.match(request);
            if (fallback) {
                debugLog("api:offline-cache", request.url);
                return fallback;
            }
            return offlineApiResponse();
        }
        throw error;
    }
}

async function networkFirstMessages(request: Request): Promise<Response> {
    const cache = await caches.open(DATA_CACHE_NAME);
    try {
        const response = await fetchAndCacheApi(request, cache);
        debugLog("messages:network", request.url);
        return response;
    } catch (error) {
        const cached = await cache.match(request);
        if (cached) {
            warnLog("messages:fallback-cache", request.url, error);
            return cached;
        }

        if (error instanceof OfflineSignalError) {
            return offlineApiResponse();
        }
        throw error;
    }
}

async function cacheFirstAsset(event: FetchEvent, request: Request): Promise<Response> {
    const cache = await caches.open(APP_CACHE_NAME);
    const ignoreSearch = shouldIgnoreSearch(request);
    const cached = await cache.match(request, { ignoreSearch });

    if (cached) {
        debugLog("asset:cache-hit", request.url);
        event.waitUntil(
            refreshAsset(cache, request, ignoreSearch).catch((error) => {
                warnLog("asset:refresh-error", request.url, error);
            })
        );
        return cached;
    }

    debugLog("asset:cache-miss", request.url);

    try {
        const response = await fetch(request);
        if (response?.ok) {
            await cache.put(normalizeRequestForCache(request, ignoreSearch), response.clone());
            debugLog("asset:cached", request.url);
        } else {
            warnLog("asset:network-status", request.url, response?.status);
        }
        return response;
    } catch (error) {
        warnLog("asset:network-error", request.url, error);
        throw error;
    }
}

async function refreshAsset(cache: Cache, request: Request, ignoreSearch: boolean): Promise<void> {
    const response = await fetch(request);
    if (response?.ok) {
        await cache.put(normalizeRequestForCache(request, ignoreSearch), response.clone());
        debugLog("asset:refreshed", request.url);
    } else {
        warnLog("asset:refresh-status", request.url, response?.status);
    }
}

async function fetchAndCacheApi(request: Request, cache: Cache): Promise<Response> {
    try {
        const response = await fetch(request);
        if (response.headers.get(OFFLINE_HEADER) === "1") {
            debugLog("api:offline-header", request.url);
            throw new OfflineSignalError();
        }

        if (response.ok) {
            await cache.put(request, response.clone());
            debugLog("api:cached", request.url);
        } else {
            warnLog("api:network-status", request.url, response.status);
        }

        return response;
    } catch (error) {
        if (error instanceof OfflineSignalError) {
            throw error;
        }
        warnLog("api:network-error", request.url, error);
        throw new OfflineSignalError();
    }
}

async function matchAppShell(cache: Cache): Promise<Response | undefined> {
    for (const path of DOCUMENT_FALLBACKS) {
        const cached = await cache.match(path);
        if (cached) {
            debugLog("document:shell-hit", path);
            return cached;
        }
    }

    debugLog("document:no-shell");
    return undefined;
}

function offlineApiResponse(): Response {
    return new Response(
        JSON.stringify({
            message: "offline",
            offline: true,
        }),
        {
            status: 503,
            statusText: "Offline",
            headers: {
                "Content-Type": "application/json",
                [OFFLINE_HEADER]: "1",
            },
        }
    );
}

function offlinePageResponse(): Response {
    return new Response(OFFLINE_PAGE_HTML, {
        status: 200,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
        },
    });
}

async function removeStaleCaches(): Promise<void> {
    const validCaches = new Set([APP_CACHE_NAME, DATA_CACHE_NAME]);
    const keys = await caches.keys();
    const staleKeys = keys.filter((key) => !validCaches.has(key));

    if (staleKeys.length === 0) {
        debugLog("activate:no-stale-caches");
        return;
    }

    await Promise.all(staleKeys.map((key) => caches.delete(key)));
    debugLog("activate:removed-caches", staleKeys);
}

async function clearCachesByPrefix(prefix: string): Promise<void> {
    const keys = await caches.keys();
    const targets = keys.filter((key) => key.startsWith(prefix));

    if (targets.length === 0) {
        debugLog("cache:clear-prefix-skip", prefix);
        return;
    }

    await Promise.all(targets.map((key) => caches.delete(key)));
    debugLog("cache:cleared-prefix", prefix, targets);
}

async function precachePublicImages(cache: Cache): Promise<void> {
    try {
        const response = await fetch("/public-assets-manifest.json", { cache: "no-store" });
        if (!response?.ok) {
            debugLog("precache:manifest-miss", response?.status);
            return;
        }

        const manifest = (await response.json()) as { images?: string[] };
        if (!Array.isArray(manifest.images)) {
            debugLog("precache:manifest-empty");
            return;
        }

        const imagesToCache = manifest.images.filter((asset) => typeof asset === "string");
        if (imagesToCache.length === 0) {
            debugLog("precache:manifest-no-images");
            return;
        }

        await cache.addAll(imagesToCache);
        debugLog("precache:images cached", imagesToCache.length);
    } catch (error) {
        warnLog("precache:failed", error);
    }
}

function normalizeRequestForCache(request: Request, ignoreSearch: boolean): Request {
    if (!ignoreSearch) {
        return request;
    }

    const url = new URL(request.url);
    url.search = "";
    return new Request(url.toString(), {
        method: request.method,
        credentials: request.credentials,
    });
}

function shouldServeOfflinePage(error: unknown): boolean {
    if (!hasNetworkConnection()) {
        return true;
    }
    return error instanceof TypeError;
}

function hasNetworkConnection(): boolean {
    if (typeof self === "undefined" || !self.navigator) {
        return true;
    }
    return self.navigator.onLine;
}

function debugLog(...values: unknown[]): void {
    if (!DEBUG_SW_LOGS) {
        return;
    }
    console.log(LOG_PREFIX, ...values);
}

function warnLog(...values: unknown[]): void {
    console.warn(LOG_PREFIX, ...values);
}

export {};
