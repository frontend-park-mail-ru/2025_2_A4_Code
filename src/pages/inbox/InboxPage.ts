import { HeaderComponent } from "@shared/widgets/Header/Header";
import { Component } from "@shared/base/Component";
import { SidebarComponent } from "@shared/widgets/Sidebar/Sidebar";
import { MailListComponent } from "@shared/widgets/MailList/MailList";
import { MailViewComponent } from "./components/MailView/MailView";
import { ComposeModal } from "./components/ComposeModal/ComposeModal";
import { CreateFolderModal } from "./components/CreateFolderModal/CreateFolderModal";
import { MoveToFolderModal } from "./components/MoveToFolderModal/MoveToFolderModal";
import { MainLayout } from "@app/components/MainLayout/MainLayout";
import { performLogout } from "@features/auth";
import { Router } from "@infra";
import template from "./views/InboxPage.hbs";
import { InboxStore, InboxState, buildForwardDraft, buildReplyDraft } from "@features/inbox";
import type { ComposeDraft } from "@features/inbox";
import { LayoutLoadingManager } from "@shared/utils/LayoutLoadingManager";
import type { MailDetail } from "@app-types/mail";
import { OfflinePlaceholderComponent } from "@shared/components/OfflinePlaceholder/OfflinePlaceholder";
import { INBOX_PAGE_TEXTS } from "@pages/constants/texts";
import { HttpError } from "@shared/api/ApiService";
import { showFolderNotification, showToast } from "@shared";
import { apiService } from "@shared/api/ApiService";
import { navigateToAuthPage } from "@shared/utils/authNavigation";
import { getCachedProfilePreview, loadProfilePreview } from "@features/profile";
import { InboxActions, type ComposePayload } from "./lib/InboxActions";
import { NewMailWatcher } from "@features/inbox/lib/NewMailWatcher";

type InboxPageParams = {
    messageId?: string;
    folderId?: string;
};

export class InboxPage extends Component {
    private readonly router = Router.getInstance();
    private readonly layout = new MainLayout();
    private readonly store = new InboxStore();
    private readonly loadingManager = new LayoutLoadingManager(() => this.layout);
    private readonly actions: InboxActions;

    private readonly header: HeaderComponent;
    private readonly sidebar: SidebarComponent;
    private readonly mailList: MailListComponent;

    private mailView: MailViewComponent | null = null;
    private composeModal: ComposeModal | null = null;
    private createFolderModal: CreateFolderModal | null = null;
    private moveFolderModal: MoveToFolderModal | null = null;
    private showingList = true;
    private lastRenderedMail: MailDetail | null = null;
    private lastRenderedDraftId: string | null = null;
    private unsubscribeFromStore?: () => void;
    private lastErrorMessage: string | null = null;
    private initialMessageId?: string;
    private initialFolderId: string = "inbox";
    private offlinePlaceholder: OfflinePlaceholderComponent | null = null;
    private showingOfflinePlaceholder = false;
    private postLogoutCheckStarted = false;
    private newMailWatcher: NewMailWatcher | null = null;
    private readonly loadMoreHandler = () => this.handleLoadMore();

