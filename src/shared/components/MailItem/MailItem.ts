import {Component} from "../../base/Component";
import {Mail} from "../../../types/mail";
import template from "./MailItem.hbs";
import "./MailItem.scss";
import { getInitials } from "../../../utils/person";

type Props = {
    mail: Mail;
    onOpen?: (id: string) => void;
};

export class MailItemComponent extends Component<Props> {
    private openHandler?: (event: Event) => void;
    private avatarImg?: HTMLImageElement | null;

    protected renderTemplate(): string {
        const mail = this.props.mail;
        const initials = this.getInitials();
        return template({
            id: mail.id,
            from: mail.from,
            subject: mail.subject,
            preview: mail.preview,
            time: mail.time,
            avatarUrl: mail.avatarUrl,
            isRead: !!mail.isRead,
            initials,
        });
    }

    protected afterRender(): void {
        const element = this.element!;

        this.openHandler = (event: Event) => {
            const target = event.target as HTMLElement;
            if (target.closest('[data-action]')) return;
            this.props.onOpen?.(this.props.mail.id);
        };
        element.addEventListener('click', this.openHandler);

        this.avatarImg = element.querySelector('.mail-item__avatar-image') as HTMLImageElement | null;
        if (this.avatarImg) {
            this.avatarImg.addEventListener('error', this.handleAvatarError, { once: true });
        }
    }

    private handleAvatarError = (): void => {
        if (!this.avatarImg) return;
        const placeholder = document.createElement('div');
        placeholder.className = 'mail-item__avatar mail-item__avatar--placeholder';
        placeholder.textContent = this.getInitials();
        this.avatarImg.replaceWith(placeholder);
        this.avatarImg = null;
    };

    private getInitials(): string {
        const initials = getInitials(this.props.mail.from ?? "", "?");
        return initials ? initials[0] : "?";
    }

    public async unmount(): Promise<void> {
        const element = this.element;
        if (element && this.openHandler) {
            element.removeEventListener('click', this.openHandler);
        }
        if (this.avatarImg) {
            this.avatarImg.removeEventListener('error', this.handleAvatarError);
            this.avatarImg = null;
        }

        await super.unmount();
    }
}
