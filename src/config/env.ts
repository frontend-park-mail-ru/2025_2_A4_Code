if (typeof window !== "undefined") {
    // Point frontend to local gateway started via docker-compose (HTTP on 5004).
    window.__API_BASE_URL__ = window.__API_BASE_URL__ ?? "http://localhost:5004";
}
