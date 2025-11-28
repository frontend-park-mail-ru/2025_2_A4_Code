import "./FolderToast.scss";

const CONTAINER_ID = "folder-toast-container";
const ICON_URL = "/img/notification-add-to-folder.svg";
const HIDE_DELAY = 3000;

function ensureContainer(): HTMLElement {
    let container = document.getElementById(CONTAINER_ID) as HTMLElement | null;
    if (!container) {
        container = document.createElement("div");
        container.id = CONTAINER_ID;
        container.className = "folder-toast-container";
        document.body.appendChild(container);
    }
    return container;
}

export function showFolderNotification(folderName: string): void {
    if (typeof document === "undefined") {
        return;
    }

    const container = ensureContainer();
    const toast = document.createElement("div");
    toast.className = "folder-toast";

    const icon = document.createElement("img");
    icon.src = ICON_URL;
    icon.alt = "";
    icon.className = "folder-toast__icon";

    const label = document.createElement("span");
    label.className = "folder-toast__text";
    label.textContent = `Добавлено в папку ${folderName}`;

    toast.appendChild(icon);
    toast.appendChild(label);
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("folder-toast--visible"));

    window.setTimeout(() => {
        toast.classList.remove("folder-toast--visible");
        window.setTimeout(() => toast.remove(), 200);
    }, HIDE_DELAY);
}
