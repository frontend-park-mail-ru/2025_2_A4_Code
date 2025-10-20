import template from './views/InboxPage.hbs';
import './views/InboxPage.scss';
import {Router} from "../../infra";

export class InboxPage {
    constructor(private router: Router) {}

    render(): string {
        const data = {};

        return template(data);
    }
}