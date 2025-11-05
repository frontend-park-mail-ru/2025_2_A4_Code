import { Page } from "../../shared/base/Page";
import { AuthFormComponent } from "./components";
import { AUTH_PAGE_TEXTS } from "./constants";
import { ButtonComponent } from "../../shared/components/Button/Button";
import { login } from "./api";
import { LoginPayload } from "./api/authApi";
import { authManager } from "@infra";
import "./views/AuthPage.scss";

export class AuthPage extends Page {
    private form: AuthFormComponent;
    private registerButton: ButtonComponent;

    constructor() {
        super();
        this.form = new AuthFormComponent({
            onSubmit: (payload) => this.handleSubmit(payload),
            onForgotPassword: () => this.handleForgotPassword(),
        });

        this.registerButton = new ButtonComponent({
            variant: "secondary",
            label: AUTH_PAGE_TEXTS.registrationButtonText,
            onClick: () => this.router.navigate("/register"),
            fullWidth: true,
        });
    }

    protected renderTemplate(): string {
        return `<div class="auth-page"></div>`;
    }

    protected getSlotContent() {
        const content = document.createElement("div");
        content.className = "auth-page";

        const title = document.createElement("h1");
        title.className = "auth-page__title";
        title.textContent = AUTH_PAGE_TEXTS.headerText;
        content.appendChild(title);

        const formWrapper = document.createElement("div");
        formWrapper.className = "auth-page__form";
        this.form.render();
        this.form.mount(formWrapper).then();
        content.appendChild(formWrapper);

        const actions = document.createElement("div");
        actions.className = "auth-page__actions";
        this.registerButton.render();
        this.registerButton.mount(actions).then();
        content.appendChild(actions);

        return { content };
    }

    private async handleSubmit(payload: LoginPayload) {
        this.form.clearErrors();
        this.form.setFormError(null);

        try {
            await login(payload);
            authManager.setAuthenticated(true);
            this.router.navigate("/inbox");
        } catch (error) {
            authManager.setAuthenticated(false);
            const message = this.extractErrorMessage(error);
            this.form.setFormError(message);
            console.error("Failed to login", error);
        }
    }

    private handleForgotPassword() {
        console.log("Reset password flow is not implemented yet.");
    }

    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            const raw = error.message?.trim();
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (typeof parsed?.message === "string" && parsed.message.trim().length > 0) {
                        return parsed.message.trim();
                    }
                } catch {
                    // ignore parse errors
                }
                return raw;
            }
        }
        return "Не удалось выполнить вход. Проверьте данные и попробуйте снова.";
    }
}
