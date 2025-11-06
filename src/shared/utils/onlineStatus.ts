type Listener = (isOnline: boolean) => void;

let currentStatus =
    typeof navigator === "undefined" ? true : navigator.onLine;

const listeners = new Set<Listener>();

function notify(status: boolean): void {
    if (currentStatus === status) {
        return;
    }

    currentStatus = status;
    listeners.forEach((listener) => listener(status));
}

if (typeof window !== "undefined") {
    window.addEventListener("online", () => notify(true));
    window.addEventListener("offline", () => notify(false));
}

export function getOnlineStatus(): boolean {
    return currentStatus;
}

export function subscribeToOnlineStatus(listener: Listener): () => void {
    listeners.add(listener);
    listener(currentStatus);
    return () => {
        listeners.delete(listener);
    };
}

export function setOnlineStatus(status: boolean): void {
    notify(status);
}
