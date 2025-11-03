import {HeaderComponent} from "../../shared/widgets/Header/Header";
import {Page} from "../../shared/base/Page";
import {SidebarComponent} from "../../shared/widgets/Sidebar/Sidebar";
import {Mail, MailDetail} from "../../types/mail";
import {MailListComponent} from "../../shared/widgets/MailList/MailList";
import {Component} from "../../shared/base/Component";
import {MailViewComponent} from "./components/MailView/MailView";
import {ComposeModal} from "./components/ComposeModal/ComposeModal";
import {fetchInboxMessages, fetchMessageById} from "./api/mailApi";
import {MainLayout} from "../../app/components/MainLayout/MainLayout";
import "./views/InboxPage.scss";
import template from "./views/InboxPage.hbs"

type InboxPageParams = {
    messageId?: string;
};

export class InboxPage extends Page {
    private mailList!: MailListComponent;
    private mails: Mail[] = [];
    private messageId?: string;
    private isLoading = false;

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
            onLogout: () => console.log("logout"),
        });

        const sidebar = new SidebarComponent({
            onCompose: () => this.openCompose(),
            onFolderSelect: (id) => console.log("folder", id),
        });

        this.mailList = new MailListComponent({
            items: this.mails,
            onOpen: (id) => this.handleOpenMail(id),
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
            this.mails = await fetchInboxMessages();
            this.mailList.setProps({ items: this.mails });

            if (this.messageId) {
                await this.showMail(this.messageId, false);
            }
        } catch (error) {
            console.error("Failed to load inbox messages", error);
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
            this.mailList.setProps({ items: this.mails });

            const view = this.createMailView(detail);
            await this.updateSlot("main", view);
        } catch (error) {
            console.error("Failed to load message", error);
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

    private openCompose(): void {
        const modal = new ComposeModal({
            onClose: () => this.closeCompose(),
            onSend: (data) => {
                console.log("send", data);
                this.closeCompose();
            },
        });
        this.updateSlot("modal", modal).then();
    }

    private closeCompose(): void {
        const empty = document.createElement("div");
        this.updateSlot("modal", empty).then();
    }
}
