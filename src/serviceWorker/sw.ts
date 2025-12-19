/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */
declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", (event) => {
    // сразу активируем новую версию
    event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            // удаляем все кеши, чтобы сбросить артефакты старых версий
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
            await self.clients.claim();
        })()
    );
});
