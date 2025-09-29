/**
 * @module LoginPhone
 * @description Компонент входа по телефону
 */

import Component from '../../js/Component.js';
import Api from '../../js/Api.js';

export default class LoginPhone extends Component {
    constructor() {
        super('/components/Login/LoginPhone.hbs');
    }

    getTemplateData() {
        return {
            errors: this.errors,
            formData: {
                phone: document.getElementById('phone')?.value || '',
                password: document.getElementById('password')?.value || ''
            }
        };
    }

    validateForm(formData) {
        const errors = {};
        const phone = formData.get('phone');
        const password = formData.get('password');

        if (!phone) {
            errors.phone = 'Введите номер телефона';
        } else if (!/^\+?[1-9]\d{10,14}$/.test(phone.replace(/\D/g, ''))) {
            errors.phone = 'Некорректный номер телефона';
        }

        if (!password) {
            errors.password = 'Введите пароль';
        } else if (password.length < 6) {
            errors.password = 'Пароль должен быть не менее 6 символов';
        }

        return errors;
    }

    async attachEventListeners() {
        const form = document.querySelector('form');
        const loginButton = document.getElementById('loginButton');
        const links = document.querySelectorAll('a');

        const submitHandler = async (e) => {
            e.preventDefault();
            const currentForm = e.target.closest('form') || form;
            if (!currentForm) return;
            const formData = new FormData(currentForm);
            this.errors = this.validateForm(formData);

            if (Object.keys(this.errors).length === 0) {
                try {
                    await Api.login({
                        login: formData.get('phone'),
                        password: formData.get('password')
                    });
                    window.dispatchEvent(new CustomEvent('navigate', { 
                        detail: { path: '/inbox' }
                    }));
                } catch (error) {
                    this.errors.general = error.message || 'Неверный телефон или пароль';
                    await this.render();
                }
            } else {
                await this.render();
            }
        };

        if (form) {
            form.addEventListener('submit', submitHandler);
        }
        if (loginButton) {
            loginButton.addEventListener('click', submitHandler);
        }

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

        const emailLink = document.querySelector('[data-type="email"]');
        if (emailLink) {
            emailLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('navigate', { 
                    detail: { path: '/login' }
                }));
            });
        }

        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 0) {
                    if (!value.startsWith('7')) {
                        value = '7' + value;
                    }
                    value = '+' + value;
                    if (value.length > 12) {
                        value = value.slice(0, 12);
                    }
                }
                e.target.value = value;
            });
        }
    }

    async render() {
        const container = document.createElement('div');
        const template = await this.loadTemplate();
        container.innerHTML = template({ 
            errors: this.errors,
            formData: {
                phone: document.getElementById('phone')?.value || '',
                password: document.getElementById('password')?.value || ''
            }
        });
        const existingForm = document.querySelector('.form');
        if (existingForm) {
            existingForm.replaceWith(container.firstElementChild);
        } else {
            document.getElementById('root').appendChild(container.firstElementChild);
        }
        this.attachEventListeners();
        return container.firstElementChild;
    }
}