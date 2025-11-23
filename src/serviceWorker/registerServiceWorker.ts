export function registerServiceWorker(): void {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        return;
    }

    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/sw.js")
            .then((registration) => {
                if (registration.waiting) {
                    registration.waiting.postMessage({ type: "SKIP_WAITING" });
                }
            })
            .catch((error) => {
                console.error("[sw] registration failed", error);
            });
    });
}
