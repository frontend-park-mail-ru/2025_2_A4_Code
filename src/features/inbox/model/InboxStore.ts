import {
    fetchInboxMessages,
    fetchMessageById,
    replyToMessage,
    sendMessage,
    fetchFolders,
    fetchFolderMessages,
    type FolderSummary,
    type InboxSummary,
    createFolder,
    moveMessageToFolder,
    saveDraft,
    sendDraft,
    deleteDraft,
    markAsSpam,
    type SaveDraftPayload,
    type SendDraftPayload,
    type PaginationCursor,
    type NormalizedPagination,
} from "@entities/mail";
import type { Mail, MailDetail } from "@app-types/mail";
import type { ReplyMessagePayload, SendMessagePayload } from "@entities/mail";
import { isOfflineError } from "@shared/api/ApiService";
import { SIDEBAR_TEXTS } from "@shared/constants/texts";
import { showToast } from "@shared";

type InboxSubscriber = (state: InboxState) => void;

export type InboxState = {
    mails: Mail[];
    selectedMailId?: string;
    selectedMail: MailDetail | null;
    total: number;
    unread: number;
    loadingList: boolean;
    loadingMore: boolean;
    loadingSelection: boolean;
    mutating: boolean;
    error: string | null;
    offlineSelectionFallback: boolean;
    folders: FolderSummary[];
    activeFolderId: string;
    pagination: NormalizedPagination;
};

export type FolderSummary = {
    id: string;
    name: string;
    type: string;
    icon?: string;
    unread?: number;
    backendId?: string;
};

const DEFAULT_FOLDER_ID = SIDEBAR_TEXTS.defaultFolders[0].id;

const initialState: InboxState = {
    mails: [],
    selectedMailId: undefined,
    selectedMail: null,
    total: 0,
    unread: 0,
    loadingList: false,
    loadingMore: false,
    loadingSelection: false,
    mutating: false,
    error: null,
    offlineSelectionFallback: false,
    folders: [],
    activeFolderId: DEFAULT_FOLDER_ID,
    pagination: { hasNext: false },
};

export class InboxStore {
    private state: InboxState = initialState;
    private subscribers = new Set<InboxSubscriber>();
    private readonly localReadIds: Set<string> = loadReadIds();

    public subscribe(listener: InboxSubscriber): () => void {
        this.subscribers.add(listener);
        listener(this.state);
        return () => {
            this.subscribers.delete(listener);
        };
    }

    public getState(): InboxState {
        return this.state;
    }

    public async init(): Promise<void> {
        await this.loadFolders();
        await this.loadFolder(this.state.activeFolderId);
    }

    public async loadFolders(): Promise<void> {
        try {
            const folders = await fetchFolders();
            const merged = mapFoldersWithIcons(folders);
            this.setState((state) => ({
                ...state,
                folders: merged,
                activeFolderId: state.activeFolderId || merged[0]?.id || DEFAULT_FOLDER_ID,
            }));
        } catch (error) {
            this.setState((state) => ({
                ...state,
                error: toErrorMessage(error),
            }));
        }
    }

    public async loadFolder(folderId: string, opts?: { silent?: boolean }): Promise<void> {
        this.setState((state) => ({
            ...state,
            activeFolderId: folderId,
        }));
        await this.loadList(folderId, opts?.silent);
    }

    public async loadList(folderId?: string, silent = false): Promise<void> {
        const targetFolder = folderId ?? this.state.activeFolderId ?? DEFAULT_FOLDER_ID;

        if (!silent) {
            this.setState((state) => ({
                ...state,
                loadingList: true,
                loadingMore: false,
                error: null,
                pagination: { hasNext: false },
                mails: targetFolder === state.activeFolderId ? state.mails : [],
            }));
        } else {
            this.setState((state) => ({
                ...state,
                error: null,
            }));
        }

        try {
            const summary = await this.fetchFolderSummary(targetFolder);
            cacheInboxSummary(targetFolder, summary);
            const normalizedItems = this.applyLocalRead(summary.items, targetFolder);
            this.setState((state) => {
                const selectedMailId = state.selectedMailId;
                const matchedMail = selectedMailId
                    ? normalizedItems.find((mail) => mail.id === selectedMailId)
                    : undefined;

                const nextSelectedMail =
                    matchedMail && state.selectedMail
                        ? {
                              ...state.selectedMail,
                              subject: matchedMail.subject,
                              time: matchedMail.time,
                              from: matchedMail.from,
                              avatarUrl: matchedMail.avatarUrl,
                        }
                        : matchedMail
                        ? state.selectedMail
                        : null;

                return {
                    ...state,
                    mails: normalizedItems,
                    total: summary.total,
                    unread: targetFolder === "draft" ? 0 : summary.unread,
                    loadingList: silent ? state.loadingList : false,
                    loadingMore: silent ? state.loadingMore : false,
                    pagination: summary.pagination ?? { hasNext: false },
                    selectedMailId: matchedMail ? state.selectedMailId : undefined,
                    selectedMail: matchedMail ? nextSelectedMail : null,
                    offlineSelectionFallback: matchedMail ? state.offlineSelectionFallback : false,
                };
            });
        } catch (error) {
            const offlineFallback = isOfflineError(error);
            if (offlineFallback) {
                const cachedSummary = readCachedInboxSummary(targetFolder);
                if (cachedSummary) {
                    this.setState((state) => ({
                        ...state,
                        mails: cachedSummary.items,
                        total: cachedSummary.total,
                        unread: cachedSummary.unread,
                        loadingList: false,
                        error: null,
                    }));
                    return;
                }
            }
            this.setState((state) => ({
                ...state,
                loadingList: silent ? state.loadingList : false,
                loadingMore: silent ? state.loadingMore : false,
                error: toErrorMessage(error),
            }));
            throw error;
        }
    }

