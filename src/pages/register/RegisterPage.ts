import { Page } from "@shared/base/Page";
import { RegisterFormComponent } from "./components";
import { ButtonComponent } from "@shared/components/Button/Button";
import { registerUser } from "@features/auth";
import { authManager } from "@infra";
import type { RegisterPayload } from "@entities/auth";
import { formatDateToBackend, normalizeUsername, validateRegisterForm } from "@utils";
import { REGISTER_PAGE_TEXTS } from "@pages/constants/texts";
import "./views/RegisterPage.scss";

export class RegisterPage extends Page {
    private readonly form: RegisterFormComponent;
    private readonly authButton: ButtonComponent;

    constructor() {
        super();
        this.form = new RegisterFormComponent({
            onSubmit: (payload) => this.handleSubmit(payload),
        });

        this.authButton = new ButtonComponent({
            variant: "secondary",
            label: REGISTER_PAGE_TEXTS.switchToAuthButton,
            onClick: () => this.router.navigate("/auth"),
            fullWidth: true,
        });
    }

    protected renderTemplate(): string {
        return `<div class="register-page"></div>`;
    }

    protected getSlotContent() {
        const content = document.createElement("div");
        content.className = "register-page";

        const title = document.createElement("h1");
        title.className = "register-page__title";
        title.textContent = REGISTER_PAGE_TEXTS.headerText;
        content.appendChild(title);

        const formWrapper = document.createElement("div");
        formWrapper.className = "register-page__form";
        this.form.render();
        this.form.mount(formWrapper).then();
        content.appendChild(formWrapper);

        const actions = document.createElement("div");
        actions.className = "register-page__actions";
        this.authButton.render();
        this.authButton.mount(actions).then();
        content.appendChild(actions);

        return { content };
    }

    private async handleSubmit(payload: {
        name: string;
        login: string;
        birthdate: string;
        gender?: string;
        password: string;
        passwordRepeat: string;
    }): Promise<void> {
        const errors = validateRegisterForm(payload);
        this.form.applyErrors(errors);
        if (errors.length > 0) {
            return;
        }

        this.form.clearErrors();
        this.form.setFormError(null);

        const requestPayload: RegisterPayload = {
            name: payload.name.trim(),
            username: normalizeUsername(payload.login),
            birthday: formatDateToBackend(payload.birthdate),
            gender: (payload.gender as RegisterPayload["gender"]) ?? "male",
            password: payload.password,
        };

        const result = await registerUser(requestPayload);
        if (!result.success) {
            this.form.setFormError(result.message);
            return;
        }

        authManager.setAuthenticated(true);
        await this.router.navigate("/inbox");
    }
}
