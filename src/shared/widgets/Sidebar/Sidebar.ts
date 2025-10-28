import {Component} from "../../base/Component";
import template from "./Sidebar.hbs";
import "./Sidebar.scss";
import {SidebarFolderItem, SidebarFolderItemProps} from "../../components/SidebarFolderItem/SidebarFolderItem";

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

const DEFAULT_FOLDERS: Folder[] = [
    { id: "inbox", name: "Входящие", count: 0, icon: "/img/folder-inbox.svg" },
    { id: "sent", name: "Отправленные", icon: "/img/folder-sent.svg" },
    { id: "drafts", name: "Черновики", icon: "/img/folder-drafts.svg" },
    { id: "spam", name: "Спам", icon: "/img/folder-spam.svg" },
    { id: "trash", name: "Корзина", icon: "img/folder-trash.svg" },
];

export class SidebarComponent extends Component<Props> {
    private composeHandler?: (event: Event) => void;
    private foldersRoot?: HTMLElement | null;
    private folderItems: Map<string, SidebarFolderItem> = new Map();

    constructor(props: Props = {}) {
        super({
            folders: props.folders ?? DEFAULT_FOLDERS,
            activeFolderId: props.activeFolderId ?? DEFAULT_FOLDERS[0].id,
            onCompose: props.onCompose,
            onFolderSelect: props.onFolderSelect,
        });
    }

    protected renderTemplate(): string {
        return template({});
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
            composeBtn.addEventListener('click', this.composeHandler);
        }

        this.renderFolders();
    }

    public setProps(newProps: Partial<Props>): void {
        this.props = { ...(this.props as Props), ...newProps };
        this.renderFolders();
    }

    private renderFolders(): void {
        if (!this.foldersRoot) return;

        const folders = this.props.folders ?? DEFAULT_FOLDERS;

        for (const [, item] of this.folderItems) {
            item.unmount().then();
        }
        this.folderItems.clear();
        this.foldersRoot.innerHTML = '';

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
            composeBtn.removeEventListener('click', this.composeHandler);
            this.composeHandler = undefined;
        }

        for (const [, item] of this.folderItems) {
            await item.unmount();
        }
        this.folderItems.clear();

        await super.unmount();
    }
}

