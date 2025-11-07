import { Component } from "@shared/base/Component";
import template from "./ProfileSidebar.hbs";
import "./ProfileSidebar.scss";
import { ProfileSidebarTabItem } from "./components/ProfileSidebarTabItem";
import { ButtonComponent } from "@shared/components/Button/Button";
import { getInitials } from "@utils/person";
import { PROFILE_SIDEBAR_TEXTS } from "@pages/constants/texts";
import { getOnlineStatus, subscribeToOnlineStatus } from "@shared/utils/onlineStatus";
import { probeOnlineStatus } from "@shared/utils/networkProbe";

type TabId = "personal" | "interface";

type Props = {
    name: string;
    email: string;
    avatarUrl?: string | null;
    onNavigateInbox?: () => void;
    activeTab?: TabId;
    onTabChange?: (tabId: TabId) => void;
};

export class ProfileSidebarComponent extends Component<Props> {
    private readonly tabs = new Map<TabId, ProfileSidebarTabItem>();
    private readonly backButton: ButtonComponent;
    private isOnline: boolean = getOnlineStatus();
    private unsubscribeOnline?: () => void;

    constructor(props: Props) {
        super({
            ...props,
            activeTab: props.activeTab ?? "personal",
        });

        this.backButton = new ButtonComponent({
            label: PROFILE_SIDEBAR_TEXTS.backButtonLabel,
            variant: "link",
            icon: '<img src="/img/arrow-left.svg" alt="" aria-hidden="true" />',
            onClick: () => this.props.onNavigateInbox?.(),
        });
    }

    protected renderTemplate(): string {
        return template({
            name: this.props.name,
            email: this.props.email,
            avatarUrl: this.props.avatarUrl ?? null,
            initials: getInitials(this.props.name, "--"),
        });
    }

    protected afterRender(): void {
        this.unsubscribeOnline ??= subscribeToOnlineStatus((online) => {
            this.isOnline = online;
            this.updateTabAvailability();
            this.updateAvatar();
            this.requestConnectivityProbe();
        });
        const tabsRoot = this.element?.querySelector('[data-slot="tabs"]') as HTMLElement | null;
        if (tabsRoot) {
            tabsRoot.innerHTML = "";
            PROFILE_SIDEBAR_TEXTS.tabs.forEach((tab) => {
                const component = new ProfileSidebarTabItem({
                    id: tab.id as TabId,
                    label: tab.label,
                    icon: tab.icon,
                    active: this.props.activeTab === tab.id,
                    disabled: !this.isOnline,
                    onSelect: (id) => this.handleTabSelect(id as TabId),
                });
                component.render();
                component.mount(tabsRoot).then();
                this.tabs.set(tab.id as TabId, component);
            });
        }

        const backSlot = this.element?.querySelector('[data-slot="back"]') as HTMLElement | null;
        if (backSlot) {
            this.backButton.render();
            this.backButton.mount(backSlot).then();
        }

        this.updateAvatar();
        this.updateTabAvailability();
        this.requestConnectivityProbe();
    }

    public setProps(newProps: Partial<Props>): void {
        this.props = { ...this.props, ...newProps } as Props;

        const nameEl = this.element?.querySelector(".profile-sidebar__name") as HTMLElement | null;
        if (nameEl) {
            nameEl.textContent = this.props.name;
        }

        const emailEl = this.element?.querySelector(".profile-sidebar__email") as HTMLElement | null;
        if (emailEl) {
            emailEl.textContent = this.props.email;
        }

        this.updateAvatar();

        const activeTab = this.props.activeTab ?? "personal";
        this.tabs.forEach((component, id) => {
            component.setProps({ active: id === activeTab, disabled: !this.isOnline });
        });
    }

    public async unmount(): Promise<void> {
        this.unsubscribeOnline?.();
        this.unsubscribeOnline = undefined;
        for (const [, component] of this.tabs) {
            await component.unmount();
        }
        this.tabs.clear();
        await this.backButton.unmount();
        await super.unmount();
    }

    private handleTabSelect(tabId: TabId): void {
        if (this.props.activeTab === tabId) return;
        this.props.onTabChange ? this.props.onTabChange(tabId) : this.setProps({ activeTab: tabId });
    }

    private updateAvatar(): void {
        const avatarContainer = this.element?.querySelector(".profile-sidebar__avatar") as HTMLElement | null;
        if (!avatarContainer) return;

        const initials = getInitials(this.props.name, "--");
        const avatarUrl = this.isOnline ? this.props.avatarUrl ?? null : null;
        avatarContainer.innerHTML = "";

        if (avatarUrl) {
            const image = document.createElement("img");
            image.src = avatarUrl;
            image.alt = this.props.name;
            avatarContainer.appendChild(image);
        } else {
            const placeholder = document.createElement("span");
            placeholder.textContent = initials;
            avatarContainer.appendChild(placeholder);
        }
    }

    private updateTabAvailability(): void {
        const disabled = !this.isOnline;
        for (const tab of this.tabs.values()) {
            tab.setProps({ disabled });
        }
    }

    private requestConnectivityProbe(): void {
        void probeOnlineStatus().catch(() => undefined);
    }
}
