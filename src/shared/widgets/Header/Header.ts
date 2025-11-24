import { Component } from "@shared/base/Component";
import template from "./Header.hbs";
import "./Header.scss";
import { SearchInputComponent } from "@shared/components/SearchInput/SearchInput";
import { AvatarButtonComponent } from "@shared/components/AvatarButton/AvatarButton";
import { AvatarMenu } from "@shared/widgets/AvatarMenu/AvatarMenu";
import { Router, authManager } from "@infra";
import { redirectToAuth } from "@shared/utils/authRedirect";
import { performLogout } from "@features/auth";
import { apiService, HttpError } from "@shared/api/ApiService";
import {
    getCachedProfilePreview,
    loadProfilePreview,
    primeProfilePreview,
    type ProfilePreview,
} from "@features/profile";
import { getInitials } from "@utils/person";
import { HEADER_TEXTS } from "@shared/constants/texts";

type Props = {
    onSearch?: (query: string) => void;
    onProfile?: () => void;
    onSettings?: () => void;
    onLogout?: () => void;
    searchPlaceholder?: string;
    avatarLabel?: string;
    avatarImageUrl?: string | null;
    userName?: string;
    userEmail?: string;
    showSearch?: boolean;
};

type HeaderProfileState = ProfilePreview;

export class HeaderComponent extends Component<Props> {
    private readonly searchInput?: SearchInputComponent;
    private readonly avatarButton: AvatarButtonComponent;
    private readonly avatarMenu: AvatarMenu;
    private menuElement?: HTMLElement | null;
    private avatarButtonElement?: HTMLElement | null;
    private showSearch: boolean;
    private readonly router = Router.getInstance();
    private hasRequestedProfile = false;

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

        this.showSearch = props.showSearch ?? true;
        if (this.showSearch) {
            this.searchInput = new SearchInputComponent({
                placeholder: props.searchPlaceholder ?? HEADER_TEXTS.defaultSearchPlaceholder,
                debounce: 300,
                onInput: (value) => this.props.onSearch?.(value),
            });
        }

        this.avatarButton = new AvatarButtonComponent({
            label: props.avatarLabel ?? HEADER_TEXTS.defaultAvatarLabel,
            imageUrl: props.avatarImageUrl ?? null,
            onClick: (event) => this.toggleMenu(event),
        });

        this.avatarMenu = new AvatarMenu({
            onProfile: () =>
                this.handleMenuSelect(() => {
                    this.router.navigate("/profile");
                    this.props.onProfile?.();
                }),
            onSettings: () => this.handleMenuSelect(this.props.onSettings),
            onLogout: () => this.handleMenuSelect(() => this.handleLogout()),
        });

        const profileInfo = this.extractProfileInfo();
        if (profileInfo) {
            primeProfilePreview(profileInfo);
            this.hasRequestedProfile = true;
        }

