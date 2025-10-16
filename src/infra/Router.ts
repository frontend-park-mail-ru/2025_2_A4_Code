import {LoginLayout} from "../app";

export class Router {
    private routes: Map<string, {page: any; layout?: any}> = new Map();
    private defaultLayout: any = LoginLayout;
    private currentRoute: string = '';

    addRoute(path: string, page: any, layout?: any) {
        this.routes.set(path, {page, layout: layout || this.defaultLayout});
    }

    navigate(path: string) {
        const route = this.routes.get(path);
        if (route) {
            this.currentRoute = path;
            const {page, layout} = route;
            const appDiv = document.getElementById('app');
            if (appDiv) {
                const pageContent = page.render();
                const layoutInstance = new (layout || this.defaultLayout)();
                appDiv.innerHTML = layoutInstance.render(pageContent);
            }
        }
    }

    updatePageState(pageInstance: any, updates: any) {
        Object.assign(pageInstance, updates);
        if (this.currentRoute) {
            this.navigate(this.currentRoute);
        }
    }

    init() {
        console.log('Router initialized');
    }
}