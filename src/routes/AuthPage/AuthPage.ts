import Handlebars from 'handlebars';

import template from './views/AuthPage.hbs';
import './views/AuthPage.scss';

type AuthMode = 'login' | 'register';

export class AuthPage {
    private mode: AuthMode = 'login';  // Состояние: login или register

    constructor() { }

    switchToLogin() {
        this.mode = 'login';
    }

    switchToRegister() {
        this.mode = 'register';
    }

    render(): string {
        const data = {
            isLogin: this.mode === 'login',
            isRegister: this.mode === 'register',
            loginTitle: "Вход в почту",
            loginPlaceholder: "Логин или email",
            passwordPlaceholder: "Пароль",
            loginButtonText: "Войти"
        };
        return template(data);
    }
}