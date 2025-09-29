/**
 * @module Login
 * @description Login component
 */

import Component from '../../js/Component.js';
import Api from '../../js/Api.js';
import { validateLogin, mapBackendError } from '../../js/validation.js';

export default class Login extends Component {
    constructor() {
        super('/components/Login/Login.hbs');
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

    /**
     * Handle submit of login form
     * @param {Event} e
     */

    async handleSubmit(e) {
        e.preventDefault();
        const form = e.target.closest('form');
        let values;
        if (form) {
            const fd = new FormData(form);
            values = { login: fd.get('login') || '', password: fd.get('password') || '' };
        } else {
            values = {
                login: document.getElementById('login')?.value || '',
                password: document.getElementById('password')?.value || ''
            };
        }
        this.errors = validateLogin(values);

        if (Object.keys(this.errors).length === 0) {
            try {
                await Api.login({ login: values.login, password: values.password });
                window.dispatchEvent(new CustomEvent('navigate', { 
                    detail: { path: '/inbox' }
                }));
                
            } catch (error) {
                // Маппим сообщение бэкенда в читабельные ошибки
                this.errors = mapBackendError(error);
                await this.render();
            }
        } else {
            await this.render();
        }
    }

    async attachEventListeners() {
        const form = document.querySelector('form');
        const loginButton = document.getElementById('loginButton');
        const links = document.querySelectorAll('a');

        if (form) {
            form.addEventListener('submit', this.handleSubmit.bind(this));
        }
        if (loginButton) {
            loginButton.addEventListener('click', this.handleSubmit.bind(this));
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
        if (root) {
            root.innerHTML = '';
            root.appendChild(container.firstElementChild);
            
            this.attachEventListeners();
            return container.firstElementChild;
        }
        return null;
    }
}