    public async deleteDraft(draftId: string): Promise<void> {
        this.setState((state) => ({ ...state, mutating: true }));
        try {
            await deleteDraft(draftId);
            await this.loadFolder("draft");
            this.setState((state) => ({
                ...state,
                selectedMailId: undefined,
                selectedMail: null,
            }));
        } finally {
            this.setState((state) => ({ ...state, mutating: false }));
        }
    }

    public async openMail(id: string): Promise<MailDetail> {
        this.setState((state) => ({
            ...state,
            selectedMailId: id,
            loadingSelection: true,
            error: null,
        }));

        try {
            const detail = await fetchMessageById(id);

            this.setState((state) => {
                if (state.selectedMailId !== id) {
                    return state;
                }

                const wasUnread = state.mails.some((mail) => mail.id === id && !mail.isRead);
                const updatedMails = state.mails.map((mail) =>
                    mail.id === id ? { ...mail, isRead: true } : mail
                );

                if (wasUnread || !this.localReadIds.has(id)) {
                    this.localReadIds.add(id);
                    saveReadIds(this.localReadIds);
                }

                return {
                    ...state,
                    selectedMail: detail,
                    loadingSelection: false,
                    mails: updatedMails,
                    unread: wasUnread ? Math.max(0, state.unread - 1) : state.unread,
                    offlineSelectionFallback: false,
                };
            });

            return detail;
        } catch (error) {
            const offlineFallback = isOfflineError(error);
            this.setState((state) => {
                if (state.selectedMailId !== id) {
                    return state;
                }

                return {
                    ...state,
                    loadingSelection: false,
                    error: offlineFallback ? null : toErrorMessage(error),
                    offlineSelectionFallback: offlineFallback,
                };
            });
            throw error;
        }
    }

    public clearSelection(): void {
        this.setState((state) => ({
            ...state,
            selectedMailId: undefined,
            selectedMail: null,
            loadingSelection: false,
            offlineSelectionFallback: false,
        }));
    }

    public async sendMail(payload: SendMessagePayload): Promise<void> {
        await this.runMutation(async () => {
            await sendMessage(payload);
            await this.loadList();
        });
    }

    public async replyToMail(payload: ReplyMessagePayload): Promise<void> {
        await this.runMutation(async () => {
            await replyToMessage(payload);
            await this.loadList();
        });
    }

    public async createFolder(name: string): Promise<FolderSummary> {
        return this.runMutation(async () => {
            let created: FolderSummary;
            try {
                created = await createFolder(name);
            } catch (error: any) {
                const message = toErrorMessage(error);
                showToast(message || "Не удалось создать папку", "error");
                throw error;
            }
            await this.loadFolders();
            await this.loadFolder(created.id);
            return created;
        });
    }

    public async moveMessage(messageId: string, targetFolderId: string): Promise<void> {
        await this.runMutation(async () => {
            const apiFolderId = this.resolveFolderIdForApi(targetFolderId);
            await moveMessageToFolder(messageId, apiFolderId);
            await this.loadFolder(targetFolderId);
        });
    }

    public async markMessageAsSpam(messageId: string): Promise<void> {
        await this.runMutation(async () => {
            await markAsSpam(messageId);
            await this.loadFolder("spam");
        });
    }

    public async saveDraft(payload: SaveDraftPayload): Promise<string> {
        const result = await saveDraft(payload);
        return result.draftId;
    }

    public async sendDraft(payload: SendDraftPayload): Promise<void> {
        await this.runMutation(async () => {
            await sendDraft(payload);
            await this.loadFolders();
            await this.loadFolder("sent");
        });
    }

    public async refreshSelectedMail(): Promise<void> {
        const selectedId = this.state.selectedMailId;
        if (!selectedId) {
            return;
        }
        await this.openMail(selectedId);
    }