        this.ensureProfileInfo();
    }

    protected renderTemplate(): string {
        return template({});
    }

    protected afterRender(): void {
        const element = this.element!;

        const searchSlot = element.querySelector('[data-slot="search"]') as HTMLElement | null;
        if (searchSlot) {
            searchSlot.innerHTML = "";
            if (this.showSearch && this.searchInput) {
                this.searchInput.unmount().then();
                const searchEl = this.searchInput.render();
                searchSlot.appendChild(searchEl);
                this.searchInput.mount(searchSlot).then();
            }
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

        this.ensureProfileInfo();
    }

    public setProps(newProps: Partial<Props>): void {
        this.props = { ...this.props, ...newProps };
        if (typeof newProps.showSearch !== "undefined") {
            this.showSearch = newProps.showSearch;
        }

        this.searchInput?.setProps({
            placeholder: this.props.searchPlaceholder ?? HEADER_TEXTS.defaultSearchPlaceholder,
            onInput: (value) => this.props.onSearch?.(value),
        });

        this.avatarButton.setProps({
            label: this.props.avatarLabel ?? HEADER_TEXTS.defaultAvatarLabel,
            imageUrl: this.props.avatarImageUrl ?? null,
            onClick: (event) => this.toggleMenu(event),
        });

        this.avatarMenu.setProps({
            onProfile: () =>
                this.handleMenuSelect(() => {
                    this.router.navigate("/profile");
                    this.props.onProfile?.();
                }),
            onSettings: () => this.handleMenuSelect(this.props.onSettings),
            onLogout: () => this.handleMenuSelect(() => this.handleLogout()),
        });

        const profileInfo = this.extractProfileInfo();
        if (profileInfo) {
            primeProfilePreview(profileInfo);
            this.hasRequestedProfile = true;
        }

        this.ensureProfileInfo();
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

    private handleMenuSelect(callback?: () => void | Promise<void>, forceAuthRedirect = false): void {
        this.closeMenu();
        const run = async () => {
            try {
                await callback?.();
            } catch (err) {
                console.error("Header action failed", err);
            } finally {
                if (forceAuthRedirect) {
                    await this.forceAuthRedirect("manual-logout");
                } else {
                    this.ensureLoggedOutRedirect();
                }
            }
        };
        void run();
    }

    private ensureLoggedOutRedirect(): void {
        if (authManager.getStatus() === "unauthenticated") {
            void this.forceAuthRedirect("status-change");
        }
    }

    private async handleLogout(): Promise<void> {
        console.info("[auth] header logout requested");
        try {
            await performLogout();
        } catch (error) {
            console.error("[auth] header logout failed", error);
        } finally {
            authManager.setAuthenticated(false);
            await this.verifyLoggedOutAndRedirect();
        }
    }

    private async verifyLoggedOutAndRedirect(): Promise<void> {
        const target = new URL("/auth", window.location.origin).toString();
        try {
            console.info("[auth] header post-logout profile probe");
            await apiService.request("/user/profile", { parseJson: false, skipAuthRefresh: true });
            console.warn("[auth] post-logout profile request succeeded (session may still be active)");
        } catch (error) {
            if (error instanceof HttpError) {
                console.info("[auth] post-logout profile request failed as expected", { status: error.status });
            } else {
                console.info("[auth] post-logout profile request failed as expected", { error });
            }
        } finally {
            redirectToAuth(this.router, "header-logout", { forceReload: true });
            window.setTimeout(() => window.location.replace(target), 0);
            window.setTimeout(() => {
                if (window.location.href !== target) {
                    window.location.href = target;
                }
            }, 50);
        }
    }

    private async forceAuthRedirect(reason: Parameters<typeof redirectToAuth>[1] = "unknown"): Promise<void> {
        redirectToAuth(this.router, reason);
    }

    public async unmount(): Promise<void> {
        document.removeEventListener("pointerdown", this.outsideClickHandler);
        await this.searchInput?.unmount();
        await this.avatarButton.unmount();
        await this.avatarMenu.unmount();
        await super.unmount();
    }

    private async ensureProfileInfo(): Promise<void> {
        if (!this.element) {
            return;
        }

        const cached = getCachedProfilePreview();
        if (cached) {
            if (!this.hasRequestedProfile) {
                this.applyProfilePreview(cached);
                this.hasRequestedProfile = true;
            }
            return;
        }

        try {
            this.hasRequestedProfile = true;
            const info = await loadProfilePreview();
            this.applyProfilePreview(info);
        } catch (error) {
            this.hasRequestedProfile = false;
            console.error("Failed to load profile data for header", error);
        }
    }

    private applyProfilePreview(preview: ProfilePreview): void {
        this.setProps({
            avatarImageUrl: preview.avatarUrl,
            avatarLabel: preview.initials,
            userName: preview.fullName,
            userEmail: preview.email,
        });
    }

    private extractProfileInfo(): HeaderProfileState | null {
        const fullName = (this.props.userName ?? "").trim();
        const email = (this.props.userEmail ?? "").trim();
        const avatarUrl = this.props.avatarImageUrl ?? null;

        if (!fullName && !email && !avatarUrl) {
            return null;
        }

        const initials =
            (this.props.avatarLabel ?? "").trim() || (fullName ? getInitials(fullName) : "--");

        return {
            avatarUrl,
            initials,
            fullName: fullName || initials,
            email,
        };
    }

}
