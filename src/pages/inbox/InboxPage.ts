import { HeaderComponent } from "@shared/widgets/Header/Header";
import { Component } from "@shared/base/Component";
import { SidebarComponent } from "@shared/widgets/Sidebar/Sidebar";
import { MailListComponent } from "@shared/widgets/MailList/MailList";
import { MailViewComponent } from "./components/MailView/MailView";
import { ComposeModal } from "./components/ComposeModal/ComposeModal";
import { CreateFolderModal } from "./components/CreateFolderModal/CreateFolderModal";
import { MainLayout } from "@app/components/MainLayout/MainLayout";
import { performLogout } from "@features/auth";
import { Router, authManager } from "@infra";
import template from "./views/InboxPage.hbs";
import { InboxStore, InboxState, buildForwardDraft, buildReplyDraft } from "@features/inbox";
import type { ComposeDraft } from "@features/inbox";
import { LayoutLoadingManager } from "@shared/utils/LayoutLoadingManager";
import type { MailDetail } from "@app-types/mail";
import { OfflinePlaceholderComponent } from "@shared/components/OfflinePlaceholder/OfflinePlaceholder";
import { INBOX_PAGE_TEXTS } from "@pages/constants/texts";
import { HttpError } from "@shared/api/ApiService";

type InboxPageParams = {
    messageId?: string;
    folderId?: string;
};

type ComposePayload = { to: string; subject: string; body: string };

export class InboxPage extends Component {
    private readonly router = Router.getInstance();
    private readonly layout = new MainLayout();
    private readonly store = new InboxStore();
    private readonly loadingManager = new LayoutLoadingManager(() => this.layout);

    private readonly header: HeaderComponent;
    private readonly sidebar: SidebarComponent;
    private readonly mailList: MailListComponent;

    private mailView: MailViewComponent | null = null;
    private composeModal: ComposeModal | null = null;
    private createFolderModal: CreateFolderModal | null = null;
    private showingList = true;
    private lastRenderedMail: MailDetail | null = null;
    private unsubscribeFromStore?: () => void;
    private lastErrorMessage: string | null = null;
    private initialMessageId?: string;
    private initialFolderId: string = "inbox";
    private offlinePlaceholder: OfflinePlaceholderComponent | null = null;
    private showingOfflinePlaceholder = false;

    constructor(params: InboxPageParams = {}) {
        super();
        this.initialMessageId = params.messageId;
        this.initialFolderId = params.folderId || "inbox";

        this.header = new HeaderComponent({
            onSearch: (query) => console.log("search", query),
            onLogout: () => this.handleLogout(),
        });

        this.sidebar = new SidebarComponent({
            onCompose: () => this.openCompose(),
            onCreateFolder: () => this.openCreateFolderModal(),
            onFolderSelect: (id) => this.handleFolderSelect(id),
        });

        this.mailList = new MailListComponent({
            items: [],
            onOpen: (id) => this.handleOpenMail(id),
            emptyMessage: INBOX_PAGE_TEXTS.emptyList,
        });
    }

    protected renderTemplate(): string {
        return template.toString();
    }

    public render(): HTMLElement {
        const element = this.layout.render(this.getSlotContent());
        this.element = this.layout.getElement();
        return element;
    }

    public async mount(rootElement?: HTMLElement): Promise<void> {
        if (!this.element) {
            this.render();
        }
        await this.layout.mount(rootElement);
        this.element = this.layout.getElement();
    }

    public async init(): Promise<void> {
        this.layout.setContentBackground(true);
        this.layout.setSidebarWidth(null);

        this.unsubscribeFromStore = this.store.subscribe((state) => this.applyState(state));

        try {
            await this.store.loadFolders();
            await this.store.loadFolder(this.initialFolderId);
            if (this.initialMessageId) {
                await this.store.openMail(this.initialMessageId);
            }
        } catch (error) {
            if (this.handleUnauthorized(error)) {
                return;
            }
            console.error("Failed to initialise inbox", error);
        }
    }

    public async update(params: Record<string, string>): Promise<void> {
        const messageId = params.messageId;
        const folderFromUrl = params.folder || "inbox";
        if (folderFromUrl !== this.store.getState().activeFolderId) {
            await this.store.loadFolder(folderFromUrl);
        }
        const { selectedMailId, selectedMail } = this.store.getState();

        if (messageId) {
            if (selectedMailId !== messageId || !selectedMail) {
                try {
                    await this.store.openMail(messageId);
                } catch (error) {
                    if (this.handleUnauthorized(error)) {
                        return;
                    }
                    console.error("Failed to open message", error);
                }
            }
            return;
        }

        if (selectedMailId) {
            this.store.clearSelection();
        }
    }

