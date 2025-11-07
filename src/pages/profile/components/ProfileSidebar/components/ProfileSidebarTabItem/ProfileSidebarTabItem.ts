import {Component} from "@shared/base/Component";
import template from "./ProfileSidebarTabItem.hbs";
import "./ProfileSidebarTabItem.scss";

type Props = {
    id: string;
    label: string;
    icon: string;
    active?: boolean;
    disabled?: boolean;
    onSelect?: (id: string) => void;
};

export class ProfileSidebarTabItem extends Component<Props> {
    protected renderTemplate(): string {
        return template({
            id: this.props.id,
            label: this.props.label,
            active: this.props.active,
            disabled: this.props.disabled,
        });
    }

    protected afterRender(): void {
        if (!this.element) return;
        this.element.addEventListener("click", this.handleClick);
        this.applyIcon();
    }

    public setProps(newProps: Partial<Props>): void {
        this.props = { ...this.props, ...newProps } as Props;

        if (!this.element) return;
        this.element.classList.toggle("profile-sidebar-tab--active", !!this.props.active);
        this.element.classList.toggle("profile-sidebar-tab--disabled", !!this.props.disabled);
        this.element.setAttribute("aria-disabled", this.props.disabled ? "true" : "false");
        this.element.tabIndex = this.props.disabled ? -1 : 0;

        const labelEl = this.element.querySelector(".profile-sidebar-tab__label");
        if (labelEl) {
            labelEl.textContent = this.props.label;
        }

        this.applyIcon();
    }

    public async unmount(): Promise<void> {
        this.element?.removeEventListener("click", this.handleClick);
        await super.unmount();
    }

    private handleClick = () => {
        if (this.props.disabled) {
            return;
        }
        this.props.onSelect?.(this.props.id);
    };

    private applyIcon(): void {
        if (!this.element) return;
        const iconContainer = this.element.querySelector("[data-icon]") as HTMLElement | null;
        if (!iconContainer) return;
        iconContainer.style.backgroundImage = `url(${this.props.icon})`;
    }
}

