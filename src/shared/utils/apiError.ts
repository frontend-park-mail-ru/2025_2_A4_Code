export function extractApiErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof Error) {
        const raw = error.message?.trim();
        if (raw) {
            const parsedMessage = tryParseMessage(raw);
            return parsedMessage ?? raw;
        }
    }

    if (typeof error === "string" && error.trim()) {
        return error.trim();
    }

    return fallbackMessage;
}

function tryParseMessage(payload: string): string | null {
    try {
        const parsed = JSON.parse(payload);
        if (typeof parsed?.message === "string") {
            const trimmed = parsed.message.trim();
            return trimmed.length > 0 ? trimmed : null;
        }
    } catch {
        // ignore json parse errors
    }
    return null;
}
