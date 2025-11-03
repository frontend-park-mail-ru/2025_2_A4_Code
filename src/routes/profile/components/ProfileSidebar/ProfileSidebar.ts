import {Component} from '../../../../shared/base/Component';
import template from './ProfileSidebar.hbs';
import './ProfileSidebar.scss';
import {ProfileSidebarTabItem} from './components/ProfileSidebarTabItem';
import {ButtonComponent} from '../../../../shared/components/Button/Button';

type TabId = 'personal' | 'interface';

type Props = {
    name: string;
    email: string;
    avatarUrl?: string | null;
    onNavigateInbox?: () => void;
    activeTab?: TabId;
    onTabChange?: (tabId: TabId) => void;
};

const TABS = [
    {
        id: 'personal' as const,
        label: 'personal_text',
        icon: '/img/profile-sidebar-personal-logo.svg',
    },
    {
        id: 'interface' as const,
        label: 'interface_text',
        icon: '/img/profile-sidebar-interface-logo.svg',
    },
];

export class ProfileSidebarComponent extends Component<Props> {
    private readonly tabs = new Map<TabId, ProfileSidebarTabItem>();
    private readonly backButton: ButtonComponent;

    constructor(props: Props) {
        super({
            ...props,
            activeTab: props.activeTab ?? 'personal',
        });

        this.backButton = new ButtonComponent({
            label: 'back_text',
            variant: 'link',
            icon: '<img src="/img/arrow-left.svg" alt="" aria-hidden="true" />',
            onClick: () => this.props.onNavigateInbox?.(),
        });
    }

    protected renderTemplate(): string {
        const initials = this.props.name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

        return template({
            name: this.props.name,
            email: this.props.email,
            avatarUrl: this.props.avatarUrl ?? null,
            initials,
        });
    }

    protected afterRender(): void {
        const tabsRoot = this.element?.querySelector('[data-slot="tabs"]') as HTMLElement | null;
        if (tabsRoot) {
            tabsRoot.innerHTML = '';
            TABS.forEach((tab) => {
                const component = new ProfileSidebarTabItem({
                    id: tab.id,
                    label: tab.label,
                    icon: tab.icon,
                    active: this.props.activeTab === tab.id,
                    onSelect: (id) => this.handleTabSelect(id as TabId),
                });
                component.render();
                component.mount(tabsRoot).then();
                this.tabs.set(tab.id, component);
            });
        }

        const backSlot = this.element?.querySelector('[data-slot="back"]') as HTMLElement | null;
        if (backSlot) {
            this.backButton.render();
            this.backButton.mount(backSlot).then();
        }
    }

    public setProps(newProps: Partial<Props>): void {
        this.props = { ...this.props, ...newProps } as Props;
        const activeTab = this.props.activeTab ?? 'personal';
        this.tabs.forEach((component, id) => {
            component.setProps({ active: id === activeTab });
        });
    }

    public async unmount(): Promise<void> {
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
}
