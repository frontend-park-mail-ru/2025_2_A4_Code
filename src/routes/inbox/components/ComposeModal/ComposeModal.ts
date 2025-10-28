import {Component} from "../../../../shared/base/Component";
import template from "./ComposeModal.hbs";
import "./ComposeModal.scss";

type Props = {
    signature?: string;
    onClose?: () => void;
    onSend?: (data: { to: string; subject: string; body: string }) => void;
};

export class ComposeModal extends Component<Props> {
    protected renderTemplate(): string {
        return template({ signature: this.props.signature ?? "Андреева Антонина" });
    }

    protected afterRender(): void {
        const el = this.element!;
        el.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).classList.contains('compose-overlay')) {
                this.props.onClose?.();
            }
        });

        const closeBtn = el.querySelector('[data-action="close"]') as HTMLElement | null;
        closeBtn?.addEventListener('click', () => this.props.onClose?.());

        const sendBtn = el.querySelector('[data-action="send"]') as HTMLElement | null;
        sendBtn?.addEventListener('click', () => {
            const to = (el.querySelector('[data-field="to"]') as HTMLInputElement)?.value ?? '';
            const subject = (el.querySelector('[data-field="subject"]') as HTMLInputElement)?.value ?? '';
            const body = (el.querySelector('[data-field="body"]') as HTMLTextAreaElement)?.value ?? '';
            this.props.onSend?.({ to, subject, body });
        });
    }
}

