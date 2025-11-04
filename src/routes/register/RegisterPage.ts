import { Page } from "../../shared/base/Page";
import { RegisterFormComponent } from "./components";
import { ButtonComponent } from "../../shared/components/Button/Button";
import { register, RegisterPayload } from "./api";
import { formatDateToBackend, normalizeUsername, validateRegisterForm } from "../../utils";
import "./views/RegisterPage.scss";

export class RegisterPage extends Page {
    private form: RegisterFormComponent;
    private authButton: ButtonComponent;

    constructor() {
        super();
        this.form = new RegisterFormComponent({
            onSubmit: (payload) => this.handleSubmit(payload),
        });

        this.authButton = new ButtonComponent({
            variant: "secondary",
            label: "У меня уже есть аккаунт",
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
        title.textContent = "Регистрация";
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
    }) {
        const errors = validateRegisterForm(payload);
        this.form.applyErrors(errors);
        if (errors.length > 0) {
            return;
        }
        this.form.clearErrors();

        const requestPayload: RegisterPayload = {
            name: payload.name.trim(),
            username: normalizeUsername(payload.login),
            birthday: formatDateToBackend(payload.birthdate),
            gender: (payload.gender as "male" | "female") ?? "male",
            password: payload.password,
        };

        try {
            await register(requestPayload);
            this.router.navigate("/auth");
        } catch (error) {
            console.error("Failed to register", error);
        }
    }
}
