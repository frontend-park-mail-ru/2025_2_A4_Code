import { Page } from "@shared/base/Page";
import { Component } from "@shared/base/Component";
import { MainLayout } from "@app/components/MainLayout/MainLayout";
import {
    fetchAdminSupportAppeals,
    fetchSupportSummaryStats,
    updateSupportAppealStatus,
    type SupportAdminAppeal,
    type SupportSummaryStats,
    type SupportAppealStatus,
} from "@entities/support";
import { getProfileCache, saveProfileCache } from "@features/profile";
import { fetchProfile } from "@entities/profile";
import { extractApiErrorMessage } from "@shared/utils/apiError";
import { performLogout } from "@features/auth";
import { authManager } from "@infra";
import template from "./views/SupportAdminPage.hbs";
import "./views/SupportAdminPage.scss";

const STATUS_OPTIONS: Array<{ value: SupportAppealStatus; label: string }> = [
    { value: "open", label: "Открыто" },
    { value: "in progress", label: "В работе" },
    { value: "closed", label: "Закрыто" },
];

class SupportAdminView extends Component {
    protected renderTemplate(): string {
        return template({});
    }
}

export class SupportAdminPage extends Page {
    private readonly view = new SupportAdminView();
    private statsRoot: HTMLElement | null = null;
    private appealsRoot: HTMLElement | null = null;
    private logoutButton: HTMLButtonElement | null = null;
    private readonly logoutHandler = () => {
        void this.handleLogout();
    };

    private stats: SupportSummaryStats | null = null;
    private appeals: SupportAdminAppeal[] = [];
    private loading = false;
    private loadError: string | null = null;
    private updateError: string | null = null;
    private readonly updatingAppeals = new Set<number>();

    protected renderTemplate(): string {
        return "<div></div>";
    }

    protected getSlotContent(): { [slotName: string]: HTMLElement | Component } {
        return {
            main: this.view,
        };
    }

    public async init(): Promise<void> {
        await this.ensureAdminAccess();

        if (this.layout instanceof MainLayout) {
            this.layout.setContentBackground(true);
            this.layout.setSidebarWidth("0");
        }

        await this.ensureViewReady();
        this.captureDomRefs();
        await this.loadData();
    }

    public async unmount(): Promise<void> {
        this.logoutButton?.removeEventListener("click", this.logoutHandler);
        this.statsRoot = null;
        this.appealsRoot = null;
        this.logoutButton = null;
        this.updatingAppeals.clear();
        await super.unmount();
    }

    private async loadData(): Promise<void> {
        this.setLoading(true);
        this.loadError = null;
        this.updateError = null;

        try {
            const [stats, appeals] = await Promise.all([
                fetchSupportSummaryStats(),
                fetchAdminSupportAppeals(),
            ]);
            this.stats = stats;
            this.appeals = appeals;
        } catch (error) {
            this.loadError = extractApiErrorMessage(error, "Не удалось загрузить обращения");
        } finally {
            this.setLoading(false);
            this.renderStats();
            this.renderAppeals();
        }
    }

    private async ensureAdminAccess(): Promise<void> {
        const role = await this.resolveCurrentRole();
        if (!role) {
            this.router.navigate("/auth", { replace: true }).then();
            throw new Error("unauthorized");
        }

        if (!this.isAdminRole(role)) {
            this.router.navigate("/inbox", { replace: true }).then();
            throw new Error("forbidden");
        }
    }

    private async resolveCurrentRole(): Promise<string | null> {
        const cached = getProfileCache();
        if (cached?.role && this.isAdminRole(cached.role)) {
            return cached.role;
        }

        try {
            const profile = await fetchProfile();
            saveProfileCache(profile);
            return profile.role ?? "user";
        } catch (error) {
            console.error("Failed to resolve user role", error);
            return cached?.role ?? null;
        }
    }

    private isAdminRole(role: string): boolean {
        const normalized = role.trim().toLowerCase();
        return normalized === "admin" || normalized === "support";
    }

    private renderStats(): void {
        if (!this.statsRoot) {
            return;
        }

        this.statsRoot.innerHTML = "";

        if (this.loading && !this.stats) {
            this.statsRoot.appendChild(this.createInfoBlock("Загружаем статистику..."));
            return;
        }

        if (this.loadError && !this.stats) {
            this.statsRoot.appendChild(this.createAlert(this.loadError));
            return;
        }

        if (!this.stats) {
            this.statsRoot.appendChild(this.createInfoBlock("Нет данных по обращениям"));
            return;
        }

        const fragment = document.createDocumentFragment();

        const cards = [
            { label: "Всего обращений", value: this.stats.total },
            { label: "Открыто", value: this.stats.open },
            { label: "В работе", value: this.stats.inProgress },
            { label: "Закрыто", value: this.stats.closed },
        ];

        cards.forEach((stat) => {
            fragment.appendChild(this.createStatCard(stat.label, stat.value));
        });

        if (this.loadError) {
            fragment.appendChild(this.createAlert(this.loadError));
        }

        this.statsRoot.appendChild(fragment);
    }

