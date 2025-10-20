import {Router} from '../infra';

import {AuthLayout} from "./components/AuthLayout/AuthLayout";
import {MainLayout} from "./components/MainLayout/MainLayout";

import {AuthPage} from "../routes/auth";
import {RegisterPage} from "../routes/register";
import {InboxPage} from "../routes/inbox";

export class App {
    private router: Router = new Router();

    private authPage: AuthPage = new AuthPage(this.router);
    private registerPage: RegisterPage = new RegisterPage(this.router);
    private inboxPage: InboxPage = new InboxPage(this.router);

    constructor() {
        this.router.addRoute('/auth', this.authPage, AuthLayout);
        this.router.addRoute('/register', this.registerPage, AuthLayout);
        this.router.addRoute('/inbox', this.inboxPage, MainLayout);

        this.router.init();
    }

    init() {
        // TODO: вызвать метод апи для проверки логина и после этого делать нужный роутинг
        this.router.navigate('/inbox');
        //this.router.navigate('/auth');
    }
}