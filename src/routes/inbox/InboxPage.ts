import { HeaderComponent } from "../../shared/widgets/Header/Header";
import { Page } from "../../shared/base/Page";
import { SidebarComponent } from "../../shared/widgets/Sidebar/Sidebar";
import { Mail, MailDetail } from "../../types/mail";
import { MailListComponent } from "../../shared/widgets/MailList/MailList";
import { Component } from "../../shared/base/Component";
import { MailViewComponent } from "./components/MailView/MailView";
import { ComposeModal } from "./components/ComposeModal/ComposeModal";
import { fetchInboxMessages, fetchMessageById, sendMessage } from "./api/mailApi";
import { MainLayout } from "../../app/components/MainLayout/MainLayout";
import { logout } from "../auth/api";
import { authManager } from "../../infra";
import "./views/InboxPage.scss";
import template from "./views/InboxPage.hbs";

type InboxPageParams = {
    messageId?: string;
};

export class InboxPage extends Page {
    private mailList!: MailListComponent;
    private mails: Mail[] = [];
    private messageId?: string;
    private isLoading = false;
    private totalMessages = 0;
    private unreadMessages = 0;

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
            emptyMessage: "no_emails_text",
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
            console.error("Не удалось загрузить список писем", error);
        } finally {
            this.isLoading = false;
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

        try {
            this.messageId = id;
            const detail = await fetchMessageById(id);
            this.markMailAsRead(id);

            const view = this.createMailView(detail);
            await this.updateSlot("main", view);
        } catch (error) {
            console.error("Не удалось открыть письмо", error);
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
        });
    }

    private async showList(pushRoute = true): Promise<void> {
        if (pushRoute) {
            this.router.navigate("/inbox").then();
            return;
        }

        this.messageId = undefined;
        await this.updateSlot("main", this.mailList);
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

    private openCompose(): void {
        const modal = new ComposeModal({
            onClose: () => this.closeCompose(),
            onSend: (data) => this.handleSendMail(data),
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
            console.warn("Укажите адрес получателя");
            return;
        }

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
            console.error("Не удалось отправить письмо", error);
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