    public async unmount(): Promise<void> {
        this.unsubscribeFromStore?.();
        this.unsubscribeFromStore = undefined;
        this.loadingManager.reset();
        this.composeModal = null;
        this.createFolderModal = null;
        this.lastRenderedMail = null;
        this.showingList = true;
        this.lastErrorMessage = null;
        await this.layout.unmount();
        this.element = null;
    }

    private getSlotContent(): { [slotName: string]: HTMLElement | Component } {
        return {
            header: this.header,
            sidebar: this.sidebar,
            main: this.mailList,
        };
    }

    private applyState(state: InboxState): void {
        const isBusy = state.loadingList || state.loadingSelection || state.mutating;
        this.loadingManager.setBusy(isBusy);

        if (state.error && state.error !== this.lastErrorMessage) {
            this.lastErrorMessage = state.error;
            console.error(state.error);
        } else if (!state.error) {
            this.lastErrorMessage = null;
        }

        if (state.offlineSelectionFallback && state.selectedMailId) {
            this.renderOfflinePlaceholder();
            return;
        }

        if (this.showingOfflinePlaceholder && !state.offlineSelectionFallback) {
            this.showingOfflinePlaceholder = false;
            this.offlinePlaceholder = null;
        }

        this.mailList.setProps({ items: state.mails });
        this.sidebar.setProps({
            folders: state.folders,
            activeFolderId: state.activeFolderId,
        });

        if (state.selectedMail && state.selectedMailId) {
            if (this.showingList || this.lastRenderedMail !== state.selectedMail) {
                this.renderMailView(state.selectedMail);
            }
            return;
        }

        if (!this.showingList && !state.loadingSelection) {
            this.showingList = true;
            this.mailView = null;
            this.lastRenderedMail = null;
            this.updateSlot("main", this.mailList).then();
        }
    }

    private openCreateFolderModal(): void {
        const modal = new CreateFolderModal({
            onClose: () => this.closeModal(),
            onSave: (name) => this.handleCreateFolder(name),
        });
        this.createFolderModal = modal;
        this.composeModal = null;
        this.updateSlot("modal", modal).then();
    }

    private handleFolderSelect(folderId: string): void {
        this.store.clearSelection();
        this.store.loadFolder(folderId).catch((error) => {
            if (this.handleUnauthorized(error)) {
                return;
            }
            console.error("Failed to load folder", error);
        });
        const path = folderId === "inbox" ? "/mail" : `/mail/${encodeURIComponent(folderId)}`;
        this.router.navigate(path).then();
    }

    private renderMailView(mail: MailDetail): void {
        this.mailView = this.createMailView(mail);
        this.mailView.refreshOnlineState();
        this.lastRenderedMail = mail;
        this.showingList = false;
        this.showingOfflinePlaceholder = false;
        this.offlinePlaceholder = null;
        this.updateSlot("main", this.mailView).then();
    }

    private renderOfflinePlaceholder(): void {
        if (!this.offlinePlaceholder) {
            this.offlinePlaceholder = new OfflinePlaceholderComponent({
                title: INBOX_PAGE_TEXTS.offlineMailTitle,
                message: INBOX_PAGE_TEXTS.offlineMailMessage,
                actionLabel: INBOX_PAGE_TEXTS.offlineBackAction,
                onAction: () => this.handleBackToList(),
            });
        }

        this.showingList = false;
        this.showingOfflinePlaceholder = true;
        this.mailView = null;
        this.lastRenderedMail = null;
        this.updateSlot("main", this.offlinePlaceholder!).then();
    }

    private createMailView(mail: MailDetail): MailViewComponent {
        return new MailViewComponent({
            id: mail.id,
            from: mail.from,
            subject: mail.subject,
            time: mail.time,
            body: mail.body,
            avatarUrl: mail.avatarUrl ?? null,
            fromEmail: mail.fromEmail ?? mail.from,
            onBack: () => this.handleBackToList(),
            onReply: () => this.handleReply(mail),
            onForward: () => this.handleForward(mail),
        });
    }

    private handleOpenMail(id: string): void {
        const { selectedMailId, activeFolderId } = this.store.getState();
        if (selectedMailId === id && !this.showingList) {
            return;
        }
        const folder = activeFolderId || "inbox";
        const path = `/mail/${encodeURIComponent(folder)}/${encodeURIComponent(id)}`;
        this.router.navigate(path).then();
    }

    private handleBackToList(): void {
        const { activeFolderId } = this.store.getState();
        const folder = activeFolderId || "inbox";
        this.store.clearSelection();
        const path = folder === "inbox" ? "/mail" : `/mail/${encodeURIComponent(folder)}`;
        this.router.navigate(path).then();
    }

