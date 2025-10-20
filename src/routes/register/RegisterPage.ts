import template from './views/RegisterPage.hbs';
import './views/RegisterPage.scss';
import {Router} from "../../infra/Router";
import RegisterForm from "./components";

export class RegisterPage {
    private registerForm : RegisterForm = new RegisterForm();

    constructor(private router: Router) {}

    private handleAuthClick = (event: Event) => {
        event.preventDefault();

        this.router.navigate('/auth');
    }

    private bindEvents() {
        const authButton = document.querySelector('[data-action="auth"]');

        authButton?.addEventListener('click', this.handleAuthClick);
    }

    render(): string {
        setTimeout(() => this.bindEvents(), 0);

        const data = {
            registerForm: this.registerForm.render(),
        };

        return template(data);
    }
}