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
import { Router, authManager } from "@infra";
import template from "./views/InboxPage.hbs";
import { InboxStore, InboxState, buildForwardDraft, buildReplyDraft } from "@features/inbox";
import type { ComposeDraft } from "@features/inbox";
import { LayoutLoadingManager } from "@shared/utils/LayoutLoadingManager";
import type { MailDetail } from "@app-types/mail";
import { OfflinePlaceholderComponent } from "@shared/components/OfflinePlaceholder/OfflinePlaceholder";
import { INBOX_PAGE_TEXTS } from "@pages/constants/texts";
import { HttpError } from "@shared/api/ApiService";
import { showFolderNotification } from "@shared";
import { apiService } from "@shared/api/ApiService";
import { navigateToAuthPage } from "@shared/utils/authNavigation";

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

    constructor(params: InboxPageParams = {}) {
        super();
        this.initialMessageId = params.messageId;
        this.initialFolderId = params.folderId || "inbox";

        this.header = new HeaderComponent({
            onSearch: (query) => console.log("search", query),
            onLogout: () => this.handleLogout(),
            onMenuToggle: () => this.layout.toggleSidebar(),
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
        };

        this.showingList = true;
        this.mailView = null;
        this.lastRenderedMail = null;
        this.lastRenderedDraftId = mail.id;

        this.openCompose(
            draft,
            (data) => this.handleSendDraft(data, mail.id, mail.threadId),
            () => this.handleDeleteDraft(mail.id)
        );
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
        return new MailViewComponent({
            id: mail.id,
            from: mail.from,
            subject: mail.subject,
            time: mail.time,
            body: mail.body,
            avatarUrl: mail.avatarUrl ?? null,
            fromEmail: mail.fromEmail ?? mail.from,
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

    private handleReply(mail: MailDetail): void {
        const draft = buildReplyDraft(mail);
        this.openCompose(draft, (data) => this.handleReplySubmit(mail, data));
    }

    private handleForward(mail: MailDetail): void {
        const draft = buildForwardDraft(mail);
        this.openCompose(draft, (data) => this.handleForwardSubmit(data));
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
            onSaveDraft: (payload) => this.handleSaveDraft(payload, draftThreadId, draftId),
            onDeleteDraft,
            draftId,
        });

        this.composeModal = modal;
        this.updateSlot("modal", modal).then();
    }

    private closeModal(): void {
        this.composeModal = null;
        this.createFolderModal = null;
        this.moveFolderModal = null;
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
        if (!data.body || data.body.trim().length === 0) {
            console.warn(INBOX_PAGE_TEXTS.bodyRequired ?? "Тело письма обязательно");
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
        if (!data.body || data.body.trim().length === 0) {
            console.warn(INBOX_PAGE_TEXTS.bodyRequired ?? "Тело письма обязательно");
            return;
        }

        const rootMessageId = `${mail.id ?? ""}`.trim();
        if (!rootMessageId) {
            console.error("Unable to determine message id for reply");
            return;
        }

        const threadRootCandidate = `${mail.threadId ?? rootMessageId}`.trim();
        if (!/^\d+$/.test(threadRootCandidate)) {
            console.error("Invalid thread id for reply", threadRootCandidate);
            return;
        }
        const threadRoot = threadRootCandidate;

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
            if (error instanceof HttpError && error.status === 409) {
                throw new Error("Папка с таким названием уже существует");
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
        if (!data.body || data.body.trim().length === 0) {
            console.warn(INBOX_PAGE_TEXTS.bodyRequired ?? "Тело письма обязательно");
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

    private async handleSaveDraft(data: ComposePayload, threadId?: string, draftId?: string): Promise<void> {
        try {
            const savedDraftId = await this.store.saveDraft({
                to: data.to.trim(),
                subject: data.subject ?? "",
                body: data.body ?? "",
                threadId,
                draftId,
            });
            this.store.clearSelection();
            await this.store.loadFolder("draft");
            const path = `/mail/draft/${encodeURIComponent(savedDraftId)}`;
            this.router.navigate(path).then();
            this.closeModal();
        } catch (error) {
            if (this.handleUnauthorized(error)) {
                return;
            }
            console.error("Failed to save draft", error);
        }
    }

    private async handleSendDraft(data: ComposePayload, draftId?: string, threadId?: string): Promise<void> {
        const recipient = data.to.trim();
        if (!recipient) {
            console.warn(INBOX_PAGE_TEXTS.recipientRequired);
            return;
        }
        if (!data.body || data.body.trim().length === 0) {
            console.warn(INBOX_PAGE_TEXTS.bodyRequired ?? "����>�? ����?�?�?�� �?�+�?�����'��>�?�?�?");
            return;
        }

        const subject = data.subject ?? "";
        const body = data.body ?? "";

        try {
            const savedDraftId =
                draftId ??
                (await this.store.saveDraft({
                    to: recipient,
                    subject,
                    body,
                    threadId,
                }));

            await this.store.sendDraft({
                draftId: savedDraftId,
                to: recipient,
                subject,
                body,
                threadId,
            });
            this.store.clearSelection();
            this.closeModal();
            this.router.navigate("/mail/sent").then();
        } catch (error) {
            if (this.handleUnauthorized(error)) {
                return;
            }
            console.error("Failed to send draft", error);
        }
    }

    private async handleDeleteDraft(draftId: string): Promise<void> {
        if (!draftId) return;
        try {
            await this.store.deleteDraft(draftId);
            this.router.navigate("/mail/draft").then();
            this.closeModal();
        } catch (error) {
            console.error("Failed to delete draft", error);
        }
    }

    private async handleLogout(): Promise<void> {
        console.info("[auth] inbox logout requested");
        const navigationPromise = navigateToAuthPage(this.router, "manual-logout");
        try {
            await performLogout();
        } catch (error) {
            console.error("Failed to logout", error);
        } finally {
            console.info("[auth] inbox logout completed, starting post-logout check");
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
            onSelect: (folderId) => this.handleMoveToFolder(selectedMailId, folderId),
            onClose: () => this.closeModal(),
        });

        this.moveFolderModal = modal;
        this.composeModal = null;
        this.createFolderModal = null;
        this.updateSlot("modal", modal).then();
    }

    private async handleMoveToFolder(messageId: string, folderId: string): Promise<void> {
        try {
            await this.store.moveMessage(messageId, folderId);
            this.store.clearSelection();
            const path = folderId === "inbox" ? "/mail" : `/mail/${encodeURIComponent(folderId)}`;
            this.router.navigate(path).then();
            this.notifyFolderMove(folderId);
        } catch (error) {
            if (this.handleUnauthorized(error)) {
                return;
            }
            console.error("Failed to move message", error);
        } finally {
            this.closeModal();
        }
    }

    private async handleDeleteMail(messageId: string): Promise<void> {
        if (!messageId) return;
        const trash = this.store.getState().folders.find((f) => f.type === "trash" || f.id === "trash");
        const targetId = trash?.id ?? "trash";
        await this.handleMoveToFolder(messageId, targetId);
    }

    private async handleMarkAsSpam(messageId: string): Promise<void> {
        if (!messageId) {
            return;
        }

        try {
            await this.store.markMessageAsSpam(messageId);
            this.store.clearSelection();
            this.router.navigate("/mail/spam").then();
            this.notifyFolderMove("spam");
        } catch (error) {
            if (this.handleUnauthorized(error)) {
                return;
            }
            console.error("Failed to mark as spam", error);
        }
    }

    private handleUnauthorized(error: unknown): boolean {
        if (error instanceof HttpError && error.status === 401) {
            void navigateToAuthPage(this.router, "unauthorized-handler");
            return true;
        }
        return false;
    }

    private async triggerPostLogoutAuthCheck(): Promise<void> {
        if (this.postLogoutCheckStarted) {
            console.info("[auth] inbox post-logout check already started");
            return;
        }
        this.postLogoutCheckStarted = true;
        console.info("[auth] inbox post-logout profile probe");
        try {
            await apiService.request("/user/profile", { skipAuthRefresh: true, parseJson: false });
            console.warn("[auth] post-logout profile request succeeded unexpectedly (still authenticated?)");
        } catch (error) {
            console.info("[auth] post-logout profile request failed (expected)", error);
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
