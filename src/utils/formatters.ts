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

export function formatDateTimeFromBackend(value: string): string {
    if (!value) {
        return "";
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return "";
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
        const hours = parsed.getHours().toString().padStart(2, "0");
        const minutes = parsed.getMinutes().toString().padStart(2, "0");
        const day = parsed.getDate().toString().padStart(2, "0");
        const month = (parsed.getMonth() + 1).toString().padStart(2, "0");
        const year = parsed.getFullYear().toString().padStart(4, "0");
        return `${hours}:${minutes} ${day}.${month}.${year}`;
    }

    const separators = [" ", "T"];
    for (const separator of separators) {
        const parts = trimmed.split(separator);
        if (parts.length < 2) {
            continue;
        }
        const [datePart, timePartRaw] = parts;
        const formattedDate = formatDateFromBackend(datePart);
        if (!formattedDate) {
            continue;
        }

        const [year, month = "", day = ""] = formattedDate.split("-");
        const readableDate =
            day && month && year ? `${day}.${month}.${year}` : formattedDate.replace(/-/g, ".");

        const timeSegments = timePartRaw.split(":");
        if (timeSegments.length >= 2) {
            const hours = timeSegments[0].padStart(2, "0").slice(-2);
            const minutes = timeSegments[1].padStart(2, "0").slice(-2);
            return `${hours}:${minutes} ${readableDate}`;
        }
    }

    return trimmed;
}
