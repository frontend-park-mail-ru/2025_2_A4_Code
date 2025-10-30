import {Component} from "../../../../shared/base/Component";
import {ButtonComponent} from "../../../../shared/components/Button/Button";
import template from "./ComposeModal.hbs";
import "./ComposeModal.scss";

type Props = {
    avatarUrl?: string | null;
    avatarLabel?: string;
    onClose?: () => void;
    onSend?: (data: { to: string; subject: string; body: string }) => void;
    onAttachFile?: () => void;
    onSaveDraft?: () => void;
};

export class ComposeModal extends Component<Props> {
    private readonly attachButton: ButtonComponent;
    private readonly draftButton: ButtonComponent;
    private readonly sendButton: ButtonComponent;

    constructor(props: Props = {}) {
        super(props);

        this.attachButton = new ButtonComponent({
            label: "\u041f\u0440\u0438\u043a\u0440\u0435\u043f\u0438\u0442\u044c \u0444\u0430\u0439\u043b",
            variant: "link",
            icon: '<img src="/img/modal-attach-file.svg" alt="" aria-hidden="true" />',
            onClick: () => this.handleAttach(),
        });

        this.draftButton = new ButtonComponent({
            label: "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0432 \u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a\u0438",
            variant: "link",
            icon: '<img src="/img/modal-to-draft.svg" alt="" aria-hidden="true" />',
            onClick: () => this.handleSaveDraft(),
        });

        this.sendButton = new ButtonComponent({
            label: "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c",
            variant: "secondary",
            onClick: () => this.handleSend(),
        });
    }

    protected renderTemplate(): string {
        return template({
            avatarUrl: this.props.avatarUrl ?? null,
            avatarLabel: this.props.avatarLabel ?? "TS",
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
    }

    private handleSend(): void {
        const root = this.element as HTMLElement | null;
        if (!root) return;

        const to = (root.querySelector('[data-field="to"]') as HTMLInputElement | null)?.value ?? "";
        const subject = (root.querySelector('[data-field="subject"]') as HTMLInputElement | null)?.value ?? "";
        const body = (root.querySelector('[data-field="body"]') as HTMLTextAreaElement | null)?.value ?? "";
        this.props.onSend?.({ to, subject, body });
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
        await super.unmount();
    }
}
