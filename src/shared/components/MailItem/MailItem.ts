import { Component } from "@shared/base/Component";
import { Mail } from "@app-types/mail";
import template from "./MailItem.hbs";
import "./MailItem.scss";
import { getInitials } from "@utils/person";

type Props = {
    mail: Mail;
    onOpen?: (id: string) => void;
};

export class MailItemComponent extends Component<Props> {
    private openHandler?: (event: Event) => void;
    private avatarRoot?: HTMLElement | null;
    private avatarImg?: HTMLImageElement | null;
    private pendingAvatarToken = 0;

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
            if (target.closest("[data-action]")) return;
            this.props.onOpen?.(this.props.mail.id);
        };
        element.addEventListener("click", this.openHandler);

        this.avatarRoot = element.querySelector("[data-avatar-root]") as HTMLElement | null;
        if (this.props.mail.avatarUrl && this.avatarRoot) {
            void this.prepareAvatarImage(this.props.mail.avatarUrl, this.props.mail.from ?? "");
        }
    }

    private async prepareAvatarImage(url: string, alt: string): Promise<void> {
        const requestId = ++this.pendingAvatarToken;

        const image = new Image();
        image.decoding = "async";
        image.className = "mail-item__avatar mail-item__avatar-image";
        image.alt = alt;
        image.src = url;

        try {
            await image.decode();
        } catch (decodeError) {
            const loaded = await new Promise<boolean>((resolve) => {
                if (image.complete && image.naturalWidth > 0) {
                    resolve(true);
                    return;
                }

                image.addEventListener(
                    "load",
                    () => resolve(true),
                    { once: true }
                );
                image.addEventListener(
                    "error",
                    () => resolve(false),
                    { once: true }
                );
            });

            if (!loaded) {
                if (requestId === this.pendingAvatarToken) {
                    this.showAvatarPlaceholder();
                }
                return;
            }
        }

        if (!this.avatarRoot || requestId !== this.pendingAvatarToken) {
            return;
        }

        if (this.avatarImg) {
            this.avatarImg.removeEventListener("error", this.handleAvatarError);
        }

        image.addEventListener("error", this.handleAvatarError, { once: true });
        this.avatarRoot.replaceChildren(image);
        this.avatarImg = image;
    }

    private showAvatarPlaceholder(): void {
        if (!this.avatarRoot) {
            return;
        }

        if (this.avatarImg) {
            this.avatarImg.removeEventListener("error", this.handleAvatarError);
            this.avatarImg = null;
        }

        const placeholder = document.createElement("div");
        placeholder.className = "mail-item__avatar mail-item__avatar--placeholder";
        placeholder.textContent = this.getInitials();
        placeholder.setAttribute("data-avatar-placeholder", "true");
        this.avatarRoot.replaceChildren(placeholder);
    }

    private handleAvatarError = (): void => {
        this.showAvatarPlaceholder();
    };

    private getInitials(): string {
        const initialsValue = getInitials(this.props.mail.from ?? "", "?");
        return initialsValue ? initialsValue[0] : "?";
    }

    public async unmount(): Promise<void> {
        const element = this.element;
        if (element && this.openHandler) {
            element.removeEventListener("click", this.openHandler);
        }
        if (this.avatarImg) {
            this.avatarImg.removeEventListener("error", this.handleAvatarError);
            this.avatarImg = null;
        }
        this.avatarRoot = null;
        this.pendingAvatarToken = 0;

        await super.unmount();
    }
}

