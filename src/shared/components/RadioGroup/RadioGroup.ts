import {Component} from "@shared/base/Component";
import template from "./RadioGroup.hbs";
import "./RadioGroup.scss";

type Option = {
    label: string;
    value: string;
};

type Props = {
    name: string;
    label?: string;
    options: Option[];
    value?: string;
    onChange?: (value: string) => void;
};

export class RadioGroupComponent extends Component<Props> {
    protected renderTemplate(): string {
        const {name, label, options, value} = this.props;
        return template({
            name,
            label,
            options: options.map(option => ({
                ...option,
                checked: option.value === value,
            })),
        });
    }

    protected afterRender(): void {
        const inputs = Array.from(this.element?.querySelectorAll('input[type="radio"]') ?? []) as HTMLInputElement[];
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                if (input.checked) {
                    this.props.onChange?.(input.value);
                }
            });
        });
    }

    public getValue(): string | undefined {
        const checked = this.element?.querySelector('input[type="radio"]:checked') as HTMLInputElement | null;
        return checked?.value ?? this.props.value;
    }

    public setValue(value: string | undefined): void {
        this.props = { ...this.props, value };
        const inputs = Array.from(this.element?.querySelectorAll('input[type="radio"]') ?? []) as HTMLInputElement[];
        inputs.forEach((input) => {
            input.checked = value !== undefined && input.value === value;
        });
    }
}
