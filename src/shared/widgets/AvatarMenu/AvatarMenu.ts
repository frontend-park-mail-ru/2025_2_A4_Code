import { Component } from "@shared/base/Component";
import { ButtonComponent } from "@shared/components/Button/Button";
import template from "./AvatarMenu.hbs";
import "./AvatarMenu.scss";
import { AVATAR_MENU_TEXTS } from "@shared/constants/texts";

type Props = {
    onProfile?: () => void;
    onSettings?: () => void;
    onLogout?: () => void;
};

export class AvatarMenu extends Component<Props> {
    private readonly profileButton: ButtonComponent;
    private readonly settingsButton: ButtonComponent;
    private readonly logoutButton: ButtonComponent;

    constructor(props: Props = {}) {
        super(props);

        this.profileButton = new ButtonComponent({
            label: AVATAR_MENU_TEXTS.profile,
            variant: "link",
            fullWidth: true,
            icon: '<img src="/img/menu-profile-logo.svg" alt="" aria-hidden="true" />',
            onClick: () => this.props.onProfile?.(),
        });
        
        this.settingsButton = new ButtonComponent({
            label: AVATAR_MENU_TEXTS.settings,
            variant: "link",
            fullWidth: true,
            icon: '<img src="/img/menu-settings-logo.svg" alt="" aria-hidden="true" />',
            onClick: () => this.props.onSettings?.(),
        });

        this.logoutButton = new ButtonComponent({
            label: AVATAR_MENU_TEXTS.logout,
            variant: "link",
            fullWidth: true,
            icon: '<img src="/img/menu-logout-logo.svg" alt="" aria-hidden="true" />',
            onClick: () => this.props.onLogout?.(),
        });
    }

    protected renderTemplate(): string {
        return template({});
    }

    protected afterRender(): void {
        this.mountButton("profile", this.profileButton);
        this.mountButton("settings", this.settingsButton);
        this.mountButton("logout", this.logoutButton);
    }

    public setProps(newProps: Partial<Props>): void {
        this.props = { ...this.props, ...newProps };

        this.profileButton.setProps({
            label: AVATAR_MENU_TEXTS.profile,
            onClick: () => this.props.onProfile?.(),
        });

        this.settingsButton.setProps({
            label: AVATAR_MENU_TEXTS.settings,
            onClick: () => this.props.onSettings?.(),
        });

        this.logoutButton.setProps({
            label: AVATAR_MENU_TEXTS.logout,
            onClick: () => this.props.onLogout?.(),
        });
    }

    public async unmount(): Promise<void> {
        await this.profileButton.unmount();
        await this.settingsButton.unmount();
        await this.logoutButton.unmount();
        await super.unmount();
    }

    private mountButton(slot: string, button: ButtonComponent): void {
        const container = this.element?.querySelector(`[data-slot="${slot}"]`) as HTMLElement | null;
        if (!container) return;
        container.innerHTML = "";
        const rendered = button.render();
        container.appendChild(rendered);
        button.mount(container).then();
    }
}
