/**
 * @module Router
 * @description Роутер
 */

export default class Router {
    constructor(routes) {
        this.routes = routes;
        this.currentRoute = null;
        this.currentView = null;
        
        this.navigate = this.navigate.bind(this);
        this.handlePopState = this.handlePopState.bind(this);
        
        window.addEventListener('popstate', this.handlePopState);
    }

    /**
     * Инициализация роутера
     * @returns {Promise<void>}
     */
    async init() {
        // Set up global navigation handler
        window.navigate = this.navigate;
        
        // Initial navigation
        await this.navigate(window.location.pathname, false);
    }
    
    /**
     * Обработка навигации браузера
     * @param {PopStateEvent} event The popstate event
     * @returns {Promise<void>}
     */
    async handlePopState(event) {
        console.log(event);
        await this.navigate(window.location.pathname, false);
    }

    /**
     * Перенавигация
     * @param {string} path Путь для навигации
     * @param {boolean} [pushState=true] Добавление пути в историю браузера
     * @returns {Promise<void>}
     */
    async navigate(path, pushState = true) {
        try {
            if (this.currentView && typeof this.currentView.destroy === 'function') {
                this.currentView.destroy();
            }
            
            const route = this.routes.find(route => {
                if (typeof route.path === 'string') {
                    return route.path === path;
                }
                return route.path.test(path);
            });

            if (!route) {
                console.warn(`Route not found: ${path}`);
                path = '/404';
                const notFoundRoute = this.routes.find(r => r.path === path);
                if (!notFoundRoute) return;
                
                return this.navigate(path, pushState);
            }

            if (pushState && window.location.pathname !== path) {
                window.history.pushState(null, '', path);
            }

            this.currentRoute = route;

            const root = document.getElementById('root');
            if (root) {
                root.innerHTML = `
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Загрузка...</div>
                    </div>
                `;
            }

            try {
                this.currentView = await Promise.resolve(route.component());
                
                if (typeof this.currentView.loadTemplate === 'function') {
                    await this.currentView.loadTemplate();
                }
                
                if (typeof this.currentView.render === 'function') {
                    await this.currentView.render();
                }
                
                window.scrollTo(0, 0);
                
            } catch (error) {
                console.error('Error creating or rendering component:', error);
                throw error;
            }

        } catch (error) {
            console.error('Error during navigation:', error);
            const root = document.getElementById('root');
            if (root) {
                root.innerHTML = `
                    <div class="error">
                        <h1>Произошла ошибка</h1>
                        <p>${error.message || 'Попробуйте перезагрузить страницу'}</p>
                        <button onclick="window.navigate('/')">На главную</button>
                    </div>
                `;
            }
        }
    }
    
    destroy() {
        window.removeEventListener('popstate', this.handlePopState);
        if (this.currentView && typeof this.currentView.destroy === 'function') {
            this.currentView.destroy();
        }
    }
}