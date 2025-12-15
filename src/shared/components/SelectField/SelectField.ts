import { Component } from "@shared/base/Component";
import template from "./SelectField.hbs";
import "./SelectField.scss";

type Option = {
    value: string;
    label: string;
    disabled?: boolean;
};

type Props = {
    label?: string;
    name: string;
    options: Option[];
    placeholder?: string;
    value?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    variant?: "filled" | "underline";
    onChange?: (value: string) => void;
};

export class SelectFieldComponent extends Component<Props> {
    private triggerElement: HTMLButtonElement | null = null;
    private hiddenInput: HTMLInputElement | null = null;
    private valueLabel: HTMLElement | null = null;
    private optionButtons: HTMLButtonElement[] = [];
    private optionHandlers = new Map<HTMLButtonElement, () => void>();
    private isOpen = false;

    private handleToggle = (): void => {
        if (this.props.disabled) return;
        this.setOpen(!this.isOpen);
    };

    private handleOutsideClick = (event: MouseEvent): void => {
        if (!this.element) return;
        const target = event.target as Node | null;
        if (target && this.element.contains(target)) {
            return;
        }
        this.setOpen(false);
    };

    private handleGlobalKeydown = (event: KeyboardEvent): void => {
        if (event.key === "Escape") {
            this.setOpen(false);
        }
    };

    private handleTriggerKeydown = (event: KeyboardEvent): void => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this.handleToggle();
        }
    };

    private handleOptionClick = (value: string): void => {
        this.setValue(value);
        this.props.onChange?.(value);
        this.setOpen(false);
    };

    constructor(props: Props) {
        super({
            ...props,
            variant: props.variant ?? "filled",
        });
    }

    protected renderTemplate(): string {
        const value = this.props.value ?? "";
        const options = this.props.options.map((option) => ({
            ...option,
            selected: option.value === value,
        }));

        return template({
            label: this.props.label,
            name: this.props.name,
            options,
            placeholder: this.props.placeholder,
            value,
            required: this.props.required,
            disabled: this.props.disabled,
            error: this.props.error,
            hint: this.props.hint,
            variant: this.props.variant ?? "filled",
            hasValue: value.trim().length > 0,
            currentLabel: options.find((option) => option.selected)?.label ?? this.props.placeholder ?? "Выберите",
        });
    }

    protected afterRender(): void {
        this.hiddenInput = this.element?.querySelector("[data-input]") as HTMLInputElement | null;
        this.triggerElement = this.element?.querySelector("[data-trigger]") as HTMLButtonElement | null;
        this.valueLabel = this.element?.querySelector("[data-value]") as HTMLElement | null;
        this.optionButtons = Array.from(this.element?.querySelectorAll("[data-option]") ?? []) as HTMLButtonElement[];
        this.optionHandlers.clear();

        this.triggerElement?.addEventListener("click", this.handleToggle);
        this.triggerElement?.addEventListener("keydown", this.handleTriggerKeydown);

        this.optionButtons.forEach((button) => {
            const handler = () => {
                const optionValue = button.dataset.value ?? "";
                this.handleOptionClick(optionValue);
            };
            this.optionHandlers.set(button, handler);
            button.addEventListener("click", handler);
        });
    }

    public getValue(): string {
        return this.hiddenInput?.value ?? this.props.value ?? "";
    }

    public setValue(value: string): void {
        if (this.hiddenInput) {
            this.hiddenInput.value = value;
        }

        const selected = this.props.options.find((option) => option.value === value);
        if (this.valueLabel) {
            this.valueLabel.textContent = selected?.label ?? this.props.placeholder ?? "Выберите";
        }

        this.updateSelectedOption(selected?.value ?? "");
        this.props = { ...this.props, value };
    }

    public setDisabled(disabled: boolean): void {
        this.props = { ...this.props, disabled };
        if (this.triggerElement) {
            this.triggerElement.disabled = disabled;
        }
        this.optionButtons.forEach((button) => {
            button.disabled = disabled;
        });
    }

    public setError(message: string | null): void {
        this.props = { ...this.props, error: message ?? undefined };
        const errorEl = this.element?.querySelector("[data-error]") as HTMLElement | null;
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

    public async unmount(): Promise<void> {
        this.triggerElement?.removeEventListener("click", this.handleToggle);
        this.triggerElement?.removeEventListener("keydown", this.handleTriggerKeydown);
        document.removeEventListener("pointerdown", this.handleOutsideClick);
        document.removeEventListener("keydown", this.handleGlobalKeydown);
        this.optionHandlers.forEach((handler, button) => button.removeEventListener("click", handler));
        this.optionHandlers.clear();
        await super.unmount();
    }

    public getSelectedLabel(): string {
        const value = this.getValue();
        const option = this.props.options.find((item) => item.value === value);
        return option?.label ?? value;
    }

    private setOpen(open: boolean): void {
        if (this.isOpen === open) return;
        this.isOpen = open;
        this.element?.classList.toggle("select-field--open", open);
        this.triggerElement?.setAttribute("aria-expanded", open ? "true" : "false");

        if (open) {
            document.addEventListener("pointerdown", this.handleOutsideClick);
            document.addEventListener("keydown", this.handleGlobalKeydown);
        } else {
            document.removeEventListener("pointerdown", this.handleOutsideClick);
            document.removeEventListener("keydown", this.handleGlobalKeydown);
        }
    }

    private updateSelectedOption(activeValue: string): void {
        this.optionButtons.forEach((button) => {
            const isActive = activeValue !== "" && button.dataset.value === activeValue;
            button.classList.toggle("select-field__option--selected", isActive);
            button.setAttribute("aria-selected", isActive ? "true" : "false");
        });
    }
}
