/**
 * @module Main
 * @description Entry point of the application  
 */

import Router from './Router.js';
import Login from '../components/Login/Login.js';
import LoginPhone from '../components/Login/LoginPhone.js';
import Signup from '../components/Signup/Signup.js';

const routes = [
    { path: '/', component: () => new Login() },
    { path: '/login', component: () => new Login() },
    { path: '/login/phone', component: () => new LoginPhone() },
    { path: '/signup', component: () => new Signup() }
];

const router = new Router(routes);

async function initApp() {
    try {
        window.addEventListener('navigate', (event) => {
            const path = event.detail.path;
            router.navigate(path);
        });

        window.addEventListener('popstate', () => {
            router.navigate(window.location.pathname, false);
        });

        await router.init();
        
    } catch (error) {
        console.error('Error initializing app:', error);
        document.getElementById('root').innerHTML = `
            <div class="error">
                <h1>Ошибка при загрузке приложения</h1>
                <p>${error.message || 'Попробуйте перезагрузить страницу'}</p>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', initApp);