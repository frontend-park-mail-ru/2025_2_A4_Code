import { Component } from "../../../../shared/base/Component";
import { ButtonComponent } from "../../../../shared/components/Button/Button";
import template from "./ComposeModal.hbs";
import "./ComposeModal.scss";
import { validateRecipientAddress } from "../../../../utils";

type Props = {
    onClose?: () => void;
    onSend?: (data: { to: string; subject: string; body: string }) => void;
    onAttachFile?: () => void;
    onSaveDraft?: () => void;
    initialTo?: string;
    initialSubject?: string;
    initialBody?: string;
    focusField?: "to" | "subject" | "body";
};

export class ComposeModal extends Component<Props> {
    private readonly attachButton: ButtonComponent;
    private readonly draftButton: ButtonComponent;
    private readonly sendButton: ButtonComponent;

    private toInput: HTMLInputElement | null = null;
    private toErrorEl: HTMLElement | null = null;
    private subjectInput: HTMLInputElement | null = null;
    private bodyTextarea: HTMLTextAreaElement | null = null;

    constructor(props: Props = {}) {
        super(props);

        this.attachButton = new ButtonComponent({
            label: "Прикрепить файл",
            variant: "link",
            icon: '<img src="/img/modal-attach-file.svg" alt="" aria-hidden="true" />',
            onClick: () => this.handleAttach(),
        });

        this.draftButton = new ButtonComponent({
            label: "Сохранить черновик",
            variant: "link",
            icon: '<img src="/img/modal-to-draft.svg" alt="" aria-hidden="true" />',
            onClick: () => this.handleSaveDraft(),
        });

        this.sendButton = new ButtonComponent({
            label: "Отправить",
            variant: "primary",
            onClick: () => this.handleSend(),
        });
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

        this.toInput = root.querySelector('[data-field="to"]') as HTMLInputElement | null;
        this.toErrorEl = root.querySelector('[data-error="to"]') as HTMLElement | null;
        this.subjectInput = root.querySelector('[data-field="subject"]') as HTMLInputElement | null;
        this.bodyTextarea = root.querySelector('[data-field="body"]') as HTMLTextAreaElement | null;

        if (this.toInput) {
            this.toInput.addEventListener("input", () => this.setRecipientError(null));
        }
        if (this.toErrorEl) {
            this.toErrorEl.classList.remove("compose-modal__error--visible");
            this.toErrorEl.textContent = "";
        }

        this.applyInitialValues();
        this.focusInitialField();
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

        const recipientError = validateRecipientAddress(to);
        this.setRecipientError(recipientError);
        if (recipientError) {
            this.toInput?.focus();
            return;
        }

        this.props.onSend?.({ to, subject, body });
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
        this.props.onAttachFile?.();
    }

    private handleSaveDraft(): void {
        this.props.onSaveDraft?.();
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

    public async unmount(): Promise<void> {
        await this.attachButton.unmount();
        await this.draftButton.unmount();
        await this.sendButton.unmount();
        this.toInput = null;
        this.toErrorEl = null;
        this.subjectInput = null;
        this.bodyTextarea = null;
        await super.unmount();
    }
}
