import { Component } from "@shared/base/Component";
import template from "./MoveToFolderModal.hbs";
import "./MoveToFolderModal.scss";
import type { FolderSummary } from "@entities/mail";

type Props = {
    folders: FolderSummary[];
    currentFolderId?: string;
    onSelect?: (folderId: string) => void;
    onClose?: () => void;
};

export class MoveToFolderModal extends Component<Props> {
    protected renderTemplate(): string {
        return template({});
    }

    protected afterRender(): void {
        const root = this.element as HTMLElement;
        root.addEventListener("click", (event) => {
            if ((event.target as HTMLElement).classList.contains("move-folder-overlay")) {
                this.props.onClose?.();
            }
        });

        const closeBtn = root.querySelector('[data-action="close"]') as HTMLElement | null;
        closeBtn?.addEventListener("click", () => this.props.onClose?.());

        this.renderList();
    }

    private renderList(): void {
        const listRoot = this.element?.querySelector('[data-slot="list"]') as HTMLElement | null;
        if (!listRoot) return;
        listRoot.innerHTML = "";

        const folders = this.props.folders ?? [];
        const current = (this.props.currentFolderId || "").toLowerCase();

        folders.forEach((folder) => {
            const btn = document.createElement("button");
            btn.type = "button";
            const isCurrent =
                (folder.backendId || folder.id || "").toLowerCase() === current || folder.id.toLowerCase() === current;
            btn.className = "move-folder-modal__item" + (isCurrent ? " move-folder-modal__item--current" : "");
            const icon = document.createElement("span");
            icon.className = "move-folder-modal__icon";
            icon.style.backgroundImage = `url(${folder.icon ?? "/img/folder-default.svg"})`;
            btn.appendChild(icon);

            const label = document.createElement("span");
            label.textContent = folder.name;
            label.className = "move-folder-modal__label";
            label.title = folder.name;
            btn.appendChild(label);

            if (!isCurrent) {
                btn.addEventListener("click", () => this.props.onSelect?.(folder.backendId ?? folder.id));
            } else {
                btn.disabled = true;
            }
            listRoot.appendChild(btn);
        });
    }
}
