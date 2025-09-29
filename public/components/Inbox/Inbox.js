/**
 * @module Inbox
 * @description Компонент входящих писем
 */

import Component from '../../js/Component.js';
import Api from '../../js/Api.js';

export default class Inbox extends Component {
    constructor() {
        super('/components/Inbox/Inbox.hbs');
        this.messages = [];
        this.loading = true;
        this.error = '';
    }

    /**
     * Шаблонные данные для рендеринга
     * @returns {{messages:any[],loading:boolean,error:string}}
     */
    getTemplateData() {
        return {
            messages: this.messages,
            loading: this.loading,
            error: this.error,
        };
    }

    /**
     * Загрузка входящих писем
     * @returns {Promise<void>}
     */
    async loadData() {
        this.loading = true;
        this.error = '';
        try {
            const res = await Api.getInbox();
            // TODO: взять один формат, который будет по итогу
            let list = [];
            if (Array.isArray(res)) {
                list = res;
            } else if (Array.isArray(res?.body)) {
                list = res.body;
            } else if (Array.isArray(res?.messages)) {
                list = res.messages;
            } else if (Array.isArray(res?.body?.messages)) {
                list = res.body.messages;
            } else {
                list = [];
            }
            this.messages = list.map(m => ({
                ...m,
                datetime: m.datetime
            }));
        } catch (e) {
            this.error = e?.message || 'Не удалось загрузить письма';
        } finally {
            this.loading = false;
        }
    }

    /**
     * Рендеринг компонента
     * @returns {Promise<HTMLElement|null>}
     */
    async render() {
        this.ensureStyles();

        // Сначала грузим данные, затем рендерим
        await this.loadData();
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

    /**
     * Биндим обработчики
     */
    attachEventListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await Api.logout();
                } catch (e) {
                    console.log(e);
                    // ignore
                } finally {
                    window.dispatchEvent(new CustomEvent('navigate', { detail: { path: '/login' } }));
                }
            });
        }
    }

    /**
     * Подключаем стили
     */
    ensureStyles() {
        const id = 'inbox-css';
        if (!document.getElementById(id)) {
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = '/css/inbox.css';
            document.head.appendChild(link);
        }
    }
}
