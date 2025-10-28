import {Component} from "../../base/Component";
import template from "./InputField.hbs";
import "./InputField.scss";

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
};

export class InputFieldComponent extends Component<Props> {
    constructor(props: Props) {
        super({
            ...props,
            type: props.type ?? "text",
            variant: props.variant ?? "filled",
        });
    }

    protected renderTemplate(): string {
        return template({
            label: this.props.label,
            name: this.props.name,
            type: this.props.type ?? "text",
            placeholder: this.props.placeholder,
            value: this.props.value ?? "",
            error: this.props.error,
            required: this.props.required,
            autocomplete: this.props.autocomplete,
            variant: this.props.variant ?? "filled",
        });
    }

    protected afterRender(): void {
        const input = this.element?.querySelector('[data-input]') as HTMLInputElement | null;
        if (!input) return;

        input.addEventListener('input', () => {
            this.props.onInput?.(input.value);
        });
    }

    public setValue(value: string): void {
        const input = this.element?.querySelector('[data-input]') as HTMLInputElement | null;
        if (input) {
            input.value = value;
        }
        this.setProps({ value });
    }

    public getValue(): string {
        const input = this.element?.querySelector('[data-input]') as HTMLInputElement | null;
        return input?.value ?? this.props.value ?? "";
    }
}
