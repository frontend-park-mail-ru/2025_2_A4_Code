import { HeaderComponent } from "../../shared/widgets/Header/Header";
import { Page } from "../../shared/base/Page";
import { SidebarComponent } from "../../shared/widgets/Sidebar/Sidebar";
import { Mail, MailDetail } from "../../types/mail";
import { MailListComponent } from "../../shared/widgets/MailList/MailList";
import { Component } from "../../shared/base/Component";
import { MailViewComponent } from "./components/MailView/MailView";
import { ComposeModal } from "./components/ComposeModal/ComposeModal";
import { fetchInboxMessages, fetchMessageById, replyToMessage, sendMessage } from "./api/mailApi";
import { MainLayout } from "../../app/components/MainLayout/MainLayout";
import { logout } from "../auth/api";
import { authManager } from "../../infra";
import "./views/InboxPage.scss";
import template from "./views/InboxPage.hbs";

type InboxPageParams = {
    messageId?: string;
};

type ComposeOptions = {
    initialTo?: string;
    initialSubject?: string;
    initialBody?: string;
    focusField?: "to" | "subject" | "body";
    onSubmit?: (data: { to: string; subject: string; body: string }) => Promise<void> | void;
};

type ComposeDraft = Omit<ComposeOptions, "onSubmit">;

export class InboxPage extends Page {
    private mailList!: MailListComponent;
    private mails: Mail[] = [];
    private messageId?: string;
    private isLoading = false;
    private totalMessages = 0;
    private unreadMessages = 0;
    private globalLoadingDepth = 0;

    constructor(params: InboxPageParams = {}) {
        super();
        this.messageId = params.messageId;
    }

    protected renderTemplate(): string {
        return template.toString();
    }

    protected getSlotContent(): { [slotName: string]: HTMLElement | Component } {
        const header = new HeaderComponent({
            onSearch: (query) => console.log("search", query),
            onLogout: () => this.handleLogout(),
        });

        const sidebar = new SidebarComponent({
            onCompose: () => this.openCompose(),
            onFolderSelect: (id) => console.log("folder", id),
        });

        this.mailList = new MailListComponent({
            items: this.mails,
            onOpen: (id) => this.handleOpenMail(id),
            emptyMessage: "Писем пока нет. Они появятся, когда вам кто-то напишет",
        });

        return { header, sidebar, main: this.mailList };
    }

    public async init(): Promise<void> {
        if (this.layout instanceof MainLayout) {
            this.layout.setContentBackground(true);
            this.layout.setSidebarWidth(null);
        }
        await this.loadMessages();
    }

    public async update(params: Record<string, string>): Promise<void> {
        const messageId = params.messageId;
        if (messageId) {
            await this.showMail(messageId, false);
        } else {
            await this.showList(false);
        }
    }

    private async loadMessages(): Promise<void> {
        this.isLoading = true;
        this.beginGlobalLoading();
        try {
            const summary = await fetchInboxMessages();
            this.mails = summary.items;
            this.totalMessages = summary.total;
            this.unreadMessages = summary.unread;
            this.mailList.setProps({ items: this.mails });

            if (this.messageId) {
                await this.showMail(this.messageId, false);
            }
        } catch (error) {
            console.error("Failed to load inbox", error);
        } finally {
            this.isLoading = false;
            this.endGlobalLoading();
        }
    }

    private async handleOpenMail(id: string): Promise<void> {
        if (this.messageId === id && !this.isLoading) {
            return;
        }
        this.router.navigate(`/inbox/${id}`).then();
    }