    constructor(params: InboxPageParams = {}) {
        super();
        this.initialMessageId = params.messageId;
        this.initialFolderId = params.folderId || "inbox";

        this.header = new HeaderComponent({
            onLogout: () => this.handleLogout(),
            onMenuToggle: () => this.layout.toggleSidebar(),
            onSettings: () => this.router.navigate("/profile"),
            onLogoClick: () => this.router.navigate("/mail"),
            avatarLabel: "--",
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
            onLoadMore: this.loadMoreHandler,
        });

        this.actions = new InboxActions({
            store: this.store,
            router: this.router,
            onUnauthorized: (error) => this.handleUnauthorized(error),
            notifyFolderMove: (folderId) => this.notifyFolderMove(folderId),
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
        this.newMailWatcher = new NewMailWatcher(this.store);
        this.newMailWatcher.start();

        await this.initializeHeaderProfile();

        try {
            await this.store.loadFolders();
            await this.store.loadFolder(this.initialFolderId);
        } catch (error) {
            if (this.handleUnauthorized(error)) {
                return;
            }
            // console.error("Failed to initialise inbox", error);
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
                    // console.error("Failed to open message", error);
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
        this.newMailWatcher?.stop();
        this.newMailWatcher = null;
        this.loadingManager.reset();
        this.composeModal = null;
        this.createFolderModal = null;
        this.moveFolderModal = null;
        this.lastRenderedMail = null;
        this.lastRenderedDraftId = null;
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
        const listLoading = state.activeFolderId === "draft" ? false : state.loadingList;
        const isBusy = listLoading || state.loadingSelection || state.mutating;
        this.loadingManager.setBusy(isBusy);

        if (state.error && state.error !== this.lastErrorMessage) {
            this.lastErrorMessage = state.error;
            // console.error(state.error);
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

        this.mailList.setProps({
            items: state.mails,
            hasMore: state.pagination?.hasNext ?? false,
            loadingMore: state.loadingMore,
        });
        this.sidebar.setProps({
            folders: state.folders,
            activeFolderId: state.activeFolderId,
        });

        if (state.selectedMail && state.selectedMailId) {
            if (state.activeFolderId === "draft") {
                this.renderDraftEditor(state.selectedMail);
                return;
            }
            if (this.showingList || this.lastRenderedMail !== state.selectedMail) {
                this.renderMailView(state.selectedMail);
            }
            return;
        }

        if (!this.showingList && !state.loadingSelection) {
            this.showingList = true;
            this.mailView = null;
            this.lastRenderedMail = null;
            this.lastRenderedDraftId = null;
            this.updateSlot("main", this.mailList).then();
        }
    }

    private openCreateFolderModal(): void {
        this.layout.setSidebarOpen(false);
        const modal = new CreateFolderModal({
            onClose: () => this.closeModal(),
            onSave: (name) =>
                this.actions
                    .createFolder(name)
                    .then(() => this.closeModal())
                    .catch((error) => {}),
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
            // console.error("Failed to load folder", error);
        });
        const path = folderId === "inbox" ? "/mail" : `/mail/${encodeURIComponent(folderId)}`;
        this.router.navigate(path).then();
        this.layout.setSidebarOpen(false);
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

    private renderDraftEditor(mail: MailDetail): void {
        if (this.lastRenderedDraftId === mail.id && this.composeModal) {
            return;
        }

        const draft: ComposeDraft = {
            initialSubject: mail.subject,
            initialBody: this.htmlToPlainText(mail.body),
            focusField: "to",
            threadId: mail.threadId,
            draftId: mail.id,
            attachments: mail.attachments,
        };

        this.showingList = true;
        this.mailView = null;
        this.lastRenderedMail = null;
        this.lastRenderedDraftId = mail.id;

        this.openCompose(draft, (data) => this.actions.sendDraft(data, { draftId: mail.id, threadId: mail.threadId }));
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
        const { activeFolderId, folders } = this.store.getState();
        const folderType =
            folders.find((f) => f.id === activeFolderId || f.backendId === activeFolderId)?.type ||
            activeFolderId;
        const recipient =
            mail.recipient ??
            (folderType && folderType.toLowerCase() === "sent" ? mail.fromEmail ?? mail.from : undefined);
        return new MailViewComponent({
            id: mail.id,
            from: mail.from,
            subject: mail.subject,
            time: mail.time,
            body: mail.body,
            avatarUrl: mail.avatarUrl ?? null,
            fromEmail: mail.fromEmail ?? mail.from,
            recipient,
            attachments: mail.attachments ?? [],
            currentFolderId: activeFolderId,
            currentFolderType: folderType,
            onBack: () => this.handleBackToList(),
            onReply: () => this.handleReply(mail),
            onForward: () => this.handleForward(mail),
            onMoveToFolder: () => this.openMoveToFolder(),
            onMarkAsSpam: () => this.handleMarkAsSpam(mail.id),
            onDelete: () => this.handleDeleteMail(mail.id),
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

    private handleLoadMore(): void {
        this.store.loadMore().catch((error) => {
            // console.error("Failed to load more messages", error);
        });
    }

    private handleReply(mail: MailDetail): void {
        const draft = buildReplyDraft(mail);
        this.openCompose(draft, (data) => this.actions.replyToMail(mail, data));
    }

    private handleForward(mail: MailDetail): void {
        const draft = buildForwardDraft(mail);
        this.openCompose(draft, (data) => this.actions.forwardMail(data));
    }

    private openCompose(
        draft: ComposeDraft = {},
        submit?: (data: ComposePayload) => Promise<void>,
        onDeleteDraft?: () => void
    ): void {
        this.layout.setSidebarOpen(false);
        const draftThreadId = draft.threadId;
        const draftId = draft.draftId;
        this.createFolderModal = null;
        this.moveFolderModal = null;

        const deleteDraftHandler =
            onDeleteDraft ||
            (draftId
                ? () =>
                      this.actions
                          .deleteDraft(draftId)
                          .then(() => this.closeModal())
                          .catch((error) => {})
                : undefined);

        const modal = new ComposeModal({
            initialTo: draft.initialTo,
            initialSubject: draft.initialSubject,
            initialBody: draft.initialBody,
            focusField: draft.focusField,
            initialAttachments: draft.attachments,
            onClose: () => this.closeModal(),
            onSend: (payload) => {
                const handler = submit ?? ((data: ComposePayload) => this.actions.sendMail(data));
                this.handleComposeSubmit(handler, payload);
            },
            onSaveDraft: (payload) =>
                this.actions
                    .saveDraft(payload, draftThreadId, draftId)
                    .then(() => this.closeModal())
                    .catch((error) => {}),
            onDeleteDraft: deleteDraftHandler,
            draftId,
        });

        this.composeModal = modal;
        this.updateSlot("modal", modal).then();
    }

    private closeModal(): void {
        this.composeModal = null;
        this.createFolderModal = null;
        this.moveFolderModal = null;
        this.loadingManager.reset();
        const { activeFolderId, selectedMailId } = this.store.getState();
        const empty = document.createElement("div");
        this.updateSlot("modal", empty).then();
        if (activeFolderId === "draft" && selectedMailId) {
            this.store.clearSelection();
            this.router.navigate("/mail/draft").then();
        }
    }


    private handleComposeSubmit(
        submit: (data: ComposePayload) => Promise<void>,
        data: ComposePayload
    ): void {
        submit(data)
            .then(() => {
                showToast("Письмо отправлено", "success");
                this.closeModal();
            })
            .catch((error) => {
                // console.error("Failed to send message", error);
                this.closeModal();
                showToast("Не удалось отправить письмо", "error");
            });
    }

    private async handleLogout(): Promise<void> {
        // console.info("[auth] inbox logout requested");
        const navigationPromise = navigateToAuthPage(this.router, "manual-logout");
        try {
            await performLogout();
        } catch (error) {
           // console.error("Failed to logout", error);
        } finally {
            // console.info("[auth] inbox logout completed, starting post-logout check");
            await navigationPromise;
            void this.triggerPostLogoutAuthCheck();
        }
    }

    private openMoveToFolder(): void {
        const { selectedMailId, folders, activeFolderId } = this.store.getState();
        if (!selectedMailId) {
            return;
        }

        const modal = new MoveToFolderModal({
            folders,
            currentFolderId: activeFolderId,
            onSelect: (folderId) => {
                this.actions
                    .moveMessage(selectedMailId, folderId)
                    .catch((error) => {})
                    .finally(() => this.closeModal());
            },
            onClose: () => this.closeModal(),
        });

        this.moveFolderModal = modal;
        this.composeModal = null;
        this.createFolderModal = null;
        this.updateSlot("modal", modal).then();
    }

    private async handleDeleteMail(messageId: string): Promise<void> {
        if (!messageId) return;
        const trash = this.store.getState().folders.find((f) => f.type === "trash" || f.id === "trash");
        const targetId = trash?.id ?? "trash";
        try {
            await this.actions.moveMessage(messageId, targetId);
        } catch (error) {
            // console.error("Failed to delete message", error);
        }
    }

    private async handleMarkAsSpam(messageId: string): Promise<void> {
        if (!messageId) {
            return;
        }

        try {
            await this.actions.markAsSpam(messageId);
        } catch (error) {
           //  console.error("Failed to mark as spam", error);
        }
    }

    private handleUnauthorized(error: unknown): boolean {
        if (error instanceof HttpError && error.status === 401) {
            void navigateToAuthPage(this.router, "unauthorized-handler");
            return true;
        }
        return false;
    }

    private async initializeHeaderProfile(): Promise<void> {
        const cached = getCachedProfilePreview();
        if (cached) {
            this.header.setProps({
                avatarLabel: cached.initials,
                avatarImageUrl: cached.avatarUrl,
                userName: cached.fullName,
                userEmail: cached.email,
            });
        }

        try {
            const preview = await loadProfilePreview();
            this.header.setProps({
                avatarLabel: preview.initials,
                avatarImageUrl: preview.avatarUrl,
                userName: preview.fullName,
                userEmail: preview.email,
            });
        } catch (error) {
            // console.warn("Failed to load profile preview for header", error);
        }
    }

    private async triggerPostLogoutAuthCheck(): Promise<void> {
        if (this.postLogoutCheckStarted) {
            // console.info("[auth] inbox post-logout check already started");
            return;
        }
        this.postLogoutCheckStarted = true;
        // console.info("[auth] inbox post-logout profile probe");
        try {
            await apiService.request("/user/profile", { skipAuthRefresh: true, parseJson: false });
            // console.warn("[auth] post-logout profile request succeeded unexpectedly (still authenticated?)");
        } catch (error) {
            // console.info("[auth] post-logout profile request failed (expected)", error);
        }
    }

    private htmlToPlainText(html: string): string {
        const container = document.createElement("div");
        container.innerHTML = html ?? "";
        container.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
        return container.textContent ?? "";
    }

    private async updateSlot(slotName: string, content: HTMLElement | Component): Promise<void> {
        await this.layout.updateSlot(slotName, content);
    }

    private notifyFolderMove(folderId: string): void {
        const { folders } = this.store.getState();
        const folder =
            folders.find((f) => f.id === folderId || f.backendId === folderId) ||
            folders.find((f) => f.type === folderId.toLowerCase());
        const name = folder?.name ?? folderId;
        showFolderNotification(name);
    }
}
