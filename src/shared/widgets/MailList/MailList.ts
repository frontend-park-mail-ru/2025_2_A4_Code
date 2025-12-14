import { Component } from "@shared/base/Component";
import template from "./MailList.hbs";
import "./MailList.scss";
import { MailItemComponent } from "@shared/components/MailItem/MailItem";
import { Mail } from "@app-types/mail";
import { MAIL_LIST_TEXTS } from "@shared/constants/texts";
import { ButtonComponent } from "@shared/components/Button/Button";

type Props = {
    items?: Mail[];
    onOpen?: (id: string) => void;
    emptyMessage?: string;
    hasMore?: boolean;
    loadingMore?: boolean;
    onLoadMore?: () => void;
};

export class MailListComponent extends Component<Props> {
    private childItems: Map<string, MailItemComponent> = new Map();
    private observer: IntersectionObserver | null = null;

    constructor(props: Props = {}) {
        super({
            items: props.items ?? [],
            onOpen: props.onOpen,
            emptyMessage: props.emptyMessage ?? MAIL_LIST_TEXTS.emptyMessage,
            hasMore: props.hasMore ?? false,
            loadingMore: props.loadingMore ?? false,
            onLoadMore: props.onLoadMore,
        });
    }

    protected renderTemplate(): string {
        return template({});
    }

    protected afterRender(): void {
        this.renderItems();
        this.renderFooter();
        this.setupObserver();
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
            empty.textContent = this.props.emptyMessage ?? MAIL_LIST_TEXTS.emptyMessage;
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

        this.renderFooter();
    }

    private renderFooter(): void {
        const footer = this.element?.querySelector("[data-slot=\"footer\"]") as HTMLElement | null;
        if (!footer) return;
        footer.innerHTML = "";

        if (this.props.loadingMore) {
            const loading = document.createElement("div");
            loading.className = "mail-list__loading";
            loading.textContent = "Загружаем ещё...";
            footer.appendChild(loading);
            footer.appendChild(this.buildSentinel());
            return;
        }

        if (this.props.hasMore) {
            const buttonWrap = document.createElement("div");
            buttonWrap.className = "mail-list__load-more";
            const btn = new ButtonComponent({
                label: "Показать ещё",
                variant: "secondary",
                onClick: () => this.props.onLoadMore?.(),
            });
            btn.render();
            btn.mount(buttonWrap).then();
            footer.appendChild(buttonWrap);
            footer.appendChild(this.buildSentinel());
            return;
        }

        footer.appendChild(this.buildSentinel());
    }

    public setProps(newProps: Partial<Props>): void {
        this.props = { ...(this.props as Props), ...newProps };

        if (
            Object.prototype.hasOwnProperty.call(newProps, "items") ||
            Object.prototype.hasOwnProperty.call(newProps, "emptyMessage")
        ) {
            this.renderItems();
            return;
        }

        if (
            Object.prototype.hasOwnProperty.call(newProps, "hasMore") ||
            Object.prototype.hasOwnProperty.call(newProps, "loadingMore")
        ) {
            this.renderFooter();
            this.setupObserver();
        }
    }

    private buildSentinel(): HTMLElement {
        const sentinel = document.createElement("div");
        sentinel.className = "mail-list__sentinel";
        sentinel.setAttribute("data-load-sentinel", "true");
        return sentinel;
    }

    private setupObserver(): void {
        const footer = this.element?.querySelector("[data-slot=\"footer\"]") as HTMLElement | null;
        const sentinel = footer?.querySelector(".mail-list__sentinel") as HTMLElement | null;
        if (!sentinel) {
            return;
        }

        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry || !entry.isIntersecting) return;
                if (this.props.loadingMore || !this.props.hasMore) return;
                this.props.onLoadMore?.();
            },
            { root: this.element?.querySelector(".mail-list__items") || null, threshold: 0.1 }
        );

        this.observer.observe(sentinel);
    }

    public async unmount(): Promise<void> {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        for (const [, child] of this.childItems) {
            await child.unmount();
        }
        this.childItems.clear();
        await super.unmount();
    }
}
