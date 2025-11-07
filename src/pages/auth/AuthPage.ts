import { Page } from "@shared/base/Page";
import { AuthFormComponent } from "./components";
import { AUTH_PAGE_TEXTS } from "@pages/constants/texts";
import { ButtonComponent } from "@shared/components/Button/Button";
import { authenticate } from "@features/auth";
import type { LoginPayload } from "@entities/auth";
import { authManager } from "@infra";
import "./views/AuthPage.scss";

export class AuthPage extends Page {
    private readonly form: AuthFormComponent;
    private readonly registerButton: ButtonComponent;

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

    private async handleSubmit(payload: LoginPayload): Promise<void> {
        this.form.clearErrors();
        this.form.setFormError(null);

        const result = await authenticate(payload);
        authManager.setAuthenticated(result.success);

        if (result.success) {
            this.router.navigate("/inbox");
            return;
        }

        this.form.setFormError(result.message);
    }

    private handleForgotPassword(): void {
        console.log("Reset password flow is not implemented yet.");
    }
}