    private renderAppeals(): void {
        if (!this.appealsRoot) {
            return;
        }

        this.appealsRoot.innerHTML = "";

        if (this.loading && this.appeals.length === 0) {
            this.appealsRoot.appendChild(this.createInfoBlock("Загружаем обращения..."));
            return;
        }

        if (this.loadError && this.appeals.length === 0) {
            this.appealsRoot.appendChild(this.createAlert(this.loadError));
            return;
        }

        if (this.appeals.length === 0) {
            this.appealsRoot.appendChild(this.createInfoBlock("Обращений пока нет"));
            return;
        }

        const fragment = document.createDocumentFragment();

        if (this.updateError) {
            fragment.appendChild(this.createAlert(this.updateError));
        }

        this.appeals.forEach((appeal) => {
            fragment.appendChild(this.renderAppealCard(appeal));
        });

        this.appealsRoot.appendChild(fragment);
    }

    private renderAppealCard(appeal: SupportAdminAppeal): HTMLElement {
        const container = document.createElement("article");
        container.className = "support-admin__card";

        const header = document.createElement("div");
        header.className = "support-admin__card-header";

        const topicWrapper = document.createElement("div");
        const title = document.createElement("h3");
        title.className = "support-admin__card-title";
        title.textContent = appeal.topic || "Без темы";
        const meta = document.createElement("p");
        meta.className = "support-admin__card-meta";
        meta.textContent = `Создано ${this.formatDate(appeal.createdAt)} · Обновлено ${this.formatDate(
            appeal.updatedAt
        )}`;
        topicWrapper.append(title, meta);

        const author = document.createElement("div");
        author.className = "support-admin__card-meta";
        author.textContent = `${appeal.authorName || "Без имени"} • ${appeal.authorEmail || "—"}`;

        header.append(topicWrapper, author);
        container.appendChild(header);

        const body = document.createElement("div");
        body.className = "support-admin__card-body";
        body.textContent = appeal.text || "—";
        container.appendChild(body);

        const footer = document.createElement("div");
        footer.className = "support-admin__card-footer";
        footer.appendChild(this.createStatusSelector(appeal));
        container.appendChild(footer);

        return container;
    }

    private createStatusSelector(appeal: SupportAdminAppeal): HTMLElement {
        const wrapper = document.createElement("label");
        wrapper.className = "support-admin__status";

        const caption = document.createElement("span");
        caption.textContent = "Статус";

        const select = document.createElement("select");
        STATUS_OPTIONS.forEach((option) => {
            const opt = document.createElement("option");
            opt.value = option.value;
            opt.textContent = option.label;
            select.appendChild(opt);
        });
        select.value = appeal.status;
        select.disabled = this.updatingAppeals.has(appeal.id);
        select.addEventListener("change", () => {
            const nextStatus = select.value as SupportAppealStatus;
            if (nextStatus !== appeal.status) {
                void this.handleStatusChange(appeal.id, nextStatus);
            }
        });

        wrapper.append(caption, select);
        return wrapper;
    }

    private async handleStatusChange(id: number, status: SupportAppealStatus): Promise<void> {
        this.updateError = null;
        this.updatingAppeals.add(id);
        this.renderAppeals();

        try {
            await updateSupportAppealStatus(id, status);
            this.appeals = this.appeals.map((appeal) =>
                appeal.id === id ? { ...appeal, status } : appeal
            );
            await this.refreshStats();
        } catch (error) {
            this.updateError = extractApiErrorMessage(error, "Не удалось обновить статус");
        } finally {
            this.updatingAppeals.delete(id);
            this.renderAppeals();
            this.renderStats();
        }
    }

    private async refreshStats(): Promise<void> {
        try {
            this.stats = await fetchSupportSummaryStats();
        } catch (error) {
            console.warn("Failed to refresh stats", error);
        }
    }

    private formatDate(date: Date): string {
        return new Intl.DateTimeFormat("ru-RU", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    }

    private setLoading(loading: boolean): void {
        this.loading = loading;
        if (this.layout instanceof MainLayout) {
            this.layout.setLoading(loading);
        }
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

    private async ensureViewReady(attempt = 0): Promise<void> {
        if (this.view.getElement()) {
            return;
        }

        if (attempt > 5) {
            throw new Error("Support admin view not ready");
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
        await this.ensureViewReady(attempt + 1);
    }

    private captureDomRefs(): void {
        const root = this.view.getElement();
        if (!root) {
            return;
        }

        this.statsRoot = root.querySelector("[data-stats]") as HTMLElement | null;
        this.appealsRoot = root.querySelector("[data-appeals]") as HTMLElement | null;
        this.logoutButton = root.querySelector("[data-logout]") as HTMLButtonElement | null;

        this.logoutButton?.addEventListener("click", this.logoutHandler);
    }

    private createStatCard(label: string, value: number): HTMLElement {
        const card = document.createElement("div");
        card.className = "support-admin__stat-card";

        const caption = document.createElement("span");
        caption.className = "support-admin__stat-label";
        caption.textContent = label;

        const amount = document.createElement("span");
        amount.className = "support-admin__stat-value";
        amount.textContent = String(value);

        card.append(caption, amount);
        return card;
    }

    private createAlert(message: string): HTMLElement {
        const alert = document.createElement("div");
        alert.className = "support-admin__alert";
        alert.textContent = message;
        return alert;
    }

    private createInfoBlock(message: string): HTMLElement {
        const placeholder = document.createElement("div");
        placeholder.className = "support-admin__loading";
        placeholder.textContent = message;
        return placeholder;
    }
}
