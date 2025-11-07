import { fetchInboxMessages, fetchMessageById, replyToMessage, sendMessage } from "@entities/mail";
import type { Mail, MailDetail } from "@app-types/mail";
import type { InboxSummary, ReplyMessagePayload, SendMessagePayload } from "@entities/mail";
import { isOfflineError } from "@shared/api/ApiService";

type InboxSubscriber = (state: InboxState) => void;

export type InboxState = {
    mails: Mail[];
    selectedMailId?: string;
    selectedMail: MailDetail | null;
    total: number;
    unread: number;
    loadingList: boolean;
    loadingSelection: boolean;
    mutating: boolean;
    error: string | null;
    offlineSelectionFallback: boolean;
};

const initialState: InboxState = {
    mails: [],
    selectedMailId: undefined,
    selectedMail: null,
    total: 0,
    unread: 0,
    loadingList: false,
    loadingSelection: false,
    mutating: false,
    error: null,
    offlineSelectionFallback: false,
};

export class InboxStore {
    private state: InboxState = initialState;
    private subscribers = new Set<InboxSubscriber>();

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

    public async loadList(): Promise<void> {
        this.setState((state) => ({
            ...state,
            loadingList: true,
            error: null,
        }));

        try {
            const summary = await fetchInboxMessages();
            cacheInboxSummary(summary);
            this.setState((state) => {
                const selectedMailId = state.selectedMailId;
                const matchedMail = selectedMailId
                    ? summary.items.find((mail) => mail.id === selectedMailId)
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
                    mails: summary.items,
                    total: summary.total,
                    unread: summary.unread,
                    loadingList: false,
                    selectedMailId: matchedMail ? state.selectedMailId : undefined,
                    selectedMail: matchedMail ? nextSelectedMail : null,
                    offlineSelectionFallback: matchedMail ? state.offlineSelectionFallback : false,
                };
            });
        } catch (error) {
            const offlineFallback = isOfflineError(error);
            if (offlineFallback) {
                const cachedSummary = readCachedInboxSummary();
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
                loadingList: false,
                error: toErrorMessage(error),
            }));
            throw error;
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

    public async refreshSelectedMail(): Promise<void> {
        const selectedId = this.state.selectedMailId;
        if (!selectedId) {
            return;
        }
        await this.openMail(selectedId);
    }

    private async runMutation(task: () => Promise<void>): Promise<void> {
        this.setState((state) => ({
            ...state,
            mutating: true,
            error: null,
        }));

        try {
            await task();
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

    private setState(updater: (prev: InboxState) => InboxState): void {
        this.state = updater(this.state);
        this.notify();
    }

    private notify(): void {
        for (const listener of this.subscribers) {
            listener(this.state);
        }
    }
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    if (typeof error === "string") {
        return error;
    }
    return "Unexpected error";
}

const INBOX_CACHE_KEY = "inbox:summary";
const INBOX_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

type CachedInboxSummary = {
    total: number;
    unread: number;
    items: Mail[];
    timestamp: number;
};

function cacheInboxSummary(summary: InboxSummary): void {
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
        window.localStorage.setItem(INBOX_CACHE_KEY, JSON.stringify(payload));
    } catch {
        // ignore storage errors
    }
}

function readCachedInboxSummary(): CachedInboxSummary | null {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(INBOX_CACHE_KEY);
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
