import { Component } from "@shared/base/Component";
import { InputFieldComponent } from "@shared/components/InputField/InputField";
import { SelectFieldComponent } from "@shared/components/SelectField/SelectField";
import { ButtonComponent } from "@shared/components/Button/Button";
import { fetchSupportAppeals, sendSupportAppeal, type SupportAppeal } from "@entities/support";
import template from "./SupportWidgetApp.hbs";
import "./SupportWidgetApp.scss";

type StatusTone = "neutral" | "error" | "success";

export class SupportWidgetApp extends Component {
    private readonly subjectField: SelectFieldComponent;
    private readonly messageField: InputFieldComponent;
    private readonly submitButton: ButtonComponent;
    private readonly historyButton: ButtonComponent;

    private formElement: HTMLFormElement | null = null;
    private statusElement: HTMLElement | null = null;
    private historyContainer: HTMLElement | null = null;
    private resizeListener?: () => void;

    private showingHistory = false;
    private appeals: SupportAppeal[] = [];
    private historyLoading = false;
    private historyError: string | null = null;
    private sending = false;

    constructor() {
        super();

        this.subjectField = new SelectFieldComponent({
            label: "Тема обращения",
            name: "subject",
            placeholder: "Выберите тему",
            required: true,
            options: [
                { value: "bug", label: "Ошибка или баг" },
                { value: "idea", label: "Предложение" },
                { value: "complaint", label: "Продуктовая жалоба" },
            ],
        });

        this.messageField = new InputFieldComponent({
            label: "Текст обращения",
            name: "message",
            control: "textarea",
            placeholder: "Опишите ситуацию максимально подробно",
            rows: 5,
            required: true,
        });

        this.submitButton = new ButtonComponent({
            label: "Отправить",
            type: "submit",
            fullWidth: true,
        });

        this.historyButton = new ButtonComponent({
            label: "Мои обращения",
            variant: "secondary",
            fullWidth: true,
            onClick: () => {
                void this.toggleHistory();
            },
        });
    }

    protected renderTemplate(): string {
        return template({});
    }

    protected afterRender(): void {
        this.mountField("subject", this.subjectField);
        this.mountField("message", this.messageField);
        this.mountField("history", this.historyButton);
        this.mountField("submit", this.submitButton);

        this.formElement = this.element?.querySelector("[data-form]") as HTMLFormElement | null;
        this.statusElement = this.element?.querySelector("[data-status]") as HTMLElement | null;
        this.historyContainer = this.element?.querySelector("[data-history]") as HTMLElement | null;

        this.formElement?.addEventListener("submit", this.handleSubmit);
        this.renderHistory();
        this.updateHistoryButtonState();
        this.updateSubmitButtonState();
        this.ensureTextareaFits();

        this.resizeListener = () => this.ensureTextareaFits();
        window.addEventListener("resize", this.resizeListener);
    }

    public async unmount(): Promise<void> {
        this.formElement?.removeEventListener("submit", this.handleSubmit);
        if (this.resizeListener) {
            window.removeEventListener("resize", this.resizeListener);
            this.resizeListener = undefined;
        }
        await this.subjectField.unmount();
        await this.messageField.unmount();
        await this.historyButton.unmount();
        await this.submitButton.unmount();
        await super.unmount();
    }

    private mountField(slotName: string, component: Component): void {
        const slot = this.element?.querySelector(`[data-slot="${slotName}"]`) as HTMLElement | null;
        if (!slot) {
            return;
        }
        slot.innerHTML = "";
        const element = component.render();
        slot.appendChild(element);
        component.mount(slot).then();
    }

    private handleSubmit = async (event: Event): Promise<void> => {
        event.preventDefault();

        const payload = {
            subject: this.subjectField.getValue().trim(),
            message: this.messageField.getValue().trim(),
        };

        if (!payload.subject || !payload.message) {
            this.showStatus("Заполните тему и текст обращения, чтобы мы могли помочь.", "error");
            return;
        }

        this.sending = true;
        this.updateSubmitButtonState();

        try {
            await sendSupportAppeal({
                topic: this.subjectField.getSelectedLabel(),
                text: payload.message,
            });

            this.showStatus("Сообщение отправлено. Мы вернёмся с ответом на почту.", "success");
            this.resetFields();

            if (this.showingHistory) {
                await this.loadHistory(true);
            }
        } catch (error) {
            this.showStatus(this.extractErrorMessage(error), "error");
        } finally {
            this.sending = false;
            this.updateSubmitButtonState();
        }
    };

    private resetFields(): void {
        this.subjectField.setValue("");
        this.messageField.setValue("");
    }

    private async toggleHistory(): Promise<void> {
        this.showingHistory = !this.showingHistory;
        this.renderHistory();
        this.updateHistoryButtonState();

        if (this.showingHistory) {
            await this.loadHistory(true);
        }
    }

