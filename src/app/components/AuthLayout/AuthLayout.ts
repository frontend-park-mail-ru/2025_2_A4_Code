import template from './AuthLayout.hbs';
import './AuthLayout.scss';

export class AuthLayout {
    render(content: string): string {
        return template({content});
    }
}