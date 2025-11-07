import {Component} from "@shared/base/Component";
import template from "./SidebarFolderItem.hbs";
import "./SidebarFolderItem.scss";

export type SidebarFolderItemProps = {
    id: string;
    name: string;
    count?: number;
    active?: boolean;
    icon?: string;
    onSelect?: (id: string) => void;
};

const ICON_MAP: Record<string, string> = {
    inbox: "/img/folder-inbox.svg",
    sent: "/img/folder-sent.svg",
    drafts: "/img/folder-drafts.svg",
};

export class SidebarFolderItem extends Component<SidebarFolderItemProps> {
    protected renderTemplate(): string {
        return template({
            id: this.props.id,
            name: this.props.name,
            count: this.props.count,
            active: this.props.active,
        });
    }

    protected afterRender(): void {
        this.element?.addEventListener("click", this.handleClick);
        this.applyIcon();
    }

    private handleClick = (): void => {
        this.props.onSelect?.(this.props.id);
    };

    public setProps(newProps: Partial<SidebarFolderItemProps>): void {
        this.props = { ...this.props, ...newProps } as SidebarFolderItemProps;
        if (!this.element) return;

        this.element.classList.toggle("sidebar-folder--active", !!this.props.active);

        const nameEl = this.element.querySelector('.sidebar-folder__name');
        if (nameEl) {
            nameEl.textContent = this.props.name;
        }

        const countEl = this.element.querySelector('.sidebar-folder__count') as HTMLElement | null;
        if (this.props.count) {
            if (countEl) {
                countEl.textContent = String(this.props.count);
            } else {
                const span = document.createElement('span');
                span.className = 'sidebar-folder__count';
                span.textContent = String(this.props.count);
                this.element.appendChild(span);
            }
        } else if (countEl) {
            countEl.remove();
        }

        this.applyIcon();
    }

    private applyIcon(): void {
        if (!this.element) return;
        const iconEl = this.element.querySelector('.sidebar-folder__icon') as HTMLElement | null;
        if (!iconEl) return;

        const icon = this.props.icon ?? ICON_MAP[this.props.id] ?? "/img/folder-default.svg";
        iconEl.style.backgroundImage = `url(${icon})`;
    }

    public async unmount(): Promise<void> {
        this.element?.removeEventListener("click", this.handleClick);
        await super.unmount();
    }
}
