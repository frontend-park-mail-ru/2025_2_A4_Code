import { Component } from "@shared/base/Component";
import template from "./CreateFolderModal.hbs";
import "./CreateFolderModal.scss";

type Props = {
    onClose?: () => void;
    onSave?: (name: string) => Promise<void> | void;
};

export class CreateFolderModal extends Component<Props> {
    private nameInput: HTMLInputElement | null = null;
    private errorEl: HTMLElement | null = null;
    private saving = false;

    constructor(props: Props = {}) {
        super(props);
    }

    protected renderTemplate(): string {
        return template({});
    }

    protected afterRender(): void {
        const root = this.element as HTMLElement;

        root.addEventListener("click", (event) => {
            if ((event.target as HTMLElement).classList.contains("create-folder-overlay")) {
                this.props.onClose?.();
            }
        });

        const closeBtn = root.querySelector('[data-action="close"]') as HTMLElement | null;
        closeBtn?.addEventListener("click", () => this.props.onClose?.());

        const saveBtn = root.querySelector('[data-action="save"]') as HTMLButtonElement | null;
        saveBtn?.addEventListener("click", () => this.handleSave());

        this.nameInput = root.querySelector('[data-field="name"]') as HTMLInputElement | null;
        this.errorEl = root.querySelector('[data-error="name"]') as HTMLElement | null;

        this.nameInput?.focus();
    }

    private async handleSave(): Promise<void> {
        if (this.saving) return;
        const name = this.nameInput?.value.trim() ?? "";
        if (!name) {
            this.setError("Введите название");
            this.nameInput?.focus();
            return;
        }

        this.setError(null);
        this.toggleSaving(true);
        try {
            await this.props.onSave?.(name);
            this.props.onClose?.();
        } catch (error) {
            console.error("Failed to create folder", error);
            this.setError(error instanceof Error ? error.message : "Не удалось создать папку");
        } finally {
            this.toggleSaving(false);
        }
    }

    private setError(message: string | null): void {
        if (!this.errorEl) return;
        this.errorEl.textContent = message ?? "";
    }

    private toggleSaving(state: boolean): void {
        this.saving = state;
        const saveBtn = this.element?.querySelector('[data-action="save"]') as HTMLButtonElement | null;
        if (saveBtn) {
            saveBtn.disabled = state;
        }
        if (this.nameInput) {
            this.nameInput.disabled = state;
        }
    }
}