    public async loadMore(): Promise<void> {
        const { activeFolderId, pagination, loadingList, loadingMore } = this.state;
        if (loadingList || loadingMore || !pagination?.hasNext) {
            return;
        }

        this.setState((state) => ({
            ...state,
            loadingMore: true,
            error: null,
        }));

        try {
            const summary = await this.fetchFolderSummary(activeFolderId, {
                lastMessageId: pagination.nextLastMessageId,
                lastDatetime: pagination.nextLastDatetime,
            });
            const normalizedItems = this.applyLocalRead(summary.items, activeFolderId);
            this.setState((state) => {
                const existingIds = new Set(state.mails.map((m) => m.id));
                const deduped = normalizedItems.filter((mail) => !existingIds.has(mail.id));
                return {
                    ...state,
                    mails: [...state.mails, ...deduped],
                    total: summary.total,
                    unread: activeFolderId === "draft" ? 0 : summary.unread,
                    loadingMore: false,
                    pagination: summary.pagination ?? { hasNext: false },
                };
            });
        } catch (error) {
            this.setState((state) => ({
                ...state,
                loadingMore: false,
                error: toErrorMessage(error),
            }));
            throw error;
        }
    }

    private async runMutation<T>(task: () => Promise<T>): Promise<T> {
        this.setState((state) => ({
            ...state,
            mutating: true,
            error: null,
        }));

        try {
            return await task();
        } catch (error) {
            this.setState((state) => ({
                ...state,
                error: toErrorMessage(error),
            }));
            throw error;
        } finally {
            this.setState((state) => ({
                ...state,
                mutating: false,
            }));
        }
    }

    private async fetchFolderSummary(folderId: string, cursor?: PaginationCursor): Promise<InboxSummary> {
        if (!folderId || folderId === "inbox") {
            return fetchInboxMessages(cursor);
        }
        return fetchFolderMessages(folderId, cursor);
    }

    private applyLocalRead(items: Mail[], folderId: string): Mail[] {
        if (folderId === "draft") {
            return items.map((mail) => ({ ...mail, isRead: true }));
        }
        return items.map((mail) => (this.localReadIds.has(mail.id) ? { ...mail, isRead: true } : mail));
    }

    private setState(updater: (prev: InboxState) => InboxState): void {
        this.state = updater(this.state);
        this.notify();
    }

    private notify(): void {
        for (const listener of this.subscribers) {
            listener(this.state);
        }
    }

    private resolveFolderIdForApi(targetFolderId: string): string {
        const folder = this.state.folders.find(
            (f) => f.id === targetFolderId || f.backendId === targetFolderId
        );
        if (!folder) {
            return targetFolderId;
        }
        return folder.backendId ?? folder.id;
    }
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        const parsed = tryParseMessage(error.message);
        return parsed ?? error.message;
    }
    if (typeof error === "string") {
        const parsed = tryParseMessage(error);
        return parsed ?? error;
    }
    return "Unexpected error";
}

function tryParseMessage(raw: string): string | null {
    try {
        const data = JSON.parse(raw);
        if (data && typeof data === "object" && "message" in data) {
            const msg = (data as { message?: unknown }).message;
            if (typeof msg === "string") return msg;
        }
    } catch {
        // ignore parse errors
    }
    return null;
}

const INBOX_CACHE_KEY_PREFIX = "inbox:summary:";
const INBOX_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const READ_CACHE_KEY = "inbox:read-ids";
const READ_CACHE_LIMIT = 500;

type CachedInboxSummary = {
    total: number;
    unread: number;
    items: Mail[];
    timestamp: number;
};

function cacheInboxSummary(folderId: string, summary: InboxSummary): void {
    if (typeof window === "undefined") {
        return;
    }

    const payload: CachedInboxSummary = {
        total: summary.total,
        unread: summary.unread,
        items: summary.items,
        timestamp: Date.now(),
    };

    try {
        window.localStorage.setItem(INBOX_CACHE_KEY_PREFIX + folderId, JSON.stringify(payload));
    } catch {
        // ignore storage errors
    }
}

function readCachedInboxSummary(folderId: string): CachedInboxSummary | null {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(INBOX_CACHE_KEY_PREFIX + folderId);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as CachedInboxSummary;
        if (!parsed || !Array.isArray(parsed.items)) {
            return null;
        }

        if (!parsed.timestamp || Date.now() - parsed.timestamp > INBOX_CACHE_TTL_MS) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

function loadReadIds(): Set<string> {
    if (typeof window === "undefined") {
        return new Set();
    }
    try {
        const raw = window.localStorage.getItem(READ_CACHE_KEY);
        if (!raw) return new Set();
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return new Set();
        return new Set(arr.filter((id) => typeof id === "string" && id));
    } catch {
        return new Set();
    }
}

function saveReadIds(ids: Set<string>): void {
    if (typeof window === "undefined") {
        return;
    }
    try {
        const arr = Array.from(ids).slice(-READ_CACHE_LIMIT);
        window.localStorage.setItem(READ_CACHE_KEY, JSON.stringify(arr));
    } catch {
        // ignore storage errors
    }
}

function mapFoldersWithIcons(folders: FolderSummary[]): FolderSummary[] {
    const iconMap = new Map(
        SIDEBAR_TEXTS.defaultFolders.map((f) => [f.id, f.icon])
    );

    return folders.map((folder) => {
        const key = (folder.type || folder.id || "").toLowerCase();
        return {
            ...folder,
            icon: iconMap.get(key) ?? "/img/folder-custom.svg",
        };
    });
}
