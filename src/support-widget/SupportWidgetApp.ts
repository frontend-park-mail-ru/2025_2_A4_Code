import { Component } from "@shared/base/Component";
import { InputFieldComponent } from "@shared/components/InputField/InputField";
import { SelectFieldComponent } from "@shared/components/SelectField/SelectField";
import { ButtonComponent } from "@shared/components/Button/Button";
import template from "./SupportWidgetApp.hbs";
import "./SupportWidgetApp.scss";

type StatusTone = "neutral" | "error" | "success";

export class SupportWidgetApp extends Component {
    private readonly subjectField: SelectFieldComponent;
    private readonly messageField: InputFieldComponent;
    private readonly submitButton: ButtonComponent;

    private formElement: HTMLFormElement | null = null;
    private statusElement: HTMLElement | null = null;

    constructor() {
        super();

        this.subjectField = new SelectFieldComponent({
            label: "Тема обращения",
            name: "subject",
            placeholder: "Выберите тему",
            required: true,
            options: [
                { value: "complaint", label: "Проблема с функциналом" },
                { value: "bug", label: "Ошибка в работе сервиса" },
                { value: "idea", label: "Предложение по улучшению" },
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
    }

    protected renderTemplate(): string {
        return template({});
    }

    protected afterRender(): void {
        this.mountField("subject", this.subjectField);
        this.mountField("message", this.messageField);
        this.mountField("submit", this.submitButton);

        this.formElement = this.element?.querySelector("[data-form]") as HTMLFormElement | null;
        this.statusElement = this.element?.querySelector("[data-status]") as HTMLElement | null;
        this.formElement?.addEventListener("submit", this.handleSubmit);
    }

    public async unmount(): Promise<void> {
        this.formElement?.removeEventListener("submit", this.handleSubmit);
        await this.subjectField.unmount();
        await this.messageField.unmount();
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

    private handleSubmit = (event: Event): void => {
        event.preventDefault();

        const payload = {
            subject: this.subjectField.getValue().trim(),
            message: this.messageField.getValue().trim(),
        };

        if (!payload.subject || !payload.message) {
            this.showStatus("Заполните тему и текст обращения, чтобы мы могли помочь.", "error");
            return;
        }

        console.info("[support-widget] submitting request", payload);

        this.showStatus("Сообщение отправлено. Мы свяжемся, как только подготовим ответ.", "success");
        this.resetFields();
    };

    private resetFields(): void {
        this.subjectField.setValue("");
        this.messageField.setValue("");
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
