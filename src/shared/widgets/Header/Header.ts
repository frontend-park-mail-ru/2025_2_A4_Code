import {Component} from "../../base/Component";
import template from "./Header.hbs";
import "./Header.scss";
import {SearchInputComponent} from "../../components/SearchInput/SearchInput";
import {AvatarButtonComponent} from "../../components/AvatarButton/AvatarButton";

type Props = {
    onSearch?: (query: string) => void;
    onProfile?: () => void;
    onSettings?: () => void;
    onLogout?: () => void;
    searchPlaceholder?: string;
    avatarLabel?: string;
    avatarImageUrl?: string | null;
};

export class HeaderComponent extends Component<Props> {
    private readonly searchInput: SearchInputComponent;
    private readonly avatarButton: AvatarButtonComponent;
    private menuElement?: HTMLElement | null;
    private outsideClickHandler = (event: MouseEvent) => {
        const element = this.element;
        if (!element) return;
        if (!element.contains(event.target as Node)) {
            this.closeMenu();
        }
    };

    constructor(props: Props = {}) {
        super(props);

        this.searchInput = new SearchInputComponent({
            placeholder: props.searchPlaceholder ?? "Поиск",
            debounce: 300,
            onInput: (value) => this.props.onSearch?.(value),
        });

        this.avatarButton = new AvatarButtonComponent({
            label: props.avatarLabel ?? "TS",
            imageUrl: props.avatarImageUrl ?? null,
            onClick: (event) => this.toggleMenu(event),
        });
    }

    protected renderTemplate(): string {
        return template({});
    }

    protected afterRender(): void {
        const element = this.element!;

        const searchSlot = element.querySelector('[data-slot="search"]') as HTMLElement | null;
        if (searchSlot) {
            this.searchInput.unmount().then();
            const searchEl = this.searchInput.render();
            searchSlot.innerHTML = '';
            searchSlot.appendChild(searchEl);
            this.searchInput.mount(searchSlot).then();
        }

        const avatarSlot = element.querySelector('[data-slot="avatar"]') as HTMLElement | null;
        if (avatarSlot) {
            this.avatarButton.unmount().then();
            const avatarEl = this.avatarButton.render();
            avatarSlot.innerHTML = '';
            avatarSlot.appendChild(avatarEl);
            this.avatarButton.mount(avatarSlot).then();
        }

        this.menuElement = element.querySelector('.header__avatar-menu') as HTMLElement | null;

        const profileBtn = element.querySelector('[data-avatar-profile]') as HTMLElement | null;
        const settingsBtn = element.querySelector('[data-avatar-settings]') as HTMLElement | null;
        const logoutBtn = element.querySelector('[data-avatar-logout]') as HTMLElement | null;

        const handleMenuClick = (callback?: () => void) => (event: Event) => {
            event.stopPropagation();
            this.closeMenu();
            callback?.();
        };

        profileBtn?.addEventListener('click', handleMenuClick(this.props.onProfile));
        settingsBtn?.addEventListener('click', handleMenuClick(this.props.onSettings));
        logoutBtn?.addEventListener('click', handleMenuClick(this.props.onLogout));
    }

    public setProps(newProps: Partial<Props>): void {
        this.props = { ...this.props, ...newProps };

        this.searchInput.setProps({
            placeholder: this.props.searchPlaceholder ?? "Поиск",
            onInput: (value) => this.props.onSearch?.(value),
        });

        this.avatarButton.setProps({
            label: this.props.avatarLabel ?? "TS",
            imageUrl: this.props.avatarImageUrl ?? null,
            onClick: (event) => this.toggleMenu(event),
        });
    }

    private toggleMenu(event: MouseEvent): void {
        event.stopPropagation();
        if (!this.menuElement) return;
        const isOpen = this.menuElement.classList.toggle('open');
        if (isOpen) {
            document.addEventListener('click', this.outsideClickHandler);
        } else {
            document.removeEventListener('click', this.outsideClickHandler);
        }
    }

    private closeMenu(): void {
        if (!this.menuElement) return;
        if (this.menuElement.classList.contains('open')) {
            this.menuElement.classList.remove('open');
            document.removeEventListener('click', this.outsideClickHandler);
        }
    }

    public async unmount(): Promise<void> {
        document.removeEventListener('click', this.outsideClickHandler);
        await this.searchInput.unmount();
        await this.avatarButton.unmount();
        await super.unmount();
    }
}
