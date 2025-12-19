import { Component } from "@shared/base/Component";
import { ButtonComponent } from "@shared/components/Button/Button";
import template from "./ComposeModal.hbs";
import "./ComposeModal.scss";
import { validateRecipientAddress } from "@utils";
import { COMPOSE_MODAL_TEXTS } from "@shared/constants/texts";
import type { MailAttachment } from "@app-types/mail";
import { uploadAttachment } from "@entities/mail";
import { showToast } from "@shared";

const ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png", "application/pdf", "text/plain"]);
const MAX_FILE_SIZE = 40 * 1024 * 1024;
const MAX_ATTACHMENTS = 20;
const MAX_TOTAL_SIZE = 40 * 1024 * 1024;

type Props = {
    onClose?: () => void;
    onSend?: (data: { to: string; subject: string; body: string; attachments?: MailAttachment[] }) => void;
    onAttachFile?: () => void;
    onSaveDraft?: (data: { to: string; subject: string; body: string; attachments?: MailAttachment[] }) => void;
    onDeleteDraft?: () => void;
    initialTo?: string;
    initialSubject?: string;
    initialBody?: string;
    focusField?: "to" | "subject" | "body";
    draftId?: string;
    initialAttachments?: MailAttachment[];
};

type AttachmentItem = MailAttachment & { id: string; status: "ready" | "uploading" | "error"; error?: string };

export class ComposeModal extends Component<Props> {
    private readonly attachButton: ButtonComponent;
    private readonly draftButton: ButtonComponent;
    private readonly sendButton: ButtonComponent;
    private readonly deleteDraftButton: ButtonComponent | null;

    private toInput: HTMLInputElement | null = null;
    private toErrorEl: HTMLElement | null = null;
    private subjectInput: HTMLInputElement | null = null;
    private bodyTextarea: HTMLTextAreaElement | null = null;
    private fileInput: HTMLInputElement | null = null;
    private attachmentsContainer: HTMLElement | null = null;
    private attachErrorEl: HTMLElement | null = null;
    private attachments: AttachmentItem[] = [];

    constructor(props: Props = {}) {
        super(props);

        this.attachButton = new ButtonComponent({
            label: COMPOSE_MODAL_TEXTS.attachFile,
            variant: "link",
            icon: '<img src="/img/modal-attach-file.svg" alt="" aria-hidden="true" />',
            onClick: () => this.handleAttach(),
        });

        this.draftButton = new ButtonComponent({
            label: COMPOSE_MODAL_TEXTS.saveDraft,
            variant: "link",
            icon: '<img src="/img/modal-to-draft.svg" alt="" aria-hidden="true" />',
            onClick: () => this.handleSaveDraft(),
        });

        this.sendButton = new ButtonComponent({
            label: COMPOSE_MODAL_TEXTS.send,
            variant: "primary",
            onClick: () => this.handleSend(),
            disabled: false,
        });

        this.deleteDraftButton = this.props.onDeleteDraft
            ? new ButtonComponent({
                  label: "Удалить",
                  variant: "secondary",
                  onClick: () => this.props.onDeleteDraft?.(),
              })
            : null;

        this.attachments = (props.initialAttachments ?? []).map((attachment) => ({
            ...attachment,
            id: this.generateAttachmentId(),
            status: "ready",
        }));
    }
    
    protected renderTemplate(): string {
        return template({});
    }

    protected afterRender(): void {
        const root = this.element as HTMLElement;

        root.addEventListener("click", (event) => {
            if ((event.target as HTMLElement).classList.contains("compose-overlay")) {
                this.props.onClose?.();
            }
        });

        const closeBtn = root.querySelector('[data-action="close"]') as HTMLElement | null;
        closeBtn?.addEventListener("click", () => this.props.onClose?.());

        this.mountButton(root, "attach", this.attachButton);
        this.mountButton(root, "draft", this.draftButton);
        this.mountButton(root, "send", this.sendButton);
        if (this.deleteDraftButton) {
            this.mountButton(root, "delete", this.deleteDraftButton);
        }

        this.toInput = root.querySelector('[data-field="to"]') as HTMLInputElement | null;
        this.toErrorEl = root.querySelector('[data-error="to"]') as HTMLElement | null;
        this.subjectInput = root.querySelector('[data-field="subject"]') as HTMLInputElement | null;
        this.bodyTextarea = root.querySelector('[data-field="body"]') as HTMLTextAreaElement | null;
        this.attachmentsContainer = root.querySelector('[data-slot="attachments"]') as HTMLElement | null;
        this.attachErrorEl = root.querySelector("[data-attach-error]") as HTMLElement | null;
        this.fileInput = root.querySelector('[data-attach-input]') as HTMLInputElement | null;

        if (this.toInput) {
            this.toInput.addEventListener("input", () => this.setRecipientError(null));
        }
        if (this.toErrorEl) {
            this.toErrorEl.classList.remove("compose-modal__error--visible");
            this.toErrorEl.textContent = "";
        }

        if (this.fileInput) {
            this.fileInput.accept = "*/*";
            this.fileInput.addEventListener("change", this.handleFileInputChange);
        }

        this.renderAttachments();
        this.setAttachError(null);

        this.applyInitialValues();
        this.focusInitialField();
        this.updateSendButtonState();
    }

