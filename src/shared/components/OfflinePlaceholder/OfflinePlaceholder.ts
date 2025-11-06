import { Component } from "@shared/base/Component";
import template from "./OfflinePlaceholder.hbs";
import "./OfflinePlaceholder.scss";
import { ButtonComponent } from "@shared/components/Button/Button";

type Props = {
    title?: string;
    message?: string;
    icon?: string;
    actionLabel?: string;
    onAction?: () => void;
};

export class OfflinePlaceholderComponent extends Component<Props> {
    private actionButton?: ButtonComponent;

    protected renderTemplate(): string {
        return template({
            title: this.props.title ?? "Нет подключения к сети",
            message: this.props.message ?? "Контент станет доступен, когда соединение восстановится.",
            icon: this.props.icon ?? "/img/working-offline.svg",
        });
    }

    protected afterRender(): void {
        if (!this.props.actionLabel || !this.element) {
            this.actionButton = undefined;
            return;
        }

        this.actionButton = new ButtonComponent({
            label: this.props.actionLabel,
            variant: "secondary",
            onClick: () => this.props.onAction?.(),
        });

        const slot = this.element.querySelector("[data-slot=\"action\"]") as HTMLElement | null;
        if (slot) {
            slot.innerHTML = "";
            this.actionButton.render();
            this.actionButton.mount(slot).then();
        }
    }

    public async unmount(): Promise<void> {
        await this.actionButton?.unmount();
        await super.unmount();
    }
}
