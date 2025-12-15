import { Component } from "@shared/base/Component";
import template from "./Header.hbs";
import "./Header.scss";
import { AvatarButtonComponent } from "@shared/components/AvatarButton/AvatarButton";
import { AvatarMenu } from "@shared/widgets/AvatarMenu/AvatarMenu";
import { HEADER_TEXTS } from "@shared/constants/texts";

type Props = {
    onSettings?: () => void;
    onLogout?: () => void;
    onMenuToggle?: () => void;
    avatarLabel?: string;
    avatarImageUrl?: string | null;
    userName?: string;
    userEmail?: string;
    onLogoClick?: () => void;
};

export class HeaderComponent extends Component<Props> {
    private readonly avatarButton: AvatarButtonComponent;
    private readonly avatarMenu: AvatarMenu;
    private menuElement?: HTMLElement | null;
    private avatarButtonElement?: HTMLElement | null;
    private logoElement?: HTMLElement | null;
    private menuButton?: HTMLElement | null;

    private outsideClickHandler = (event: MouseEvent) => {
        const target = event.target as Node | null;
        if (!this.menuElement) return;
        const clickedInsideMenu = target ? this.menuElement.contains(target) : false;
        const clickedAvatarButton =
            target && this.avatarButtonElement ? this.avatarButtonElement.contains(target) : false;
        if (!clickedInsideMenu && !clickedAvatarButton) {
            this.closeMenu();
        }
    };

    constructor(props: Props = {}) {
        super(props);

        this.avatarButton = new AvatarButtonComponent({
            label: props.avatarLabel ?? HEADER_TEXTS.defaultAvatarLabel,
            imageUrl: props.avatarImageUrl ?? null,
            onClick: (event) => this.toggleMenu(event),
        });

        this.avatarMenu = new AvatarMenu({
            onSettings: () =>
                this.handleMenuSelect(async () => {
                    await this.props.onSettings?.();
                }),
            onLogout: () =>
                this.handleMenuSelect(async () => {
                    await this.props.onLogout?.();
                }),
        });
    }

    protected renderTemplate(): string {
        return template({});
    }

    protected afterRender(): void {
        const element = this.element!;

        const logo = element.querySelector("[data-logo]") as HTMLElement | null;
        if (logo) {
            this.logoElement = logo;
            this.logoElement.onclick = (event) => {
                event.preventDefault();
                this.props.onLogoClick?.();
            };
        }

        const avatarSlot = element.querySelector('[data-slot="avatar"]') as HTMLElement | null;
        if (avatarSlot) {
            this.avatarButton.unmount().then();
            const avatarEl = this.avatarButton.render();
            avatarSlot.innerHTML = "";
            avatarSlot.appendChild(avatarEl);
            this.avatarButton.mount(avatarSlot).then();
            this.avatarButtonElement = avatarSlot.querySelector("[data-avatar-button]") as HTMLElement | null;
        }

        const menuSlot = element.querySelector('[data-slot="menu"]') as HTMLElement | null;
        if (menuSlot) {
            const menuEl = this.avatarMenu.render();
            menuSlot.innerHTML = "";
            menuSlot.appendChild(menuEl);
            this.avatarMenu.mount(menuSlot).then();
            this.menuElement = menuSlot;
            this.menuElement.setAttribute("aria-hidden", "true");
            this.menuElement.style.display = "none";
        }

        const menuBtn = element.querySelector("[data-menu]") as HTMLElement | null;
        if (menuBtn) {
            this.menuButton = menuBtn;
            this.menuButton.onclick = () => this.props.onMenuToggle?.();
        }
    }

    public setProps(newProps: Partial<Props>): void {
        this.props = { ...this.props, ...newProps };

        this.avatarButton.setProps({
            label: this.props.avatarLabel ?? HEADER_TEXTS.defaultAvatarLabel,
            imageUrl: this.props.avatarImageUrl ?? null,
            onClick: (event) => this.toggleMenu(event),
        });

        this.menuButton = this.element?.querySelector("[data-menu]") as HTMLElement | null;
        if (this.menuButton) {
            this.menuButton.onclick = () => this.props.onMenuToggle?.();
        }

        this.avatarMenu.setProps({
            onSettings: () =>
                this.handleMenuSelect(async () => {
                    await this.props.onSettings?.();
                }),
            onLogout: () =>
                this.handleMenuSelect(async () => {
                    await this.props.onLogout?.();
                }),
        });
    }

    private toggleMenu(event: MouseEvent): void {
        event.stopPropagation();
        if (!this.menuElement) return;
        const isOpen = !this.menuElement.classList.contains("open");
        this.menuElement.classList.toggle("open", isOpen);
        this.menuElement.setAttribute("aria-hidden", isOpen ? "false" : "true");
        this.menuElement.style.display = isOpen ? "block" : "none";

        if (isOpen) {
            document.addEventListener("pointerdown", this.outsideClickHandler);
        } else {
            document.removeEventListener("pointerdown", this.outsideClickHandler);
        }
    }

    private closeMenu(): void {
        if (!this.menuElement) return;
        if (this.menuElement.classList.contains("open")) {
            this.menuElement.classList.remove("open");
            this.menuElement.setAttribute("aria-hidden", "true");
            this.menuElement.style.display = "none";
            const active = document.activeElement as HTMLElement | null;
            if (active && this.menuElement.contains(active) && typeof active.blur === "function") {
                active.blur();
            }
            document.removeEventListener("pointerdown", this.outsideClickHandler);
        }
    }

    private handleMenuSelect(callback?: () => void | Promise<void>): void {
        this.closeMenu();
        const run = async () => {
            try {
                await callback?.();
            } catch (err) {
                console.error("Header action failed", err);
            }
        };
        void run();
    }

    public async unmount(): Promise<void> {
        document.removeEventListener("pointerdown", this.outsideClickHandler);
        if (this.logoElement) {
            this.logoElement.onclick = null;
            this.logoElement = null;
        }
        if (this.menuButton) {
            this.menuButton.onclick = null;
            this.menuButton = null;
        }
        await this.avatarButton.unmount();
        await this.avatarMenu.unmount();
        await super.unmount();
    }
}