    private mountButton(root: HTMLElement, slotName: string, button: ButtonComponent): void {
        const slot = root.querySelector(`[data-slot="${slotName}"]`) as HTMLElement | null;
        if (!slot) {
            return;
        }
        button.render();
        button.mount(slot).then();
    }

    private handleSend(): void {
        const to = this.toInput?.value ?? "";
        const subject = this.subjectInput?.value ?? "";
        const body = this.bodyTextarea?.value ?? "";
        const attachments = this.getAttachmentPayload();

        const recipientError = validateRecipientAddress(to);
        this.setRecipientError(recipientError);
        if (recipientError) {
            this.toInput?.focus();
            return;
        }

        this.props.onSend?.({ to, subject, body, attachments });
    }

    private applyInitialValues(): void {
        if (this.toInput) {
            this.toInput.value = this.props.initialTo ?? "";
        }
        this.setRecipientError(null);

        if (this.subjectInput) {
            this.subjectInput.value = this.props.initialSubject ?? "";
        }

        if (this.bodyTextarea) {
            this.bodyTextarea.value = this.props.initialBody ?? "";
        }
    }

    private focusInitialField(): void {
        const focus = this.props.focusField ?? "to";
        let target: HTMLInputElement | HTMLTextAreaElement | null;

        if (focus === "subject") {
            target = this.subjectInput;
        } else if (focus === "body") {
            target = this.bodyTextarea;
        } else {
            target = this.toInput;
        }

        target?.focus();
        if (focus === "body" && this.bodyTextarea) {
            const length = this.bodyTextarea.value.length;
            this.bodyTextarea.setSelectionRange(length, length);
        }
    }

    private handleAttach(): void {
        if (this.fileInput) {
            this.fileInput.click();
        }
        this.props.onAttachFile?.();
    }

    private handleSaveDraft(): void {
        const to = this.toInput?.value ?? "";
        const subject = this.subjectInput?.value ?? "";
        const body = this.bodyTextarea?.value ?? "";
        const attachments = this.getAttachmentPayload();
        this.props.onSaveDraft?.({ to, subject, body, attachments });
    }

    private handleFileInputChange = (event: Event): void => {
        const input = event.target as HTMLInputElement | null;
        const files = input?.files;
        if (!files) {
            return;
        }
        this.appendFiles(files);
        if (input) {
            input.value = "";
        }
    };

    private appendFiles(files: FileList): void {
        if (this.attachments.length >= MAX_ATTACHMENTS) {
            this.setAttachError(`Можно прикрепить не более ${MAX_ATTACHMENTS} файлов`);
            return;
        }

        let added = 0;
        const availableSlots = MAX_ATTACHMENTS - this.attachments.length;
        Array.from(files)
            .slice(0, availableSlots)
            .forEach((file) => {
                const error = this.validateFile(file);
                if (error) {
                    this.setAttachError(error);
                    return;
                }
                const nextTotal = this.getCurrentTotalSize() + file.size;
                if (nextTotal > MAX_TOTAL_SIZE) {
                    this.setAttachError("Суммарный размер вложений превышает 40 МБ");
                    return;
                }
                this.uploadAndAddAttachment(file);
                added += 1;
            });

        if (added > 0) {
            this.setAttachError(null);
            this.renderAttachments();
        }
    }

    private uploadAndAddAttachment(file: File): void {
        const fileType = this.resolveFileType(file);
        const item: AttachmentItem = {
            id: this.generateAttachmentId(),
            name: file.name,
            size: file.size,
            fileType: fileType || file.type || "",
            storagePath: this.buildStoragePath(file.name),
            status: "uploading",
        };
        this.attachments.push(item);
        this.renderAttachments();
        this.updateSendButtonState();

        uploadAttachment(file, item.storagePath)
            .then((uploaded) => {
                const target = this.attachments.find((att) => att.id === item.id);
                if (!target) return;
                target.storagePath = uploaded.storagePath;
                target.size = uploaded.size;
                target.fileType = uploaded.fileType || target.fileType;
                target.name = uploaded.name || target.name;
                target.status = "ready";
                this.renderAttachments();
                this.updateSendButtonState();
            })
            .catch((err) => {
                console.error("Failed to upload attachment", err);
                this.attachments = this.attachments.filter((att) => att.id !== item.id);
                this.renderAttachments();
                this.setAttachError("Не удалось загрузить файл");
                showToast("Не удалось загрузить файл", "error");
                this.updateSendButtonState();
            });
    }

    private removeAttachment(id: string): void {
        this.attachments = this.attachments.filter((item) => item.id !== id);
        this.renderAttachments();
        if (this.attachments.length === 0) {
            this.setAttachError(null);
        }
        this.updateSendButtonState();
    }

