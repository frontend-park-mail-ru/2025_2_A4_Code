/**
 * @module Signup
 * @description Signup component
 */

import Component from '../../js/Component.js';
import Api from '../../js/Api.js';
import { validateSignup, mapBackendError } from '../../js/validation.js';

export default class Signup extends Component {
    constructor() {
        super('/components/Signup/Signup.hbs');
        this.errors = {};
    }

    getTemplateData() {
        return {
            errors: this.errors,
            formData: {
                publicname: document.getElementById('publicname')?.value || '',
                username: document.getElementById('username')?.value || '',
                birthday: document.getElementById('birthday')?.value || '',
                password: document.getElementById('password')?.value || '',
                repeatpassword: document.getElementById('repeatpassword')?.value || '',
                isFemale: document.querySelector('input[name="gender"][value="female"]')?.checked || false,
                isMale: document.querySelector('input[name="gender"][value="male"]')?.checked || false,
            }
        };
    }

    /**
     * Обработчик submit
     * @param {Event} e
     */

    async handleSubmit(e) {
        e.preventDefault();
        const form = e.target.closest('form');
        if (!form) return;

        const fd = new FormData(form);
        const values = {
            publicname: fd.get('publicname') || '',
            username: fd.get('username') || '',
            birthday: fd.get('birthday') || '',
            password: fd.get('password') || '',
            repeatpassword: fd.get('repeatpassword') || '',
            gender: fd.get('gender') || '',
        };
        this.errors = validateSignup(values);

        if (Object.keys(this.errors).length === 0) {
            try {
                await Api.signup({
                    login: values.username,
                    password: values.password,
                    username: values.publicname,
                    date_of_birth: values.birthday,
                    gender: values.gender
                });
                window.dispatchEvent(new CustomEvent('navigate', { 
                    detail: { path: '/login' }
                }));
                
            } catch (error) {
                this.errors = mapBackendError(error);
                await this.render();
            }
        } else {
            await this.render();
        }
    }

    attachEventListeners() {
        const form = document.querySelector('form');
        const links = document.querySelectorAll('a');

        if (form) {
            form.addEventListener('submit', this.handleSubmit.bind(this));
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
