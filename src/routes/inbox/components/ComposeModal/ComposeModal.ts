import { Component } from "../../../../shared/base/Component";
import { ButtonComponent } from "../../../../shared/components/Button/Button";
import template from "./ComposeModal.hbs";
import "./ComposeModal.scss";

type Props = {
    avatarUrl?: string | null;
    avatarLabel?: string;
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
            label: "Сохранить в черновики",
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
        return template({
            avatarUrl: this.props.avatarUrl ?? null,
            avatarLabel: this.props.avatarLabel ?? "",
        });
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

        const attachSlot = root.querySelector('[data-slot="attach"]') as HTMLElement | null;
        if (attachSlot) {
            this.attachButton.render();
            this.attachButton.mount(attachSlot).then();
        }

        const draftSlot = root.querySelector('[data-slot="draft"]') as HTMLElement | null;
        if (draftSlot) {
            this.draftButton.render();
            this.draftButton.mount(draftSlot).then();
        }

        const sendSlot = root.querySelector('[data-slot="send"]') as HTMLElement | null;
        if (sendSlot) {
            this.sendButton.render();
            this.sendButton.mount(sendSlot).then();
        }

        this.toInput = root.querySelector('[data-field="to"]') as HTMLInputElement | null;
        this.subjectInput = root.querySelector('[data-field="subject"]') as HTMLInputElement | null;
        this.bodyTextarea = root.querySelector('[data-field="body"]') as HTMLTextAreaElement | null;

        this.applyInitialValues();
        this.focusInitialField();
    }

    private handleSend(): void {
        const to = this.toInput?.value ?? "";
        const subject = this.subjectInput?.value ?? "";
        const body = this.bodyTextarea?.value ?? "";
        this.props.onSend?.({ to, subject, body });
    }

    private applyInitialValues(): void {
        if (this.toInput) {
            this.toInput.value = this.props.initialTo ?? "";
        }

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

    public async unmount(): Promise<void> {
        await this.attachButton.unmount();
        await this.draftButton.unmount();
        await this.sendButton.unmount();
        this.toInput = null;
        this.subjectInput = null;
        this.bodyTextarea = null;
        await super.unmount();
    }
}
