import template from './AuthForm.hbs';
import './AuthForm.scss';
import {AUTH_PAGE_TEXTS} from "../../constants";

export class AuthForm {
    constructor() {}

    render() : string {
        const data = {
            loginPlaceholder: AUTH_PAGE_TEXTS.loginInputPlaceholder,
            passwordPlaceholder: AUTH_PAGE_TEXTS.passwordInputPlaceholder,
            forgotPasswordText: AUTH_PAGE_TEXTS.forgotPasswordText,
            submitLoginText: AUTH_PAGE_TEXTS.submitLoginButtonText,
        };

        return template(data);
    }
}