    private renderAttachments(): void {
        if (!this.attachmentsContainer) {
            return;
        }
        this.attachmentsContainer.innerHTML = "";
        this.attachments.forEach((attachment) => {
            const card = document.createElement("div");
            card.className = "compose-modal__attachment";
            if (attachment.status === "uploading") {
                card.classList.add("compose-modal__attachment--uploading");
            }

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "compose-modal__attachment-remove";
            removeButton.setAttribute("aria-label", "Удалить вложение");
            removeButton.innerHTML = "&times;";
            removeButton.onclick = () => this.removeAttachment(attachment.id);

            const name = document.createElement("div");
            name.className = "compose-modal__attachment-name";
            name.title = attachment.name;
            name.textContent = attachment.name;

            const meta = document.createElement("div");
            meta.className = "compose-modal__attachment-meta";
            meta.textContent = this.formatSize(attachment.size);

            card.appendChild(removeButton);
            card.appendChild(name);
            card.appendChild(meta);

            if (attachment.status === "uploading") {
                const loader = document.createElement("div");
                loader.className = "compose-modal__attachment-loader";
                const dots = document.createElement("div");
                dots.style.display = "flex";
                dots.style.gap = "6px";
                dots.style.alignItems = "center";
                for (let i = 0; i < 3; i += 1) {
                    const dot = document.createElement("span");
                    dot.className = "compose-modal__attachment-loader-dot";
                    dots.appendChild(dot);
                }
                loader.appendChild(dots);
                card.appendChild(loader);
            }

            this.attachmentsContainer?.appendChild(card);
        });
    }

    private setAttachError(message: string | null): void {
        if (!this.attachErrorEl) {
            return;
        }
        this.attachErrorEl.textContent = message ?? "";
        this.attachErrorEl.classList.toggle("compose-modal__attach-error--visible", Boolean(message));
    }

    private validateFile(file: File): string | null {
        const fileType = this.resolveFileType(file);
        if (!fileType || !ALLOWED_FILE_TYPES.has(fileType)) {
            return "Этот тип файла не поддерживается";
        }
        if (file.size > MAX_FILE_SIZE) {
            return "Размер файла превышает 40 МБ";
        }
        return null;
    }

    private resolveFileType(file: File): string {
        const type = (file.type || "").toLowerCase();
        if (type && ALLOWED_FILE_TYPES.has(type)) {
            return type;
        }
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        const map: Record<string, string> = {
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            pdf: "application/pdf",
            txt: "text/plain",
        };
        return map[ext] ?? type;
    }

    private buildStoragePath(name: string): string {
        const safeName = this.sanitizeFileName(name);
        const path = `attachments/${Date.now()}/${safeName}`;
        return path.slice(0, 180);
    }

    private sanitizeFileName(name: string): string {
        const trimmed = name.trim() || "file";
        const parts = trimmed.split(".");
        const extRaw = parts.length > 1 ? parts.pop() || "bin" : "bin";
        const baseRaw = parts.join(".") || "file";
        const ext = extRaw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || "bin";
        const base = baseRaw.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "") || "file";
        const limitedBase = base.slice(0, 80);
        return `${limitedBase}.${ext}`;
    }

    private formatSize(size: number): string {
        if (size >= 1024 * 1024) {
            return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
        }
        if (size >= 1024) {
            return `${(size / 1024).toFixed(0)} КБ`;
        }
        return `${size} Б`;
    }

    private getCurrentTotalSize(): number {
        return this.attachments.reduce((acc, item) => acc + item.size, 0);
    }

    private getAttachmentPayload(): MailAttachment[] {
        return this.attachments
            .filter((item) => item.status === "ready")
            .map((item) => ({
                name: item.name,
                fileType: item.fileType,
                size: item.size,
                storagePath: item.storagePath,
            }));
    }

    private generateAttachmentId(): string {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        return `att-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    private setRecipientError(message: string | null): void {
        if (!this.toErrorEl) {
            return;
        }
        if (message) {
            this.toErrorEl.textContent = message;
            this.toErrorEl.classList.add("compose-modal__error--visible");
        } else {
            this.toErrorEl.textContent = "";
            this.toErrorEl.classList.remove("compose-modal__error--visible");
        }
    }

    private hasPendingUploads(): boolean {
        return this.attachments.some((item) => item.status === "uploading");
    }

    private updateSendButtonState(): void {
        const disable = this.hasPendingUploads();
        this.sendButton.setProps({ disabled: disable });
    }

    public async unmount(): Promise<void> {
        await this.attachButton.unmount();
        await this.draftButton.unmount();
        await this.sendButton.unmount();
        if (this.deleteDraftButton) {
            await this.deleteDraftButton.unmount();
        }
        if (this.fileInput) {
            this.fileInput.removeEventListener("change", this.handleFileInputChange);
        }
        this.fileInput = null;
        this.attachmentsContainer = null;
        this.attachErrorEl = null;
        this.attachments = [];
        this.toInput = null;
        this.toErrorEl = null;
        this.subjectInput = null;
        this.bodyTextarea = null;
        await super.unmount();
    }
}
