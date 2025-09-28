/**
 * @module Login
 * @description Login component with form validation
 */

import Component from '../../js/Component.js';
import Api from '../../js/Api.js';

export default class Login extends Component {
    constructor() {
        super('public/components/Login/Login.hbs');
        this.errors = {};
    }

    getTemplateData() {
        return {
            errors: this.errors,
            formData: {
                login: document.getElementById('login')?.value || '',
                password: document.getElementById('password')?.value || ''
            }
        };
    }

    validateForm(formData) {
        const errors = {};
        const login = formData.get('login');
        const password = formData.get('password');

        if (!login) {
            errors.login = 'Введите логин или email';
        }

        if (!password) {
            errors.password = 'Пароль обязателен';
        } else if (password.length < 6) {
            errors.password = 'Пароль должен быть не менее 6 символов';
        }

        return errors;
    }

    async attachEventListeners() {
        const loginButton = document.getElementById('loginButton');
        const links = document.querySelectorAll('a');

        if (loginButton) {
            loginButton.addEventListener('click', async (e) => {
                e.preventDefault();
                const formData = new FormData();
                const loginInput = document.getElementById('login');
                const passwordInput = document.getElementById('password');

                if (loginInput && passwordInput) {
                    formData.append('login', loginInput.value);
                    formData.append('password', passwordInput.value);

                    this.errors = this.validateForm(formData);

                    if (Object.keys(this.errors).length === 0) {
                        try {
                            await Api.login({
                                login: formData.get('login'),
                                password: formData.get('password')
                            });
                            const inbox = await Api.getInbox();
                            console.log('Inbox:', inbox);
                            window.location.href = '/inbox';
                        } catch (error) {
                            this.errors.general = error.message || 'Неверный логин или пароль';
                            await this.render();
                        }
                    } else {
                        await this.render();
                    }
                }
            });
        }

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

        const phoneLink = document.querySelector('[data-type="phone"]');
        if (phoneLink) {
            phoneLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('navigate', { 
                    detail: { path: '/login/phone' }
                }));
            });
        }
    }

    async render() {
        const template = await this.loadTemplate();
        const container = document.createElement('div');
        container.innerHTML = template(this.getTemplateData());
        
        const root = document.getElementById('root');
        root.innerHTML = '';
        root.appendChild(container.firstElementChild);
        
        this.attachEventListeners();
        return container.firstElementChild;
    }
}
