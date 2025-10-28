import { App } from './app';

const rootElement = document.getElementById('app');
if (!rootElement) {
    throw new Error('Root element #app not found');
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});