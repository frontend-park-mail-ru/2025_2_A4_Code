export function formatDateToBackend(value: string): string {
    if (!value) {
        return "";
    }

    const [year, month, day] = value.split("-");
    if (!year || !month || !day) {
        return value.trim();
    }

    return `${day}.${month}.${year}`;
}

export function normalizeUsername(rawLogin: string): string {
    const trimmed = rawLogin.trim();
    const atIndex = trimmed.indexOf("@");
    if (atIndex === -1) {
        return trimmed;
    }

    return trimmed.slice(0, atIndex).trim();
}

export function formatDateFromBackend(value: string): string {
    if (!value) {
        return "";
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return "";
    }

    if (trimmed.includes("T")) {
        return trimmed.slice(0, 10);
    }

    const dotParts = trimmed.split(".");
    if (dotParts.length === 3) {
        const [day, month, year] = dotParts;
        const dayPart = day.padStart(2, "0");
        const monthPart = month.padStart(2, "0");
        return `${year.padStart(4, "0")}-${monthPart}-${dayPart}`;
    }

    const dashParts = trimmed.split("-");
    if (dashParts.length === 3 && dashParts[0].length === 4) {
        return trimmed.slice(0, 10);
    }

    return trimmed;
}
