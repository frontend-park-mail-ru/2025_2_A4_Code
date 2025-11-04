export function getInitials(source: string, fallback: string = "--"): string {
    if (!source) {
        return fallback;
    }

    const initials = source
        .split(" ")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return initials || fallback;
}

