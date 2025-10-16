import Handlebars from 'handlebars';
import template from './LoginLayout.hbs';
import './LoginLayout.scss';

export class LoginLayout {
    render(content: string): string {
        return template({content});
    }
}