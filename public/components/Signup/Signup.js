/**
 * @module Signup
 * @description Signup component with form validation
 */

import Component from '../../js/Component.js';
import Api from '../../js/Api.js';

export default class Signup extends Component {
    constructor() {
        super('public/components/Signup/Signup.hbs');
        this.errors = {};
    }

    getTemplateData() {
        return {
            errors: this.errors,
            formData: {
                username: document.getElementById('username')?.value || '',
                email: document.getElementById('email')?.value || '',
                password: document.getElementById('password')?.value || '',
                confirmPassword: document.getElementById('confirmPassword')?.value || ''
            }
        };
    }

    validateForm(formData) {
        const errors = {};
        const username = formData.get('username');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        if (!username) {
            errors.username = 'Имя пользователя обязательно';
        } else if (username.length < 3) {
            errors.username = 'Имя пользователя должно быть не менее 3 символов';
        }

        if (!email) {
            errors.email = 'Email обязателен';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = 'Некорректный формат email';
        }

        if (!password) {
            errors.password = 'Пароль обязателен';
        } else if (password.length < 6) {
            errors.password = 'Пароль должен быть не менее 6 символов';
        }

        if (!confirmPassword) {
            errors.confirmPassword = 'Подтверждение пароля обязательно';
        } else if (password !== confirmPassword) {
            errors.confirmPassword = 'Пароли не совпадают';
        }

        return errors;
    }

    async attachEventListeners() {
        const form = document.getElementById('signupForm');
        console.log('attachEventListeners called', form);
        if (!form) return;
        const links = document.querySelectorAll('a');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('submit handler called');
            const formData = new FormData(form);
            this.errors = this.validateForm(formData);

            if (Object.keys(this.errors).length === 0) {
                try {
                    await Api.signup({
                        login: formData.get('username'),
                        password: formData.get('password'),
                        username: formData.get('publicname'),
                        date_of_birth: formData.get('birthday'),
                        gender: formData.get('gender')
                    });
                    window.location.href = '/login';
                } catch (error) {
                    this.errors.general = error.message || 'Ошибка регистрации';
                    await this.render();
                }
            } else {
                await this.render();
            }
        });

        // Handle navigation links
        if (links) {
            links.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const href = link.getAttribute('href');
                    if (href && href !== '#') {
                        window.dispatchEvent(new CustomEvent('navigate', { 
                            detail: { path: href }
                        }));
                    }
                });
            });
        }
    }

    async render() {
        console.log('Signup render called');
        const template = await this.loadTemplate();
        const container = document.createElement('div');
        container.innerHTML = template(this.getTemplateData());

        // Заменяем текущий контент новым
        const existingForm = document.querySelector('.form');
        if (existingForm) {
            existingForm.replaceWith(container.firstElementChild);
        } else {
            document.getElementById('root').appendChild(container.firstElementChild);
        }

        await this.attachEventListeners();
        return container.firstElementChild;
    }
}
