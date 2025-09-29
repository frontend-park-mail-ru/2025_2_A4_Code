/**
 * @module App
 * @description Main application component
 */

import Router from '../js/Router.js';
import Login from './Login/Login.js';
import Signup from './Signup/Signup.js';

export default class App {
    constructor(parent) {
        this.parent = parent;
        
        this.router = new Router([
            { path: '/', component: () => new Login() },
            { path: '/login', component: () => new Login() },
            { path: '/signup', component: () => new Signup() }
        ]);
    }

    render() {
        const container = document.createElement('div');
        container.classList.add('app');
        
        this.router.init();
        
        return container;
    }
}
