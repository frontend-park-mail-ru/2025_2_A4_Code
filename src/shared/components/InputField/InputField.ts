import { Component } from "@shared/base/Component";
import template from "./InputField.hbs";
import "./InputField.scss";

type ControlType = "input" | "textarea";

type Props = {
    label?: string;
    name: string;
    type?: string;
    placeholder?: string;
    value?: string;
    error?: string;
    required?: boolean;
    autocomplete?: string;
    onInput?: (value: string) => void;
    variant?: "filled" | "underline";
    hint?: string;
    disabled?: boolean;
    control?: ControlType;
    rows?: number;
};

export class InputFieldComponent extends Component<Props> {
    constructor(props: Props) {
        super({
            ...props,
            type: props.type ?? "text",
            variant: props.variant ?? "filled",
            control: props.control ?? "input",
            rows: props.rows ?? 4,
        });
    }

    protected renderTemplate(): string {
        const control = this.props.control ?? "input";
        const value = this.props.value ?? "";

        return template({
            label: this.props.label,
            name: this.props.name,
            type: this.props.type ?? "text",
            placeholder: this.props.placeholder,
            value,
            error: this.props.error,
            required: this.props.required,
            autocomplete: this.props.autocomplete,
            variant: this.props.variant ?? "filled",
            disabled: this.props.disabled ?? false,
            isTextarea: control === "textarea",
            textareaRows: this.props.rows ?? 4,
        });
    }

    protected afterRender(): void {
        const control = this.getControlElement();
        if (!control) return;

        control.addEventListener("input", () => {
            this.props.onInput?.(control.value);
        });
    }

    public setValue(value: string): void {
        const control = this.getControlElement();
        if (control) {
            control.value = value;
        }
        this.setProps({ value });
    }

    public getValue(): string {
        const control = this.getControlElement();
        return control?.value ?? this.props.value ?? "";
    }

    public setError(message: string | null): void {
        this.props = { ...this.props, error: message ?? undefined };
        const root = this.element as HTMLElement | null;
        if (!root) {
            return;
        }

        const errorEl = root.querySelector("[data-error]") as HTMLElement | null;
        if (!errorEl) {
            return;
        }

        if (message && message.trim()) {
            errorEl.textContent = message;
            errorEl.hidden = false;
        } else {
            errorEl.textContent = "";
            errorEl.hidden = true;
        }
    }

    public setDisabled(disabled: boolean): void {
        this.props = { ...this.props, disabled };
        const control = this.getControlElement();
        if (control) {
            control.disabled = disabled;
        }
    }

    private getControlElement(): HTMLInputElement | HTMLTextAreaElement | null {
        return (this.element?.querySelector("[data-control]") as HTMLInputElement | HTMLTextAreaElement | null) ?? null;
    }
}
