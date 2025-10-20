import {AuthLayout} from "../app";

export class Router {
    private routes: Map<string, { page: any; layout?: any }> = new Map();
    private defaultLayout: any = AuthLayout;
    private currentRoute: string = '';

    addRoute(path: string, page: any, layout?: any) {
        this.routes.set(path, { page, layout: layout || this.defaultLayout });
    }

    navigate(path: string, replace: boolean = false) {
        const route = this.routes.get(path);
        if (route) {
            // Обновляем историю
            if (replace) {
                window.history.replaceState({}, '', path);
            } else {
                window.history.pushState({}, '', path);
            }

            this.currentRoute = path;
            this.renderRoute(route);

            // Прокрутка вверх при смене страницы
            window.scrollTo(0, 0);
        } else {
            console.error(`Неизвестный роут: ${path}`);
            this.navigate('/404', true); // Страница 404
        }
    }

    private renderRoute(route: { page: any; layout?: any }) {
        const { page, layout } = route;
        const appDiv = document.getElementById('app');
        if (appDiv) {
            const pageContent = page.render();
            const layoutInstance = new (layout || this.defaultLayout)();
            appDiv.innerHTML = layoutInstance.render(pageContent);
        }
    }

    private handlePopState = (event: PopStateEvent) => {
        const path = window.location.pathname;
        this.currentRoute = path;
        const route = this.routes.get(path);
        if (route) {
            this.renderRoute(route);
        }
    };

    // Получение текущего пути
    getCurrentPath(): string {
        return window.location.pathname;
    }

    // Получение query параметров
    getQueryParams(): URLSearchParams {
        return new URLSearchParams(window.location.search);
    }

    updatePageState(pageInstance: any, updates: any) {
        Object.assign(pageInstance, updates);
        if (this.currentRoute) {
            this.navigate(this.currentRoute, true); // replace = true
        }
    }

    init() {
        const initialPath = this.getCurrentPath();

        // Добавляем маршрут 404, если его нет
        if (!this.routes.has('/404')) {
            this.routes.set('/404', {
                page: { render: () => '<h1>Страница не найдена</h1>' }
            });
        }

        // Обрабатываем начальный маршрут
        if (this.routes.has(initialPath)) {
            this.navigate(initialPath, true);
        } else {
            this.navigate('/', true);
        }

        window.addEventListener('popstate', this.handlePopState);

        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            const link = target.closest('a');

            if (link && link.href && link.target !== '_blank') {
                const url = new URL(link.href);

                // Обрабатываем только внутренние ссылки
                if (url.origin === window.location.origin) {
                    event.preventDefault();
                    this.navigate(url.pathname + url.search);
                }
            }
        });

        console.log('Router initialized');
    }

    // Очистка
    destroy() {
        window.removeEventListener('popstate', this.handlePopState);
    }
}