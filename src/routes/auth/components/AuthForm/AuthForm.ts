import { Component } from "../../../../shared/base/Component";
import template from "./AuthForm.hbs";
import "./AuthForm.scss";
import { AUTH_PAGE_TEXTS } from "../../constants";
import { InputFieldComponent } from "../../../../shared/components/InputField/InputField";
import { ButtonComponent } from "../../../../shared/components/Button/Button";
import { FieldError, validateLoginForm } from "../../../../utils";

type SubmitPayload = {
    login: string;
    password: string;
};

type Props = {
    onSubmit?: (payload: SubmitPayload) => void;
    onForgotPassword?: () => void;
};

export class AuthFormComponent extends Component<Props> {
    private loginField: InputFieldComponent;
    private passwordField: InputFieldComponent;
    private submitButton: ButtonComponent;

    constructor(props: Props = {}) {
        super(props);

        this.loginField = new InputFieldComponent({
            name: "login",
            placeholder: AUTH_PAGE_TEXTS.loginInputPlaceholder,
            autocomplete: "username",
            required: true,
            variant: "underline",
            onInput: () => this.clearFieldError("login"),
        });

        this.passwordField = new InputFieldComponent({
            name: "password",
            type: "password",
            placeholder: AUTH_PAGE_TEXTS.passwordInputPlaceholder,
            autocomplete: "current-password",
            required: true,
            variant: "underline",
            onInput: () => this.clearFieldError("password"),
        });

        this.submitButton = new ButtonComponent({
            type: "submit",
            label: AUTH_PAGE_TEXTS.submitLoginButtonText,
            variant: "primary",
            fullWidth: true,
        });
    }

    protected renderTemplate(): string {
        return template({
            forgotPasswordText: AUTH_PAGE_TEXTS.forgotPasswordText,
        });
    }

    protected afterRender(): void {
        const loginSlot = this.element?.querySelector('[data-slot="login"]') as HTMLElement | null;
        const passwordSlot = this.element?.querySelector('[data-slot="password"]') as HTMLElement | null;
        const submitSlot = this.element?.querySelector('[data-slot="submit"]') as HTMLElement | null;
        const form = this.element as HTMLFormElement | null;

        if (loginSlot) {
            this.loginField.render();
            this.loginField.mount(loginSlot).then();
        }

        if (passwordSlot) {
            this.passwordField.render();
            this.passwordField.mount(passwordSlot).then();
        }

        if (submitSlot) {
            this.submitButton.render();
            this.submitButton.mount(submitSlot).then();
        }

        const forgotLink = this.element?.querySelector('[data-action="forgot"]') as HTMLElement | null;
        forgotLink?.addEventListener('click', (event) => {
            event.preventDefault();
            this.props.onForgotPassword?.();
        });

        form?.addEventListener('submit', (event) => {
            event.preventDefault();
            const payload = {
                login: this.loginField.getValue(),
                password: this.passwordField.getValue(),
            };
            const errors = validateLoginForm(payload);
            this.applyErrors(errors);
            if (errors.length === 0) {
                this.props.onSubmit?.(payload);
            }
        });
    }

    public applyErrors(errors: FieldError<keyof SubmitPayload>[]): void {
        const map = new Map<keyof SubmitPayload, string>();
        errors.forEach((error) => map.set(error.field, error.message));
        this.setFieldError("login", map.get("login") ?? null);
        this.setFieldError("password", map.get("password") ?? null);
    }

    public clearErrors(): void {
        this.setFieldError("login", null);
        this.setFieldError("password", null);
    }

    private setFieldError(field: keyof SubmitPayload, message: string | null): void {
        if (field === "login") {
            this.loginField.setError(message);
        } else if (field === "password") {
            this.passwordField.setError(message);
        }
    }

    private clearFieldError(field: keyof SubmitPayload): void {
        this.setFieldError(field, null);
    }
}
