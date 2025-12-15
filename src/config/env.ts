if (typeof window !== "undefined") {
    const isLocalhost =
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const defaultBase = isLocalhost ? "http://localhost:8000" : `${window.location.origin}/api`;
    window.__API_BASE_URL__ = window.__API_BASE_URL__ ?? defaultBase;
}
