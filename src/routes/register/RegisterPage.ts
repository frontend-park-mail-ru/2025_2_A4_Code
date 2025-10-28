import {Page} from "../../shared/base/Page";
import {RegisterFormComponent} from "./components";
import {ButtonComponent} from "../../shared/components/Button/Button";
import {register, RegisterPayload} from "./api";
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
            label: "\u0423\u0436\u0435 \u0435\u0441\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442?",
            onClick: () => this.router.navigate('/auth'),
            fullWidth: true,
        });
    }

    protected renderTemplate(): string {
        return `<div class="register-page"></div>`;
    }

    protected getSlotContent() {
        const content = document.createElement('div');
        content.className = 'register-page';

        const title = document.createElement('h1');
        title.className = 'register-page__title';
        title.textContent = '\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f';
        content.appendChild(title);

        const formWrapper = document.createElement('div');
        formWrapper.className = 'register-page__form';
        this.form.render();
        this.form.mount(formWrapper).then();
        content.appendChild(formWrapper);

        const actions = document.createElement('div');
        actions.className = 'register-page__actions';
        this.authButton.render();
        this.authButton.mount(actions).then();
        content.appendChild(actions);

        return { content };
    }

    private async handleSubmit(payload: { name: string; login: string; birthdate: string; gender?: string; password: string; passwordRepeat: string }) {
        if (payload.password !== payload.passwordRepeat) {
            console.warn("Пароли не совпадают");
            return;
        }

        const requestPayload: RegisterPayload = {
            name: payload.name,
            username: payload.login,
            birthday: payload.birthdate,
            gender: (payload.gender as "male" | "female") ?? "male",
            password: payload.password,
        };

        try {
            const response = await register(requestPayload);
            console.log("Register success", response.message);
            this.router.navigate('/auth');
        } catch (error) {
            console.error("Register error", error);
        }
    }
}
