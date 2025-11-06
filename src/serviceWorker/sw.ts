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

const OFFLINE_HEADER = "X-Flintmail-Offline";
const API_PATH_PREFIXES = ["/messages", "/profile", "/auth"];
const API_HOSTS = ["217.16.16.26", "localhost", "127.0.0.1"];
class OfflineSignalError extends Error {}

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(APP_CACHE_NAME);
            await cache.addAll(PUBLIC_ASSETS);
            await precachePublicImages(cache);
            await self.skipWaiting();
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (key !== APP_CACHE_NAME && key !== DATA_CACHE_NAME) {
                        return caches.delete(key);
                    }
                    return Promise.resolve(false);
                })
            )
        )
    );

    self.clients.claim();
});

self.addEventListener("message", (event) => {
    const data = (event.data ?? {}) as Partial<ServiceWorkerMessage>;
    if (!data || typeof data.type !== "string") {
        return;
    }

    switch (data.type) {
        case SW_MESSAGES.CLEAR_DATA_CACHE:
            event.waitUntil(clearCachesByPrefix(DATA_CACHE_PREFIX));
            break;
        default:
            break;
    }
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (isDocumentRequest(request)) {
        event.respondWith(handleDocumentRequest(request));
        return;
    }

    if (isApiRequest(url)) {
        event.respondWith(staleWhileRevalidate(event, request, { cacheName: DATA_CACHE_NAME, offlineHeader: true }));
        return;
    }

    event.respondWith(cacheFirst(request, { cacheName: APP_CACHE_NAME }));
});

function isDocumentRequest(request: Request): boolean {
    return request.mode === "navigate" || request.destination === "document";
}

function isApiRequest(url: URL): boolean {
    return (
        API_HOSTS.includes(url.hostname) ||
        API_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
    );
}

async function staleWhileRevalidate(
    event: FetchEvent,
    request: Request,
    options: { cacheName: string; offlineHeader?: boolean }
): Promise<Response> {
    const cache = await caches.open(options.cacheName);
    const cached = await cache.match(request);

    const fetchAndCache = async (): Promise<Response> => {
        try {
            const networkResponse = await fetch(request);
            if (options.offlineHeader && networkResponse.headers.get(OFFLINE_HEADER) === "1") {
                throw new OfflineSignalError();
            }

            if (networkResponse && networkResponse.status === 200) {
                await cache.put(request, networkResponse.clone());
            }

            return networkResponse;
        } catch (error) {
            if (options.offlineHeader) {
                throw new OfflineSignalError();
            }
            throw error;
        }
    };

    if (cached) {
        event.waitUntil(
            fetchAndCache().catch(() => undefined)
        );
        return cached;
    }

    try {
        return await fetchAndCache();
    } catch (error) {
        if (error instanceof OfflineSignalError) {
            const fallback = await cache.match(request);
            if (fallback) {
                return fallback;
            }
            return offlineApiResponse();
        }
        throw error;
    }
}

async function cacheFirst(request: Request, options: { cacheName: string }): Promise<Response> {
    const cache = await caches.open(options.cacheName);
    const cached = await cache.match(request);
    if (cached) {
        return cached;
    }

    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
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

async function handleDocumentRequest(request: Request): Promise<Response> {
    const cache = await caches.open(APP_CACHE_NAME);
    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cached = await cache.match(request);
        if (cached) {
            return cached;
        }

        const shell = (await cache.match("/index.html")) || (await cache.match("/"));
        if (shell) {
            return shell;
        }

        return offlinePageResponse();
    }
}

function offlinePageResponse(): Response {
    const body = `
        <!doctype html>
        <html lang="ru">
            <head>
                <meta charset="utf-8" />
                <title>Flintmail - офлайн</title>
                <style>
                    body {
                        margin: 0;
                        font-family: "Inter", Arial, sans-serif;
                        background: #f5f6fb;
                        color: #1f2544;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        text-align: center;
                    }
                    .offline {
                        max-width: 320px;
                        padding: 32px;
                    }
                    .offline img {
                        width: 96px;
                        height: 96px;
                        margin-bottom: 16px;
                    }
                    .offline h1 {
                        font-size: 20px;
                        margin: 0 0 8px;
                    }
                    .offline p {
                        margin: 0;
                        color: #5d6381;
                    }
                </style>
            </head>
            <body>
                <div class="offline">
                    <img src="/img/working-offline.svg" alt="Работаем офлайн" loading="lazy" decoding="async" />
                    <h1>Нет подключения к сети</h1>
                    <p>Как только соединение восстановится, страница обновится автоматически.</p>
                </div>
            </body>
        </html>
    `;

    return new Response(body, {
        status: 200,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
        },
    });
}

async function clearCachesByPrefix(prefix: string): Promise<void> {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(prefix)).map((key) => caches.delete(key)));
}

async function precachePublicImages(cache: Cache): Promise<void> {
    try {
        const response = await fetch("/public-assets-manifest.json", { cache: "no-store" });
        if (!response || !response.ok) {
            return;
        }

        const manifest = (await response.json()) as { images?: string[] };
        if (!manifest || !Array.isArray(manifest.images)) {
            return;
        }

        const imagesToCache = manifest.images.filter((asset) => typeof asset === "string");
        if (imagesToCache.length === 0) {
            return;
        }

        await cache.addAll(imagesToCache);
    } catch (error) {
        console.warn("[sw] failed to precache public images", error);
    }
}

export {};
