/**
 * 
 * @module Api
 * @description Сервис API
 */

/**
 * Backend URL
 * @type {string}
 */
const API_BASE = 'http://localhost:5000';

/**
 * Класс API
 */
class Api {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * Базовый метод для фетчинка JSON
     * @param {string} url отностиельный путь
     * @param {RequestInit} [options]
     * @returns {Promise<any>}
     */
    async fetchJSON(url, options = {}) {
        const init = {
            ...options,
            headers: {
                ...(options.headers || {}),
            },
            credentials: 'include',
        };

        if (init.body && !('Content-Type' in (init.headers || {}))) {
            init.headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(this.baseUrl + url, init);
        let data = {};
        try {
            data = await response.json();
        } catch (e) {
            console.log(e);
        }
        if (!response.ok) {
            const error = new Error(data?.message || response.statusText || 'Ошибка запроса');
            error.status = response.status;
            throw error;
        }
        return data;
    }

    /**
     * Авторизация
     * @param {{login:string,password:string}} credentials
     * @returns {Promise<any>}
     */
    login(credentials) {
        return this.fetchJSON('/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    }

    /**
     * Регистрация
     * @param {{login:string,password:string,username:string,date_of_birth:string,gender:string}} userData
     * @returns {Promise<any>}
     */
    signup(userData) {
        return this.fetchJSON('/signup', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    /**
     * Получение писем
     * @returns {Promise<any>}
     */
    getInbox() {
        return this.fetchJSON('/inbox', { method: 'GET' });
    }

    /**
     * Проверка валидности сессии (куки) — бэкенд вернёт 200 при валидном токене
     * @returns {Promise<any>}
     */
    healthCheck() {
        return this.fetchJSON('/', { method: 'GET' });
    }

    /**
     * Выход: сервер должен очистить cookie (session_id)
     * @returns {Promise<any>}
     */
    logout() {
        return this.fetchJSON('/logout', { method: 'POST' });
    }
}

export default new Api(API_BASE);