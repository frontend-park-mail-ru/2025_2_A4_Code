import template from './AuthForm.hbs';
import './AuthForm.scss';
import {AUTH_PAGE_TEXTS} from "../../constants";

interface AuthFormProps {
  loginValue?: string;
  errors?: { login?: string; password?: string };
  loginPlaceholder?: string;
  passwordPlaceholder?: string;
  forgotPasswordText?: string;
  submitLoginText?: string;
}

export class AuthForm {
    private errors: { login?: string; password?: string } = {};
    private formData: { login?: string; password?: string } = {};

    constructor() {
        this.bindEvents();
    }

    private validateLogin(login: string): string | null {
        if (!login.trim()) return 'Логин обязателен для заполнения';
        if (login.length < 11) return 'Логин должен содержать минимум 11 символа';
        return null;
    }

    private validatePassword(password: string): string | null {
        if (!password) return 'Пароль обязателен для заполнения';
        if (password.length < 8) return 'Пароль должен содержать минимум 8 символов';
        return null;
    }
    
    private validateForm(): boolean {
        this.errors = {};

        const loginError = this.validateLogin(this.formData.login || '');
        if (loginError) this.errors.login = loginError;

        const passwordError = this.validatePassword(this.formData.password || '');
        if (passwordError) this.errors.password = passwordError;

        return Object.keys(this.errors).length === 0;
    }

    private handleInputChange(event: Event) {
        const target = event.target as HTMLInputElement;
        
        if (target.id === 'login') {
            this.formData.login = target.value;
        } else if (target.id === 'password') {
            this.formData.password = target.value;
        }

        // Очищаем ошибку при вводе
        if (this.errors[target.id as keyof typeof this.errors]) {
            delete this.errors[target.id as keyof typeof this.errors];
            this.rerender();
        }
    }

    private handleSubmit(event: Event) {
        event.preventDefault();
        
        if (this.validateForm()) {
            console.log('Форма валидна, данные:', this.formData);
            // Отправка данных на сервер
        } else {
            this.rerender();
        }
    }

    private bindEvents() {
        setTimeout(() => {
            const form = document.querySelector('.auth-form');
            const loginInput = document.querySelector('#login');
            const passwordInput = document.querySelector('#password');

            if (form) {
                form.addEventListener('submit', (e) => this.handleSubmit(e));
            }

            if (loginInput) {
                loginInput.addEventListener('input', (e) => this.handleInputChange(e));
                loginInput.addEventListener('blur', (e) => {
                    const target = e.target as HTMLInputElement;
                    const error = this.validateLogin(target.value);
                    if (error) {
                        this.errors.login = error;
                        this.rerender();
                    }
                });
            }

            if (passwordInput) {
                passwordInput.addEventListener('input', (e) => this.handleInputChange(e));
                passwordInput.addEventListener('blur', (e) => {
                    const target = e.target as HTMLInputElement;
                    const error = this.validatePassword(target.value);
                    if (error) {
                        this.errors.password = error;
                        this.rerender();
                    }
                });
            }
        }, 0);
    }

    private rerender() {
        const formContainer = document.querySelector('.auth-form');
        if (formContainer) {
            const newForm = this.render();
            formContainer.outerHTML = newForm;
            this.bindEvents();
        }
    }

    render(): string {
        const data: AuthFormProps = {
            loginPlaceholder: AUTH_PAGE_TEXTS.loginInputPlaceholder,
            passwordPlaceholder: AUTH_PAGE_TEXTS.passwordInputPlaceholder,
            forgotPasswordText: AUTH_PAGE_TEXTS.forgotPasswordText,
            submitLoginText: AUTH_PAGE_TEXTS.submitLoginButtonText,
            errors: this.errors,
            loginValue: this.formData.login
        };

        return template(data);
    }
}