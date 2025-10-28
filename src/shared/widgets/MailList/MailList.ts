import {Component} from "../../base/Component";
import template from "./MailList.hbs";
import "./MailList.scss";
import {MailItemComponent} from "../../components/MailItem/MailItem";
import {Mail} from "../../../types/mail";

type Props = {
    items?: Mail[];
    onOpen?: (id: string) => void;
};

export class MailListComponent extends Component<Props> {
    private childItems: Map<string, MailItemComponent> = new Map();

    constructor(props: Props = {}) {
        super({
            items: props.items ?? [],
            onOpen: props.onOpen,
        });
    }

    protected renderTemplate(): string {
        const items = this.props.items ?? [];
        return template({});
    }

    protected afterRender(): void {
        this.renderItems();
    }

    private renderItems(): void {
        const container = this.element?.querySelector('.mail-list__items') as HTMLElement | null;
        if (!container) return;

        for (const [, child] of this.childItems) {
            child.unmount();
        }
        container.innerHTML = '';
        this.childItems.clear();

        const items = this.props.items ?? [];
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
        const previous = { ...(this.props as Props) };
        this.props = { ...(this.props as Props), ...newProps };

        if (newProps.items && JSON.stringify(previous.items) !== JSON.stringify(newProps.items)) {
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

