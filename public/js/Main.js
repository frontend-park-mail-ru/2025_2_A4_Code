/**
 * @module Main
 * @description Entry point  
 */

import Router from './Router.js';
import Login from '../components/Login/Login.js';
import LoginPhone from '../components/Login/LoginPhone.js';
import Signup from '../components/Signup/Signup.js';
import Inbox from '../components/Inbox/Inbox.js';
import Api from './Api.js';

const routes = [
    { path: '/', component: () => new Login() },
    { path: '/login', component: () => new Login() },
    { path: '/login/phone', component: () => new LoginPhone() },
    { path: '/signup', component: () => new Signup() },
    { path: '/inbox', component: () => new Inbox() }
];

const router = new Router(routes);

window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error:', { message, source, lineno, colno, error });
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = `
            <div class="error">
                <h1>Произошла ошибка</h1>
                <p>${message || 'Попробуйте перезагрузить страницу'}</p>
                <button onclick="window.navigate('/')">На главную</button>
            </div>
        `;
    }
    return true; 
};

async function initApp() {
    try {
        window.addEventListener('navigate', (event) => {
            const path = event.detail.path;
            if (path) {
                router.navigate(path);
            }
        });

        try {
            await Api.healthCheck();
            const initialPath = window.location.pathname;
            if (initialPath === '/' || initialPath === '/login') {
                await router.init();
                await router.navigate('/inbox');
                return;
            }
        } catch (e) {
            console.log(e);
        }

        await router.init();
        
        window.navigate = (path) => {
            if (path) {
                router.navigate(path);
            }
        };
        
    } catch (error) {
        console.error('Error initializing app:', error);
        const root = document.getElementById('root');
        if (root) {
            root.innerHTML = `
                <div class="error">
                    <h1>Ошибка при загрузке приложения</h1>
                    <p>${error.message || 'Попробуйте перезагрузить страницу'}</p>
                    <button onclick="window.location.reload()">Обновить страницу</button>
                </div>
            `;
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}