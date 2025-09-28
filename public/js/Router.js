/**
 * @module Router
 * @description Handles client-side routing in the SPA
 */

export default class Router {
    constructor(routes) {
        this.routes = routes;
        this.currentRoute = null;
        
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            this.navigate(window.location.pathname, false);
        });
    }

    /**
     * Initialize the router
     */
    init() {
        this.navigate(window.location.pathname);
    }

    /**
     * Navigate to a specific path
     * @param {string} path - The path to navigate to
     * @param {boolean} [pushState=true] - Whether to add the route to browser history
     */
    async navigate(path, pushState = true) {
        try {
            // Find matching route
            const route = this.routes.find(route => {
                if (typeof route.path === 'string') {
                    return route.path === path;
                }
                return route.path.test(path);
            });

            if (!route) {
                // Handle 404
                path = '/404';
                return;
            }

            if (pushState) {
                window.history.pushState(null, '', path);
            }

            this.currentRoute = route;

            // Показываем загрузку
            const root = document.getElementById('root');
            root.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Загрузка...</div>
                </div>
            `;

            // Создаем компонент
            const view = await Promise.resolve(route.component());
            // Дожидаемся загрузки шаблона и рендерим компонент
            await view.loadTemplate();
            await view.render();

        } catch (error) {
            console.error('Error during navigation:', error);
            const root = document.getElementById('root');
            root.innerHTML = `
                <div class="error">
                    <h1>Произошла ошибка</h1>
                    <p>${error.message || 'Попробуйте перезагрузить страницу'}</p>
                </div>
            `;
        }
    }
}