    private async showMail(id: string, pushRoute = true): Promise<void> {
        if (pushRoute) {
            this.router.navigate(`/inbox/${id}`).then();
            return;
        }

        this.beginGlobalLoading();
        try {
            this.messageId = id;
            const detail = await fetchMessageById(id);
            this.markMailAsRead(id);

            const view = this.createMailView(detail);
            await this.updateSlot("main", view);
        } catch (error) {
            console.error("Failed to open message", error);
        } finally {
            this.endGlobalLoading();
        }
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
            onBack: () => this.showList(true),
            onReply: () => this.openReplyModal(mail),
            onForward: () => this.openForwardModal(mail),
        });
    }

    private async showList(pushRoute = true): Promise<void> {
        if (pushRoute) {
            this.beginGlobalLoading();
            this.router.navigate("/inbox")
                .finally(() => this.endGlobalLoading());
            return;
        }

        this.beginGlobalLoading();
        try {
            this.messageId = undefined;
            await this.updateSlot("main", this.mailList);
        } finally {
            this.endGlobalLoading();
        }
    }

    private markMailAsRead(id: string): void {
        let changed = false;

        this.mails = this.mails.map((mail) => {
            if (mail.id === id && !mail.isRead) {
                changed = true;
                return { ...mail, isRead: true };
            }
            return mail;
        });

        if (changed) {
            this.unreadMessages = Math.max(0, this.unreadMessages - 1);
            this.mailList.setProps({ items: this.mails });
        }
    }

    private openCompose(options: ComposeOptions = {}): void {
        const submitHandler = options.onSubmit ?? ((data: { to: string; subject: string; body: string }) => this.handleSendMail(data));

        const modal = new ComposeModal({
            onClose: () => this.closeCompose(),
            onSend: (data) => {
                Promise.resolve(submitHandler(data)).catch((error) => {
                    console.error("Failed to send message", error);
                });
            },
            initialTo: options.initialTo,
            initialSubject: options.initialSubject,
            initialBody: options.initialBody,
            focusField: options.focusField,
        });
        this.updateSlot("modal", modal).then();
    }

    private closeCompose(): void {
        const empty = document.createElement("div");
        this.updateSlot("modal", empty).then();
    }

    private async handleSendMail(data: { to: string; subject: string; body: string }): Promise<void> {
        const recipient = data.to.trim();
        if (!recipient) {
            console.warn("Recipient email is required");
            return;
        }

        this.beginGlobalLoading();
        try {
            await sendMessage({
                to: recipient,
                subject: data.subject ?? "",
                body: data.body ?? "",
            });
            this.closeCompose();
            this.messageId = undefined;
            await this.loadMessages();
            this.router.navigate("/inbox").then();
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            this.endGlobalLoading();
        }
    }

    private openReplyModal(mail: MailDetail): void {
        const draft = this.buildReplyDraft(mail);
        this.openCompose({
            ...draft,
            onSubmit: (data) => this.handleReplySubmit(mail, data),
        });
    }

    private openForwardModal(mail: MailDetail): void {
        const draft = this.buildForwardDraft(mail);
        this.openCompose({
            ...draft,
            onSubmit: (data) => this.handleForwardSubmit(data),
        });
    }

    private buildReplyDraft(mail: MailDetail): ComposeDraft {
        const initialTo = (mail.fromEmail ?? "").trim();
        const initialSubject = this.ensureSubjectPrefix(mail.subject, "Re:");
        const initialBody = this.buildReplyBody(mail);

        return {
            initialTo,
            initialSubject,
            initialBody,
            focusField: initialTo ? "body" : "to",
        };
    }

    private buildForwardDraft(mail: MailDetail): ComposeDraft {
        return {
            initialSubject: this.ensureSubjectPrefix(mail.subject, "Fwd:"),
            initialBody: this.buildForwardBody(mail),
            focusField: "to",
        };
    }

    private buildReplyBody(mail: MailDetail): string {
        const plainText = this.getPlainTextFromBody(mail.body);
        const quotedLines = this.splitLines(plainText).map((line) => (line.length > 0 ? `> ${line}` : ">"));
        const quotedBody = quotedLines.join("\n");
        const sender = mail.fromEmail ? `${mail.from} <${mail.fromEmail}>` : mail.from;
        const timestamp = mail.time ? `On ${mail.time}, ${sender} wrote:` : `${sender} wrote:`;

        const parts: string[] = ["", "", timestamp];
        if (quotedBody.length > 0) {
            parts.push(quotedBody);
        }

        return parts.join("\n");
    }

    private buildForwardBody(mail: MailDetail): string {
        const sender = mail.fromEmail ? `${mail.from} <${mail.fromEmail}>` : mail.from;
        const headerLines = [
            "---------- Пересылаемое сообщение ---------",
            `От кого: ${sender}`,
        ];

        if (mail.time) {
            headerLines.push(`Когда: ${mail.time}`);
        }

        if (mail.subject) {
            headerLines.push(`Тема: ${mail.subject}`);
        }

        const plainText = this.getPlainTextFromBody(mail.body);
        let body = `\n\n${headerLines.join("\n")}\n\n`;
        if (plainText) {
            body += plainText;
        }
        return body;
    }

    private getPlainTextFromBody(html: string): string {
        const container = document.createElement("div");
        container.innerHTML = html;

        const breaks = Array.from(container.querySelectorAll("br"));
        for (const br of breaks) {
            br.replaceWith("\n");
        }

        const textContent = container.textContent ?? "";
        const withoutCarriage = textContent.split("\r").join("");
        const withoutNbsp = withoutCarriage.split("\u00a0").join(" ");
        return withoutNbsp.trimEnd();
    }

    private ensureSubjectPrefix(subject: string, prefix: string): string {
        const trimmed = (subject ?? "").trim();
        if (!trimmed) {
            return prefix;
        }

        if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
            return trimmed;
        }

        return `${prefix} ${trimmed}`;
    }

    private splitLines(value: string): string[] {
        if (value.length === 0) {
            return [];
        }

        const result: string[] = [];
        let buffer = "";

        for (let i = 0; i < value.length; i += 1) {
            const char = value[i];

            if (char === "\n") {
                result.push(buffer);
                buffer = "";
                continue;
            }

            if (char === "\r") {
                result.push(buffer);
                buffer = "";

                if (value[i + 1] === "\n") {
                    i += 1;
                }
                continue;
            }

            buffer += char;
        }

        result.push(buffer);
        return result;
    }

    private beginGlobalLoading(): void {
        this.globalLoadingDepth += 1;
        this.updateLayoutLoadingState();
    }

    private endGlobalLoading(): void {
        if (this.globalLoadingDepth === 0) {
            return;
        }
        this.globalLoadingDepth -= 1;
        this.updateLayoutLoadingState();
    }

    private updateLayoutLoadingState(): void {
        if (this.layout instanceof MainLayout) {
            this.layout.setLoading(this.globalLoadingDepth > 0);
        }
    }

    private parseNumericId(value: string | undefined): number | null {
        if (!value) {
            return null;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    private async handleReplySubmit(mail: MailDetail, data: { to: string; subject: string; body: string }): Promise<void> {
        const recipient = data.to.trim();
        if (!recipient) {
            console.warn("Recipient email is required");
            return;
        }

        const rootMessageId = this.parseNumericId(mail.id);
        if (rootMessageId === null) {
            console.error("Unable to determine message id for reply");
            return;
        }

        const threadRoot = this.parseNumericId(mail.threadId) ?? rootMessageId;

        try {
            this.beginGlobalLoading();
            await replyToMessage({
                to: recipient,
                subject: data.subject ?? "",
                body: data.body ?? "",
                rootMessageId,
                threadRoot,
            });
            this.closeCompose();
            await this.loadMessages();
        } catch (error) {
            console.error("Failed to send reply", error);
        } finally {
            this.endGlobalLoading();
        }
    }

    private async handleForwardSubmit(data: { to: string; subject: string; body: string }): Promise<void> {
        const recipient = data.to.trim();
        if (!recipient) {
            console.warn("Recipient email is required");
            return;
        }

        try {
            this.beginGlobalLoading();
            await sendMessage({
                to: recipient,
                subject: data.subject ?? "",
                body: data.body ?? "",
            });
            this.closeCompose();
            await this.loadMessages();
        } catch (error) {
            console.error("Failed to forward message", error);
        } finally {
            this.endGlobalLoading();
        }
    }

    private async handleLogout(): Promise<void> {
        try {
            await logout();
        } catch (error) {
            console.error("Failed to logout", error);
        } finally {
            authManager.setAuthenticated(false);
            this.router.navigate("/auth").then();
        }
    }
}
