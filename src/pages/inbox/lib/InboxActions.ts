import type { MailAttachment, MailDetail } from "@app-types/mail";
import { InboxStore } from "@features/inbox";
import { Router } from "@infra";
import { INBOX_PAGE_TEXTS } from "@pages/constants/texts";

export type ComposePayload = { to: string; subject: string; body: string; attachments?: MailAttachment[] };

type Dependencies = {
    store: InboxStore;
    router: Router;
    onUnauthorized: (error: unknown) => boolean;
    notifyFolderMove?: (folderId: string) => void;
};

export class InboxActions {
    private readonly store: InboxStore;
    private readonly router: Router;
    private readonly onUnauthorized: (error: unknown) => boolean;
    private readonly notifyFolderMove?: (folderId: string) => void;

    constructor(deps: Dependencies) {
        this.store = deps.store;
        this.router = deps.router;
        this.onUnauthorized = deps.onUnauthorized;
        this.notifyFolderMove = deps.notifyFolderMove;
    }

    public async sendMail(data: ComposePayload): Promise<void> {
        this.ensureBodyPresent(data);
        const recipient = data.to.trim();
        try {
            await this.store.sendMail({
                to: recipient,
                subject: data.subject ?? "",
                body: data.body ?? "",
                attachments: data.attachments,
            });
            this.store.clearSelection();
            await this.router.navigate("/mail");
        } catch (error) {
            if (this.onUnauthorized(error)) {
                return;
            }
            throw error;
        }
    }

    public async replyToMail(mail: MailDetail, data: ComposePayload): Promise<void> {
        this.ensureBodyPresent(data);
        const recipient = data.to.trim();
        const rootMessageId = `${mail.id ?? ""}`.trim();
        if (!rootMessageId) {
            throw new Error("Unable to determine message id for reply");
        }

        const threadRootCandidate = `${mail.threadId ?? rootMessageId}`.trim();
        if (!/^\d+$/.test(threadRootCandidate)) {
            throw new Error("Invalid thread id for reply");
        }

        try {
            await this.store.replyToMail({
                to: recipient,
                subject: data.subject ?? "",
                body: data.body ?? "",
                rootMessageId,
                threadRoot: threadRootCandidate,
                attachments: data.attachments,
            });
            await this.store.refreshSelectedMail();
        } catch (error) {
            if (this.onUnauthorized(error)) {
                return;
            }
            throw error;
        }
    }

    public async forwardMail(data: ComposePayload): Promise<void> {
        this.ensureBodyPresent(data);
        const recipient = data.to.trim();
        try {
            await this.store.sendMail({
                to: recipient,
                subject: data.subject ?? "",
                body: data.body ?? "",
                attachments: data.attachments,
            });
            await this.store.refreshSelectedMail();
        } catch (error) {
            if (this.onUnauthorized(error)) {
                return;
            }
            throw error;
        }
    }

    public async saveDraft(data: ComposePayload, threadId?: string, draftId?: string): Promise<string> {
        try {
            const saved = await this.store.saveDraft({
                to: data.to.trim(),
                subject: data.subject ?? "",
                body: data.body ?? "",
                threadId,
                draftId,
                attachments: data.attachments,
            });
            this.store.clearSelection();
            await Promise.all([this.store.loadFolders(), this.store.loadFolder("draft", { silent: true })]);
            const path = `/mail/draft/${encodeURIComponent(saved)}`;
            await this.router.navigate(path);
            return saved;
        } catch (error) {
            if (this.onUnauthorized(error)) {
                return Promise.reject(error);
            }
            throw error;
        }
    }

    public async sendDraft(
        data: ComposePayload,
        context: { draftId?: string; threadId?: string }
    ): Promise<void> {
        this.ensureBodyPresent(data);
        const subject = data.subject ?? "";
        const body = data.body ?? "";
        const recipient = data.to.trim();

        try {
            const ensuredDraftId =
                context.draftId ??
                (await this.store.saveDraft({
                    to: recipient,
                    subject,
                    body,
                    threadId: context.threadId,
                    attachments: data.attachments,
                }));

            await this.store.sendDraft({
                draftId: ensuredDraftId,
                to: recipient,
                subject,
                body,
                threadId: context.threadId,
                attachments: data.attachments,
            });
            this.store.clearSelection();
            await this.router.navigate("/mail/sent");
        } catch (error) {
            if (this.onUnauthorized(error)) {
                return;
            }
            throw error;
        }
    }

    public async deleteDraft(draftId: string): Promise<void> {
        if (!draftId) {
            return;
        }
        try {
            await this.store.deleteDraft(draftId);
            await this.router.navigate("/mail/draft");
        } catch (error) {
            if (this.onUnauthorized(error)) {
                return;
            }
            throw error;
        }
    }

    public async createFolder(name: string): Promise<void> {
        try {
            const folder = await this.store.createFolder(name);
            const path = folder.id === "inbox" ? "/mail" : `/mail/${encodeURIComponent(folder.id)}`;
            await this.router.navigate(path);
        } catch (error) {
            if (this.onUnauthorized(error)) {
                return;
            }
            throw error;
        }
    }

    public async moveMessage(messageId: string, targetFolderId: string): Promise<void> {
        try {
            await this.store.moveMessage(messageId, targetFolderId);
            this.store.clearSelection();
            const path = targetFolderId === "inbox" ? "/mail" : `/mail/${encodeURIComponent(targetFolderId)}`;
            await this.router.navigate(path);
            this.notifyFolderMove?.(targetFolderId);
        } catch (error) {
            if (this.onUnauthorized(error)) {
                return;
            }
            throw error;
        }
    }

    public async markAsSpam(messageId: string): Promise<void> {
        try {
            await this.store.markMessageAsSpam(messageId);
            this.store.clearSelection();
            await this.router.navigate("/mail/spam");
            this.notifyFolderMove?.("spam");
        } catch (error) {
            if (this.onUnauthorized(error)) {
                return;
            }
            throw error;
        }
    }

    private ensureBodyPresent(data: ComposePayload): void {
        const recipient = data.to.trim();
        if (!recipient) {
            throw new Error(INBOX_PAGE_TEXTS.recipientRequired);
        }
        if (!data.body || data.body.trim().length === 0) {
            throw new Error(INBOX_PAGE_TEXTS.bodyRequired ?? "Body cannot be empty");
        }
    }
}
