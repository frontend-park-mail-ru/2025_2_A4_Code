import { Component } from "@shared/base/Component";
import template from "./Sidebar.hbs";
import "./Sidebar.scss";
import {
    SidebarFolderItem,
    type SidebarFolderItemProps,
} from "@shared/components/SidebarFolderItem/SidebarFolderItem";
import { SIDEBAR_TEXTS } from "@shared/constants/texts";
import { getOnlineStatus, subscribeToOnlineStatus } from "@shared/utils/onlineStatus";
import { probeOnlineStatus } from "@shared/utils/networkProbe";

export type Folder = {
    id: string;
    name: string;
    count?: number;
    icon?: string;
};

type Props = {
    folders?: Folder[];
    activeFolderId?: string;
    onCompose?: () => void;
    onFolderSelect?: (folderId: string) => void;
    onCreateFolder?: () => void;
};

export class SidebarComponent extends Component<Props> {
    private composeHandler?: (event: Event) => void;
    private createFolderHandler?: (event: Event) => void;
    private foldersRoot?: HTMLElement | null;
    private folderItems: Map<string, SidebarFolderItem> = new Map();
    private composeButton?: HTMLElement | null;
    private createFolderButton?: HTMLElement | null;
    private adContainer?: HTMLElement | null;
    private isOnline: boolean = getOnlineStatus();
    private unsubscribeOnline?: () => void;

    constructor(props: Props = {}) {
        super({
            folders: props.folders ?? [],
            activeFolderId: props.activeFolderId ?? SIDEBAR_TEXTS.defaultFolders[0].id,
            onCompose: props.onCompose,
            onFolderSelect: props.onFolderSelect,
            onCreateFolder: props.onCreateFolder,
        });
    }

    protected renderTemplate(): string {
        return template({
            composeButtonText: SIDEBAR_TEXTS.composeButton,
        });
    }

    protected afterRender(): void {
        const element = this.element!;
        const composeBtn = element.querySelector('[data-compose]') as HTMLElement | null;
        const createFolderBtn = element.querySelector('[data-create-folder]') as HTMLElement | null;
        this.adContainer = element.querySelector("[data-ad-slot]") as HTMLElement | null;
        this.foldersRoot = element.querySelector('[data-slot="folders"]') as HTMLElement | null;
        this.composeButton = composeBtn;
        this.createFolderButton = createFolderBtn;

        if (composeBtn) {
            this.composeHandler = (event: Event) => {
                event.preventDefault();
                if (!this.isOnline) {
                    return;
                }
                this.props.onCompose?.();
            };
            composeBtn.addEventListener("click", this.composeHandler);
            this.updateComposeAvailability();
            this.requestConnectivityProbe();
        }

        if (createFolderBtn) {
            this.createFolderHandler = (event: Event) => {
                event.preventDefault();
                if (!this.isOnline) {
                    return;
                }
                this.props.onCreateFolder?.();
            };
            createFolderBtn.addEventListener("click", this.createFolderHandler);
            this.updateCreateFolderAvailability();
        }

        if (!this.unsubscribeOnline) {
            this.unsubscribeOnline = subscribeToOnlineStatus((online) => {
                this.isOnline = online;
                this.updateComposeAvailability();
                this.updateCreateFolderAvailability();
            });
        }

        this.renderAdSlot();
        this.renderFolders();
    }

    public setProps(newProps: Partial<Props>): void {
        this.props = { ...(this.props as Props), ...newProps };
        this.renderFolders();
    }

    private renderFolders(): void {
        if (!this.foldersRoot) return;

        const folders = this.props.folders ?? [];

        for (const [, item] of this.folderItems) {
            item.unmount().then();
        }
        this.folderItems.clear();
        this.foldersRoot.innerHTML = "";

        folders.forEach((folder) => {
            const itemProps: SidebarFolderItemProps = {
                ...folder,
                active: folder.id === this.props.activeFolderId,
                onSelect: (id) => {
                    this.props.onFolderSelect?.(id);
                },
            };
            const itemComponent = new SidebarFolderItem(itemProps);
            itemComponent.render();
            itemComponent.mount(this.foldersRoot!).then();
            this.folderItems.set(folder.id, itemComponent);
        });
    }

    public async unmount(): Promise<void> {
        const element = this.element;
        const composeBtn = element?.querySelector('[data-compose]') as HTMLElement | null;
        const createFolderBtn = element?.querySelector('[data-create-folder]') as HTMLElement | null;

        if (composeBtn && this.composeHandler) {
            composeBtn.removeEventListener("click", this.composeHandler);
            this.composeHandler = undefined;
        }

        if (createFolderBtn && this.createFolderHandler) {
            createFolderBtn.removeEventListener("click", this.createFolderHandler);
            this.createFolderHandler = undefined;
        }

        this.unsubscribeOnline?.();
        this.unsubscribeOnline = undefined;

        for (const [, item] of this.folderItems) {
            await item.unmount();
        }
        this.folderItems.clear();

        if (this.adContainer) {
            this.adContainer.innerHTML = "";
        }

        await super.unmount();
    }

    private renderAdSlot(): void {
        if (!this.adContainer) return;
        const adHtml =
            (window as any).__AD_SLOT__ ??
            document.documentElement.getAttribute("data-ad-slot") ??
            "";
        if (typeof adHtml === "string" && adHtml.trim().length > 0) {
            this.adContainer.innerHTML = adHtml;
            this.adContainer.style.display = "block";
        } else {
            this.adContainer.innerHTML = "";
            this.adContainer.style.display = "none";
        }
    }

    private updateComposeAvailability(): void {
        if (!this.composeButton) {
            return;
        }

        const button = this.composeButton as HTMLButtonElement;
        button.disabled = !this.isOnline;
        button.setAttribute("aria-disabled", this.isOnline ? "false" : "true");
        button.tabIndex = this.isOnline ? 0 : -1;
    }

    private updateCreateFolderAvailability(): void {
        if (!this.createFolderButton) {
            return;
        }

        const button = this.createFolderButton as HTMLButtonElement;
        button.disabled = !this.isOnline;
        button.setAttribute("aria-disabled", this.isOnline ? "false" : "true");
        button.tabIndex = this.isOnline ? 0 : -1;
    }

    private requestConnectivityProbe(): void {
        void probeOnlineStatus().catch(() => undefined);
    }
}
