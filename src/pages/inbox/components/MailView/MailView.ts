import { Component } from "@shared/base/Component";
import { ButtonComponent } from "@shared/components/Button/Button";
import template from "./MailView.hbs";
import "./MailView.scss";
import { MAIL_VIEW_TEXTS } from "@pages/constants/texts";
import { getOnlineStatus, subscribeToOnlineStatus } from "@shared/utils/onlineStatus";
import { probeOnlineStatus } from "@shared/utils/networkProbe";

type Props = {
    id: string;
    from: string;
    subject: string;
    time: string;
    body: string;
    avatarUrl?: string | null;
    fromEmail?: string;
    recipient?: string;
    currentFolderId?: string;
    currentFolderType?: string;
    onBack?: () => void;
    onReply?: () => void;
    onForward?: () => void;
    onMoveToFolder?: () => void;
    onMarkAsSpam?: () => void;
    onDelete?: () => void;
};

export class MailViewComponent extends Component<Props> {
    private readonly toolbarButtons: Map<string, ButtonComponent>;
    private readonly offlineLockedButtons = new Set(["reply", "forward", "folder", "delete", "spam"]);
    private isOnline: boolean = getOnlineStatus();
    private unsubscribeOnline?: () => void;
    private readonly senderInitials: string;

    constructor(props: Props) {
        super(props);

        this.senderInitials = this.computeInitials(props.from);

        this.toolbarButtons = new Map([
            [
                "back",
                this.createToolbarButton("back", {
                    icon: '<img src="/img/message-back.svg" alt="" aria-hidden="true" />',
                    ariaLabel: MAIL_VIEW_TEXTS.backAriaLabel,
                    onClick: () => this.props.onBack?.(),
                    disabled: false,
                }),
            ],
            [
                "delete",
                this.createToolbarButton("delete", {
                    label: MAIL_VIEW_TEXTS.delete,
                    ariaLabel: MAIL_VIEW_TEXTS.delete,
                    icon: '<img src="/img/message-delete.svg" alt="" aria-hidden="true" />',
                    onClick: () => this.props.onDelete?.(),
                }),
            ],
            [
                "folder",
                this.createToolbarButton("folder", {
                    label: MAIL_VIEW_TEXTS.moveToFolder,
                    ariaLabel: MAIL_VIEW_TEXTS.moveToFolder,
                    icon: '<img src="/img/message-in-folder.svg" alt="" aria-hidden="true" />',
                    onClick: () => this.props.onMoveToFolder?.(),
                }),
            ],
            [
                "spam",
                this.createToolbarButton("spam", {
                    label: MAIL_VIEW_TEXTS.markAsSpam,
                    ariaLabel: MAIL_VIEW_TEXTS.markAsSpam,
                    icon: '<img src="/img/message-to-spam.svg" alt="" aria-hidden="true" />',
                    onClick: () => this.props.onMarkAsSpam?.(),
                }),
            ],
            [
                "reply",
                this.createToolbarButton("reply", {
                    label: MAIL_VIEW_TEXTS.reply,
                    ariaLabel: MAIL_VIEW_TEXTS.reply,
                    icon: '<img src="/img/message-reply.svg" alt="" aria-hidden="true" />',
                    onClick: () => this.props.onReply?.(),
                }),
            ],
            [
                "forward",
                this.createToolbarButton("forward", {
                    label: MAIL_VIEW_TEXTS.forward,
                    ariaLabel: MAIL_VIEW_TEXTS.forward,
                    icon: '<img src="/img/message-forward.svg" alt="" aria-hidden="true" />',
                    onClick: () => this.props.onForward?.(),
                }),
            ],
        ]);

        this.updateToolbarDisabledState();
        this.updateAvatarDisplay();
        this.unsubscribeOnline = subscribeToOnlineStatus((online) => {
            this.isOnline = online;
            this.updateToolbarDisabledState();
            this.updateAvatarDisplay();
        });
        this.ensureConnectivity();
    }

    private createToolbarButton(
        key: string,
        {
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
        }
    ): ButtonComponent {
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
            props.onClick = () => {
                if (this.offlineLockedButtons.has(key) && !this.isOnline) {
                    return;
                }
                onClick();
            };
        }

        if (ariaLabel) {
            props.ariaLabel = ariaLabel;
        }

        return new ButtonComponent(props);
    }

    protected renderTemplate(): string {
        const { from, subject, time, body, avatarUrl } = this.props;
        return template({
            from,
            subject,
            time,
            body,
            initials: this.senderInitials,
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

        const folderType = (this.props.currentFolderType || this.props.currentFolderId || "").toLowerCase();
        const hidden = new Set<string>();
        if (folderType === "trash") {
            hidden.add("delete");
            hidden.add("spam");
        } else if (folderType === "spam") {
            hidden.add("spam");
        }

        for (const [key, button] of this.toolbarButtons.entries()) {
            const slot = this.element.querySelector(`[data-slot="${key}"]`) as HTMLElement | null;
            if (!slot) {
                continue;
            }
            if (hidden.has(key)) {
                slot.innerHTML = "";
                continue;
            }

            slot.innerHTML = "";
            button.render();
            button.mount(slot).then();
        }

        this.updateAvatarDisplay();
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
        for (const [key, button] of this.toolbarButtons.entries()) {
            const disableButton = this.offlineLockedButtons.has(key) && !this.isOnline;
            button.setProps({ disabled: disableButton });
        }
    }

    public refreshOnlineState(): void {
        this.isOnline = getOnlineStatus();
        this.updateToolbarDisabledState();
        this.updateAvatarDisplay();
        this.ensureConnectivity();
    }

    private ensureConnectivity(): void {
        void (probeOnlineStatus().catch(() => undefined));
    }

    private updateAvatarDisplay(): void {
        const avatarContainer = this.element?.querySelector("[data-avatar]") as HTMLElement | null;
        if (!avatarContainer) {
            return;
        }

        const image = avatarContainer.querySelector("[data-avatar-image]") as HTMLImageElement | null;
        const initialsEl = avatarContainer.querySelector("[data-avatar-initials]") as HTMLElement | null;
        const showImage = this.shouldShowAvatarImage();

        if (image) {
            image.style.display = showImage ? "block" : "none";
        }

        if (initialsEl) {
            initialsEl.textContent = this.senderInitials;
            initialsEl.style.display = showImage ? "none" : "flex";
        }
    }

    private shouldShowAvatarImage(): boolean {
        return Boolean(this.props.avatarUrl && this.isOnline);
    }

    private computeInitials(from: string | undefined): string {
        return (from?.[0] || "").toUpperCase();
    }
}