    private async loadHistory(force = false): Promise<void> {
        if (this.historyLoading) {
            return;
        }

        if (!force && this.appeals.length > 0) {
            this.renderHistory();
            return;
        }

        this.historyLoading = true;
        this.historyError = null;
        this.renderHistory();

        try {
            const data = await fetchSupportAppeals();
            this.appeals = data.appeals;
        } catch (error) {
            this.historyError = this.extractErrorMessage(error);
        } finally {
            this.historyLoading = false;
            this.renderHistory();
        }
    }

    private renderHistory(): void {
        if (!this.historyContainer) {
            return;
        }

        if (!this.showingHistory) {
            this.historyContainer.hidden = true;
            this.historyContainer.innerHTML = "";
            return;
        }

        this.historyContainer.hidden = false;

        if (this.historyLoading) {
            this.renderHistoryMessage("support-widget-history__loading", "Загружаем обращения…");
            return;
        }

        if (this.historyError) {
            this.renderHistoryMessage("support-widget-history__error", this.historyError);
            return;
        }

        if (this.appeals.length === 0) {
            this.renderHistoryMessage("support-widget-history__empty", "Пока нет обращений");
            return;
        }

        const list = document.createElement("div");
        list.className = "support-widget-history__list";

        this.appeals.forEach((appeal) => {
            list.appendChild(this.createHistoryItem(appeal));
        });

        this.historyContainer.innerHTML = "";
        this.historyContainer.appendChild(list);
    }

    private renderHistoryMessage(className: string, text: string): void {
        if (!this.historyContainer) {
            return;
        }
        this.historyContainer.innerHTML = "";
        const paragraph = document.createElement("p");
        paragraph.className = className;
        paragraph.textContent = text;
        this.historyContainer.appendChild(paragraph);
    }

    private createHistoryItem(appeal: SupportAppeal): HTMLElement {
        const item = document.createElement("article");
        item.className = "support-widget-history__item";

        const header = document.createElement("div");
        header.className = "support-widget-history__item-header";

        const title = document.createElement("h3");
        title.className = "support-widget-history__item-title";
        title.textContent = appeal.topic || "Без темы";

        const status = document.createElement("span");
        status.className = "support-widget-history__item-status";
        status.textContent = this.formatStatus(appeal.status);

        header.appendChild(title);
        header.appendChild(status);

        const text = document.createElement("p");
        text.className = "support-widget-history__item-text";
        text.textContent = appeal.text || "Без описания";

        const date = document.createElement("p");
        date.className = "support-widget-history__item-date";
        date.textContent = this.formatDate(appeal.createdAt);

        item.appendChild(header);
        item.appendChild(text);
        item.appendChild(date);
        return item;
    }

    private formatDate(date: Date): string {
        return new Intl.DateTimeFormat("ru-RU", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    }

    private formatStatus(status: string): string {
        const normalized = status.trim().toLowerCase();
        switch (normalized) {
            case "new":
            case "open":
                return "Открыто";
            case "in_progress":
                return "В работе";
            case "closed":
            case "resolved":
                return "Закрыто";
            default:
                return normalized.length > 0 ? status : "Статус неизвестен";
        }
    }

    private updateHistoryButtonState(): void {
        this.historyButton.setProps({
            label: this.showingHistory ? "Скрыть обращения" : "Мои обращения",
            variant: "secondary",
            fullWidth: true,
            onClick: () => {
                void this.toggleHistory();
            },
        });
    }

    private updateSubmitButtonState(): void {
        this.submitButton.setProps({
            label: this.sending ? "Отправляем…" : "Отправить",
            type: "submit",
            fullWidth: true,
            disabled: this.sending,
        });
    }

    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error && error.message) {
            return error.message;
        }
        if (typeof error === "string") {
            return error;
        }
        return "Не удалось загрузить обращения.";
    }

    private ensureTextareaFits(): void {
        const textarea = this.messageField
            .getElement()
            ?.querySelector("textarea") as HTMLTextAreaElement | null;
        const appElement = this.element;
        const formElement = this.element?.querySelector(".support-widget-form") as HTMLElement | null;

        if (!textarea || !appElement || !formElement) {
            return;
        }

        textarea.style.width = "100%";
        textarea.style.maxHeight = "";
        textarea.style.height = "";

        const appRect = appElement.getBoundingClientRect();
        const formRect = formElement.getBoundingClientRect();
        const overflow = formRect.bottom - appRect.bottom;

        if (overflow > 0) {
            const currentHeight = textarea.getBoundingClientRect().height;
            const newHeight = Math.max(80, currentHeight - overflow - 12);
            textarea.style.maxHeight = `${newHeight}px`;
            textarea.style.height = `${newHeight}px`;
        }
    }

    private showStatus(message: string, tone: StatusTone = "neutral"): void {
        if (!this.statusElement) {
            return;
        }

        this.statusElement.textContent = message;
        this.statusElement.classList.remove(
            "support-widget-form__status--error",
            "support-widget-form__status--success"
        );

        if (tone === "error") {
            this.statusElement.classList.add("support-widget-form__status--error");
        } else if (tone === "success") {
            this.statusElement.classList.add("support-widget-form__status--success");
        }
    }
}
