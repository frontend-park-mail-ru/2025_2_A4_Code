const INSECURE_AVATAR_HOST = "217.16.16.26";
const INSECURE_AVATAR_PORT = "8060";
const SECURE_AVATAR_ORIGIN = "https://217.16.16.26";

function getApiBaseUrl(): string {
    if (typeof window !== "undefined" && typeof window.__API_BASE_URL__ === "string") {
        return window.__API_BASE_URL__;
    }
    return "";
}

export function ensureHttpsAssetUrl(url: string | null | undefined): string | null {
    if (!url) {
        return null;
    }

    const lowered = url.toLowerCase();
    if (
        url.startsWith("/user/avatar") ||
        lowered.includes("x-amz-signature") ||
        lowered.includes("127.0.0.1") ||
        lowered.includes("localhost") ||
        lowered.includes("minio")
    ) {
        const base = getApiBaseUrl();
        return `${base}/user/avatar?url=${encodeURIComponent(url)}`;
    }

    if (!url.startsWith("http://")) {
        return url;
    }

    try {
        const parsed = new URL(url);
        if (parsed.hostname === INSECURE_AVATAR_HOST && parsed.port === INSECURE_AVATAR_PORT) {
            parsed.protocol = "https:";
            parsed.port = "";
            return parsed.toString();
        }
        return url;
    } catch {
        const insecurePrefix = `http://${INSECURE_AVATAR_HOST}:${INSECURE_AVATAR_PORT}`;
        if (url.startsWith(insecurePrefix)) {
            return `${SECURE_AVATAR_ORIGIN}${url.slice(insecurePrefix.length)}`;
        }
        return url;
    }
}
