import { Component } from "@shared/base/Component";
import template from "./Sidebar.hbs";
import "./Sidebar.scss";
import {
    SidebarFolderItem,
    type SidebarFolderItemProps,
} from "@shared/components/SidebarFolderItem/SidebarFolderItem";
import { SIDEBAR_TEXTS } from "@shared/constants/texts";

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
};

export class SidebarComponent extends Component<Props> {
    private composeHandler?: (event: Event) => void;
    private foldersRoot?: HTMLElement | null;
    private folderItems: Map<string, SidebarFolderItem> = new Map();

    constructor(props: Props = {}) {
        super({
            folders: props.folders ?? SIDEBAR_TEXTS.defaultFolders,
            activeFolderId: props.activeFolderId ?? SIDEBAR_TEXTS.defaultFolders[0].id,
            onCompose: props.onCompose,
            onFolderSelect: props.onFolderSelect,
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
        this.foldersRoot = element.querySelector('[data-slot="folders"]') as HTMLElement | null;

        if (composeBtn) {
            this.composeHandler = (event: Event) => {
                event.preventDefault();
                this.props.onCompose?.();
            };
            composeBtn.addEventListener("click", this.composeHandler);
        }

        this.renderFolders();
    }

    public setProps(newProps: Partial<Props>): void {
        this.props = { ...(this.props as Props), ...newProps };
        this.renderFolders();
    }

    private renderFolders(): void {
        if (!this.foldersRoot) return;

        const folders = this.props.folders ?? SIDEBAR_TEXTS.defaultFolders;

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

        if (composeBtn && this.composeHandler) {
            composeBtn.removeEventListener("click", this.composeHandler);
            this.composeHandler = undefined;
        }

        for (const [, item] of this.folderItems) {
            await item.unmount();
        }
        this.folderItems.clear();

        await super.unmount();
    }
}
