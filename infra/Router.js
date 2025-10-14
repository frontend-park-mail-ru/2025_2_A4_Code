export class Router {
  constructor() {
    this.routes = [];
    this.currentRoute = null;
    this.routeChangeCallbacks = [];
  }

  async init() {
    window.addEventListener('hashchange', () => {
      this.handleHashChange();
    });

    await this.handleHashChange();
  }

  onRouteChange(callback) {
    this.routeChangeCallbacks.push(callback);
  }

  async handleHashChange() {
    let hash = window.location.hash.slice(1);
    
    // Если хэш пустой, используем корневой путь
    if (hash === '') {
      hash = '/';
    }
    
    const route = this.findRoute(hash);

    if (route) {
      this.currentRoute = route;
      this.notifyRouteChange(route);
    } else {
      this.showNotFound();
    }
  }

  findRoute(path) {
    return this.routes.find(route => route.path === path);
  }

  notifyRouteChange(route) {
    this.routeChangeCallbacks.forEach(callback => {
      callback(route);
    });
  }

  showNotFound() {
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h2>Page Not Found</h2>
          <p>The page you're looking for doesn't exist.</p>
          <button onclick="window.location.hash = '#/'">Go Home</button>
        </div>
      `;
    }
  }

  addRoute(path, component) {
    this.routes.push({ path, component });
  }
}