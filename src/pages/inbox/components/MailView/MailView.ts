import { Component } from "@shared/base/Component";
import { ButtonComponent } from "@shared/components/Button/Button";
import template from "./MailView.hbs";
import "./MailView.scss";
import { MAIL_VIEW_TEXTS } from "@pages/constants/texts";
import { getOnlineStatus, subscribeToOnlineStatus } from "@shared/utils/onlineStatus";

type Props = {
    id: string;
    from: string;
    subject: string;
    time: string;
    body: string;
    avatarUrl?: string | null;
    fromEmail?: string;
    recipient?: string;
    onBack?: () => void;
    onReply?: () => void;
    onForward?: () => void;
};

export class MailViewComponent extends Component<Props> {
    private readonly toolbarButtons: Map<string, ButtonComponent>;
    private isOnline: boolean = getOnlineStatus();
    private unsubscribeOnline?: () => void;

    constructor(props: Props) {
        super(props);

        this.toolbarButtons = new Map([
            [
                "back",
                this.createToolbarButton({
                    icon: '<img src="/img/message-back.svg" alt="" aria-hidden="true" />',
                    ariaLabel: MAIL_VIEW_TEXTS.backAriaLabel,
                    onClick: () => this.props.onBack?.(),
                    disabled: false,
                }),
            ],
            [
                "delete",
                this.createToolbarButton({
                    label: MAIL_VIEW_TEXTS.delete,
                    icon: '<img src="/img/message-delete.svg" alt="" aria-hidden="true" />',
                }),
            ],
            [
                "folder",
                this.createToolbarButton({
                    label: MAIL_VIEW_TEXTS.moveToFolder,
                    icon: '<img src="/img/message-in-folder.svg" alt="" aria-hidden="true" />',
                }),
            ],
            [
                "spam",
                this.createToolbarButton({
                    label: MAIL_VIEW_TEXTS.markAsSpam,
                    icon: '<img src="/img/message-to-spam.svg" alt="" aria-hidden="true" />',
                }),
            ],
            [
                "reply",
                this.createToolbarButton({
                    label: MAIL_VIEW_TEXTS.reply,
                    icon: '<img src="/img/message-reply.svg" alt="" aria-hidden="true" />',
                    onClick: () => this.props.onReply?.(),
                }),
            ],
            [
                "forward",
                this.createToolbarButton({
                    label: MAIL_VIEW_TEXTS.forward,
                    icon: '<img src="/img/message-forward.svg" alt="" aria-hidden="true" />',
                    onClick: () => this.props.onForward?.(),
                }),
            ],
        ]);

        this.updateToolbarDisabledState();
        this.unsubscribeOnline = subscribeToOnlineStatus((online) => {
            this.isOnline = online;
            this.updateToolbarDisabledState();
        });
    }

    private createToolbarButton({
        label,
        icon,
        onClick,
        ariaLabel,
        disabled,
    }: {
        label?: string;
        icon: string;
        onClick?: () => void;
        ariaLabel?: string;
        disabled?: boolean;
    }): ButtonComponent {
        const props: ConstructorParameters<typeof ButtonComponent>[0] = {
            icon,
            variant: "link",
            type: "button",
            disabled: disabled ?? !this.isOnline,
        };

        if (label) {
            props.label = label;
        }

        if (onClick) {
            props.onClick = () => onClick();
        }

        if (ariaLabel) {
            props.ariaLabel = ariaLabel;
        }

        return new ButtonComponent(props);
    }

    protected renderTemplate(): string {
        const { from, subject, time, body, avatarUrl } = this.props;
        const initials = (from?.[0] || "").toUpperCase();
        return template({
            from,
            subject,
            time,
            body,
            initials,
            avatarUrl: avatarUrl ?? null,
            fromEmail: this.props.fromEmail ?? from,
            recipient: this.props.recipient ?? MAIL_VIEW_TEXTS.recipientFallback,
            recipientLabel: MAIL_VIEW_TEXTS.recipientLabel,
        });
    }

    protected afterRender(): void {
        if (!this.element) {
            return;
        }

        for (const [key, button] of this.toolbarButtons.entries()) {
            const slot = this.element.querySelector(`[data-slot="${key}"]`) as HTMLElement | null;
            if (!slot) {
                continue;
            }

            slot.innerHTML = "";
            button.render();
            button.mount(slot).then();
        }
    }

    public async unmount(): Promise<void> {
        this.unsubscribeOnline?.();
        this.unsubscribeOnline = undefined;
        for (const button of this.toolbarButtons.values()) {
            await button.unmount();
        }
        await super.unmount();
    }

    private updateToolbarDisabledState(): void {
        const disabled = !this.isOnline;
        for (const [key, button] of this.toolbarButtons.entries()) {
            if (key === "back") {
                button.setProps({ disabled: false });
            } else {
                button.setProps({ disabled });
            }
        }
    }
}
