import "./Toast.scss";

const CONTAINER_ID = "global-toast-container";

export type ToastVariant = "info" | "success" | "error";

export function showToast(message: string, variant: ToastVariant = "info", timeoutMs = 3000): void {
    if (typeof document === "undefined") {
        return;
    }

    let container = document.getElementById(CONTAINER_ID);
    if (!container) {
        container = document.createElement("div");
        container.id = CONTAINER_ID;
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast--${variant}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("toast--visible"));

    window.setTimeout(() => {
        toast.classList.remove("toast--visible");
        window.setTimeout(() => toast.remove(), 200);
    }, timeoutMs);
}