    private handleReply(mail: MailDetail): void {
        const draft = buildReplyDraft(mail);
        this.openCompose(draft, (data) => this.handleReplySubmit(mail, data));
    }

    private handleForward(mail: MailDetail): void {
        const draft = buildForwardDraft(mail);
        this.openCompose(draft, (data) => this.handleForwardSubmit(data));
    }

    private openCompose(draft: ComposeDraft = {}, submit?: (data: ComposePayload) => Promise<void>): void {
        this.createFolderModal = null;
        const modal = new ComposeModal({
            initialTo: draft.initialTo,
            initialSubject: draft.initialSubject,
            initialBody: draft.initialBody,
            focusField: draft.focusField,
            onClose: () => this.closeModal(),
            onSend: (payload) => {
                const handler = submit ?? ((data: ComposePayload) => this.handleSendMail(data));
                this.handleComposeSubmit(handler, payload);
            },
        });

        this.composeModal = modal;
        this.updateSlot("modal", modal).then();
    }

    private closeModal(): void {
        this.composeModal = null;
        this.createFolderModal = null;
        const empty = document.createElement("div");
        this.updateSlot("modal", empty).then();
    }

    private handleComposeSubmit(
        submit: (data: ComposePayload) => Promise<void>,
        data: ComposePayload
    ): void {
        submit(data)
            .then(() => this.closeModal())
            .then(() => this.closeModal())
            .catch((error) => {
                console.error("Failed to send message", error);
            });
    }

    private async handleSendMail(data: ComposePayload): Promise<void> {
        const recipient = data.to.trim();
        if (!recipient) {
            console.warn(INBOX_PAGE_TEXTS.recipientRequired);
            return;
        }

        try {
            await this.store.sendMail({
                to: recipient,
                subject: data.subject ?? "",
                body: data.body ?? "",
            });
        } catch (error) {
            if (this.handleUnauthorized(error)) {
                throw error;
            }
            throw error;
        }

        this.store.clearSelection();
        this.router.navigate("/mail").then();
    }

    private async handleReplySubmit(mail: MailDetail, data: ComposePayload): Promise<void> {
        const recipient = data.to.trim();
        if (!recipient) {
            console.warn(INBOX_PAGE_TEXTS.recipientRequired);
            return;
        }

        const rootMessageId = this.parseNumericId(mail.id);
        if (rootMessageId === null) {
            console.error("Unable to determine message id for reply");
            return;
        }

        const threadRoot = this.parseNumericId(mail.threadId) ?? rootMessageId;

        try {
            await this.store.replyToMail({
                to: recipient,
                subject: data.subject ?? "",
                body: data.body ?? "",
                rootMessageId,
                threadRoot,
            });
        } catch (error) {
            if (this.handleUnauthorized(error)) {
                throw error;
            }
            throw error;
        }

        await this.store.refreshSelectedMail();
    }

    private async handleCreateFolder(name: string): Promise<void> {
        try {
            const folder = await this.store.createFolder(name);
            const path = folder.id === "inbox" ? "/mail" : `/mail/${encodeURIComponent(folder.id)}`;
            this.router.navigate(path).then();
        } catch (error) {
            if (this.handleUnauthorized(error)) {
                throw error;
            }
            throw error;
        }
    }

    private async handleForwardSubmit(data: ComposePayload): Promise<void> {
        const recipient = data.to.trim();
        if (!recipient) {
            console.warn(INBOX_PAGE_TEXTS.recipientRequired);
            return;
        }

        try {
            await this.store.sendMail({
                to: recipient,
                subject: data.subject ?? "",
                body: data.body ?? "",
            });
        } catch (error) {
            if (this.handleUnauthorized(error)) {
                throw error;
            }
            throw error;
        }

        await this.store.refreshSelectedMail();
    }

    private async handleLogout(): Promise<void> {
        try {
            await performLogout();
        } catch (error) {
            console.error("Failed to logout", error);
        } finally {
            authManager.setAuthenticated(false);
            this.router.navigate("/auth", { replace: true }).then();
        }
    }

    private parseNumericId(value: string | undefined): number | null {
        if (!value) {
            return null;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    private handleUnauthorized(error: unknown): boolean {
        if (error instanceof HttpError && error.status === 401) {
            authManager.setAuthenticated(false);
            this.router.navigate("/auth", { replace: true }).then();
            return true;
        }
        return false;
    }

    private async updateSlot(slotName: string, content: HTMLElement | Component): Promise<void> {
        await this.layout.updateSlot(slotName, content);
    }
}
