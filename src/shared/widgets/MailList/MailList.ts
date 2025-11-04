import { Component } from "../../base/Component";
import template from "./MailList.hbs";
import "./MailList.scss";
import { MailItemComponent } from "../../components/MailItem/MailItem";
import { Mail } from "../../../types/mail";

type Props = {
    items?: Mail[];
    onOpen?: (id: string) => void;
    emptyMessage?: string;
};

export class MailListComponent extends Component<Props> {
    private childItems: Map<string, MailItemComponent> = new Map();

    constructor(props: Props = {}) {
        super({
            items: props.items ?? [],
            onOpen: props.onOpen,
            emptyMessage: props.emptyMessage ?? "Писем пока нет",
        });
    }

    protected renderTemplate(): string {
        return template({});
    }

    protected afterRender(): void {
        this.renderItems();
    }

    private renderItems(): void {
        const container = this.element?.querySelector(".mail-list__items") as HTMLElement | null;
        if (!container) return;

        for (const [, child] of this.childItems) {
            child.unmount();
        }
        container.innerHTML = "";
        this.childItems.clear();

        const items = this.props.items ?? [];

        if (items.length === 0) {
            const empty = document.createElement("div");
            empty.className = "mail-list__empty";
            empty.textContent = this.props.emptyMessage ?? "Писем пока нет";
            container.appendChild(empty);
            return;
        }

        for (const mail of items) {
            const item = new MailItemComponent({
                mail,
                onOpen: this.props.onOpen,
            });
            const element = item.render();
            container.appendChild(element);
            this.childItems.set(mail.id, item);
        }
    }

    public setProps(newProps: Partial<Props>): void {
        this.props = { ...(this.props as Props), ...newProps };

        if (
            Object.prototype.hasOwnProperty.call(newProps, "items") ||
            Object.prototype.hasOwnProperty.call(newProps, "emptyMessage")
        ) {
            this.renderItems();
        }
    }

    public async unmount(): Promise<void> {
        for (const [, child] of this.childItems) {
            await child.unmount();
        }
        this.childItems.clear();
        await super.unmount();
    }
}

