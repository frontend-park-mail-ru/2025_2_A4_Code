/**
 * 
 * @module Api
 * @description Service for handling API requests
 */

const API_BASE = 'http://localhost:5000';

class Api {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    async fetchJSON(url, options = {}) {
        const response = await fetch(this.baseUrl + url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include',
        });
        let data = {};
        try {
            data = await response.json();
        } catch (e) {}
        if (!response.ok) {
            throw new Error(data.message || 'Ошибка запроса');
        }
        return data;
    }

    login(credentials) {
        return this.fetchJSON('/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    }

    signup(userData) {
        return this.fetchJSON('/signup', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    getInbox() {
        return this.fetchJSON('/inbox', { method: 'GET' });
    }
}

export default new Api(API_BASE);