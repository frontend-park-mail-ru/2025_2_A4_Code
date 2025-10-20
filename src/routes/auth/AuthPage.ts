import template from './views/AuthPage.hbs';
import './views/AuthPage.scss';
import AuthForm from "./components";
import {Router} from "../../infra/Router";
import {AUTH_PAGE_TEXTS} from "./constants";

export class AuthPage {
    private authForm: AuthForm = new AuthForm();

    constructor(private router: Router) {}

    private handleRegisterClick = (event: Event) => {
        event.preventDefault();
        this.router.navigate('/register');
    }

    private bindEvents() {
        const registerBtn = document.querySelector('[data-action="register"]');

        registerBtn?.addEventListener('click', this.handleRegisterClick);
    }

    render(): string {
        setTimeout(() => this.bindEvents(), 0);

        const data = {
            authForm: this.authForm.render(),
            headerText: AUTH_PAGE_TEXTS.headerText,
            registrationButtonText: AUTH_PAGE_TEXTS.registrationButtonText,
        };

        return template(data);
    }
}