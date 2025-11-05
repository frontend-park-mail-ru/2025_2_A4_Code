import { Component } from "../../../../shared/base/Component";
import template from "./RegisterForm.hbs";
import "./RegisterForm.scss";
import { InputFieldComponent } from "../../../../shared/components/InputField/InputField";
import { RadioGroupComponent } from "../../../../shared/components/RadioGroup/RadioGroup";
import { ButtonComponent } from "../../../../shared/components/Button/Button";
import type { FieldError, RegisterFormFields } from "../../../../utils";

type SubmitPayload = {
    name: string;
    login: string;
    birthdate: string;
    gender: string | undefined;
    password: string;
    passwordRepeat: string;
};

type Props = {
    onSubmit?: (payload: SubmitPayload) => void;
};

export class RegisterFormComponent extends Component<Props> {
    private readonly nameField: InputFieldComponent;
    private readonly loginField: InputFieldComponent;
    private readonly birthdateField: InputFieldComponent;
    private readonly genderGroup: RadioGroupComponent;
    private readonly passwordField: InputFieldComponent;
    private readonly passwordRepeatField: InputFieldComponent;
    private readonly submitButton: ButtonComponent;
    private errorContainer: HTMLElement | null = null;
    private generalError: string | null = null;

    constructor(props: Props = {}) {
        super(props);

        this.nameField = new InputFieldComponent({
            name: "name",
            placeholder: "Имя",
            autocomplete: "name",
            required: true,
            variant: "underline",
            onInput: () => this.clearFieldError("name"),
        });

        this.loginField = new InputFieldComponent({
            name: "login",
            placeholder: "login@flintmail.ru",
            required: true,
            variant: "underline",
            onInput: () => this.clearFieldError("login"),
        });

        this.birthdateField = new InputFieldComponent({
            name: "birthdate",
            type: "date",
            variant: "underline",
            onInput: () => this.clearFieldError("birthdate"),
        });

        this.genderGroup = new RadioGroupComponent({
            name: "gender",
            label: "Пол",
            options: [
                { label: "Мужской", value: "male" },
                { label: "Женский", value: "female" },
            ],
        });

        this.passwordField = new InputFieldComponent({
            name: "password",
            type: "password",
            placeholder: "Пароль",
            required: true,
            autocomplete: "new-password",
            variant: "underline",
            onInput: () => this.clearFieldError("password"),
        });

        this.passwordRepeatField = new InputFieldComponent({
            name: "passwordRepeat",
            type: "password",
            placeholder: "Повторите пароль",
            required: true,
            autocomplete: "new-password",
            variant: "underline",
            onInput: () => this.clearFieldError("passwordRepeat"),
        });

        this.submitButton = new ButtonComponent({
            type: "submit",
            label: "Зарегистрироваться",
            variant: "primary",
            fullWidth: true,
        });
    }

    protected renderTemplate(): string {
        return template({});
    }

    protected afterRender(): void {
        const mount = (slotName: string, component: Component) => {
            const slot = this.element?.querySelector(`[data-slot="${slotName}"]`) as HTMLElement | null;
            if (!slot) return;
            component.render();
            component.mount(slot).then();
        };

        mount("name", this.nameField);
        mount("login", this.loginField);
        mount("birthdate", this.birthdateField);
        mount("gender", this.genderGroup);
        mount("password", this.passwordField);
        mount("passwordRepeat", this.passwordRepeatField);
        mount("submit", this.submitButton);

        const form = this.element as HTMLFormElement | null;
        form?.addEventListener("submit", (event) => {
            event.preventDefault();
            const payload: SubmitPayload = {
                name: this.nameField.getValue(),
                login: this.loginField.getValue(),
                birthdate: this.birthdateField.getValue(),
                gender: this.genderGroup.getValue(),
                password: this.passwordField.getValue(),
                passwordRepeat: this.passwordRepeatField.getValue(),
            };
            this.props.onSubmit?.(payload);
        });

        this.errorContainer = this.element?.querySelector('[data-slot="error"]') as HTMLElement | null;
        this.updateGeneralError();
    }

    public applyErrors(errors: FieldError<keyof RegisterFormFields>[]): void {
        this.setFormError(null);
        const map = new Map<keyof RegisterFormFields, string>();
        errors.forEach((error) => map.set(error.field, error.message));
        this.setFieldError("name", map.get("name") ?? null);
        this.setFieldError("login", map.get("login") ?? null);
        this.setFieldError("birthdate", map.get("birthdate") ?? null);
        this.setFieldError("password", map.get("password") ?? null);
        this.setFieldError("passwordRepeat", map.get("passwordRepeat") ?? null);
        if (errors.length === 0) {
            this.setFormError(null);
        }
    }

    public clearErrors(): void {
        this.setFieldError("name", null);
        this.setFieldError("login", null);
        this.setFieldError("birthdate", null);
        this.setFieldError("password", null);
        this.setFieldError("passwordRepeat", null);
        this.setFormError(null);
    }

    public setFormError(message: string | null): void {
        this.generalError = message?.trim() || null;
        this.updateGeneralError();
    }

    private setFieldError(field: keyof RegisterFormFields, message: string | null): void {
        switch (field) {
            case "name":
                this.nameField.setError(message);
                break;
            case "login":
                this.loginField.setError(message);
                break;
            case "birthdate":
                this.birthdateField.setError(message);
                break;
            case "password":
                this.passwordField.setError(message);
                break;
            case "passwordRepeat":
                this.passwordRepeatField.setError(message);
                break;
            default:
                break;
        }
    }

    private clearFieldError(field: keyof RegisterFormFields): void {
        this.setFieldError(field, null);
    }

    private updateGeneralError(): void {
        if (!this.errorContainer) {
            return;
        }
        const message = this.generalError;
        this.errorContainer.textContent = message ?? "";
        this.errorContainer.classList.toggle("register-form__error--visible", Boolean(message));
    }
}

