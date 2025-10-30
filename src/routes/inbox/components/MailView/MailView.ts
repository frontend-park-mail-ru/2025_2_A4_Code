import {Component} from "../../../../shared/base/Component";
import {ButtonComponent} from "../../../../shared/components/Button/Button";
import template from "./MailView.hbs";
import "./MailView.scss";

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
};

export class MailViewComponent extends Component<Props> {
    private readonly toolbarButtons: Map<string, ButtonComponent>;

    constructor(props: Props) {
        super(props);

        this.toolbarButtons = new Map([
            [
                "back",
                this.createToolbarButton({
                    icon: '<img src="/img/message-back.svg" alt="" aria-hidden="true" />',
                    ariaLabel: "Вернуться к сообщениям",
                    onClick: () => this.props.onBack?.(),
                }),
            ],
            [
                "delete",
                this.createToolbarButton({
                    label: "Удалить",
                    icon: '<img src="/img/message-delete.svg" alt="" aria-hidden="true" />',
                }),
            ],
            [
                "folder",
                this.createToolbarButton({
                    label: "В папку",
                    icon: '<img src="/img/message-in-folder.svg" alt="" aria-hidden="true" />',
                }),
            ],
            [
                "spam",
                this.createToolbarButton({
                    label: "Спам",
                    icon: '<img src="/img/message-to-spam.svg" alt="" aria-hidden="true" />',
                }),
            ],
            [
                "reply",
                this.createToolbarButton({
                    label: "Ответить",
                    icon: '<img src="/img/message-reply.svg" alt="" aria-hidden="true" />',
                }),
            ],
            [
                "forward",
                this.createToolbarButton({
                    label: "Переслать",
                    icon: '<img src="/img/message-forward.svg" alt="" aria-hidden="true" />',
                }),
            ],
        ]);
    }

    private createToolbarButton({
        label,
        icon,
        onClick,
        ariaLabel,
    }: {
        label?: string;
        icon: string;
        onClick?: () => void;
        ariaLabel?: string;
    }): ButtonComponent {
        const props: ConstructorParameters<typeof ButtonComponent>[0] = {
            icon,
            variant: "link",
            type: "button",
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
            recipient: this.props.recipient ?? "вам",
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
        for (const button of this.toolbarButtons.values()) {
            await button.unmount();
        }
        await super.unmount();
    }
}
