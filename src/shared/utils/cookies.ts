const EPOCH = "Thu, 01 Jan 1970 00:00:00 GMT";

export function clearAllCookies(): void {
    if (typeof document === "undefined") {
        return;
    }

    const cookies = document.cookie ? document.cookie.split(";") : [];
    if (cookies.length === 0) {
        return;
    }

    const domainVariants = getDomainVariants();

    for (const cookie of cookies) {
        const [rawName] = cookie.split("=");
        const name = rawName?.trim();
        if (!name) {
            continue;
        }

        deleteCookie(name);
        domainVariants.forEach((domain) => deleteCookie(name, domain));
    }
}

function deleteCookie(name: string, domain?: string): void {
    const attributes = [`${name}=`, `expires=${EPOCH}`, "path=/"];
    if (domain) {
        attributes.push(`domain=${domain}`);
    }
    document.cookie = attributes.join("; ");
}

function getDomainVariants(): string[] {
    if (typeof location === "undefined") {
        return [];
    }

    const hostname = location.hostname;
    if (!hostname || hostname === "localhost") {
        return [];
    }

    const parts = hostname.split(".");
    if (parts.length < 2) {
        return [];
    }

    const variants: string[] = [];
    for (let i = 0; i <= parts.length - 2; i++) {
        const segment = parts.slice(i).join(".");
        variants.push(segment);
        variants.push(`.${segment}`);
    }

    return Array.from(new Set(variants));
}
