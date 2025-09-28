/**
 * @module LoginPhone
 * @description Login with phone component
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
        const loginButton = document.getElementById('loginButton');
        const links = document.querySelectorAll('a');

        loginButton.addEventListener('click', async (e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.append('phone', document.getElementById('phone').value);
            formData.append('password', document.getElementById('password').value);
            
            this.errors = this.validateForm(formData);

            if (Object.keys(this.errors).length === 0) {
                try {
                    await Api.login({
                        login: formData.get('phone'),
                        password: formData.get('password')
                    });
                    window.location.href = '/inbox';
                } catch (error) {
                    this.errors.general = error.message || 'Неверный телефон или пароль';
                    await this.render();
                }
            } else {
                await this.render();
            }
        });

        // Обработка ссылок для SPA навигации
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

        // Обработка переключения на вход по email
        const emailLink = document.querySelector('[data-type="email"]');
        if (emailLink) {
            emailLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('navigate', { 
                    detail: { path: '/login' }
                }));
            });
        }

        // Форматирование телефонного номера при вводе
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
        // Заменяем текущий контент новым
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