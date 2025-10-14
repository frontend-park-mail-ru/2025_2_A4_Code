import { Router } from '../infra/Router.js';
import { MainLayout } from './components/Layout/MainLayout/MainLayout.js';
import { AuthLayout } from './components/Layout/AuthLayout/AuthLayout.js';
import { LoginPage } from '../routes/Login/LoginPage.js';
import { RegisterPage } from '../routes/Register/RegisterPage.js';
import { InboxPage } from '../routes/Inbox/InboxPage.js';

export class App {
  constructor() {
    this.router = new Router();
    this.currentLayout = null;
  }

  async init() {
    try {
      console.log('Initializing A4_Mail application...');
      
      // Добавляем маршруты
      this.setupRoutes();
      
      // Инициализируем роутер
      await this.router.init();
      
      // Настраиваем обработчик смены маршрутов
      this.setupRouteHandler();
      
      console.log('Application initialized successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
    }
  }

  setupRoutes() {
    this.router.addRoute('/login', new LoginPage());
    this.router.addRoute('/register', new RegisterPage());
    this.router.addRoute('/inbox', new InboxPage());
    this.router.addRoute('/', new InboxPage()); // Главная страница
  }

  setupRouteHandler() {
    this.router.onRouteChange((route) => {
      this.handleRouteChange(route);
    });
  }

  async handleRouteChange(route) {
    try {
      // Определяем тип layout на основе маршрута
      const layoutType = this.getLayoutType(route.path);
      
      // Переключаем layout если нужно
      await this.switchLayout(layoutType);
      
      // Рендерим контент страницы в layout
      if (route.component && this.currentLayout) {
        const pageContent = await route.component.render();
        this.currentLayout.setContent(pageContent);
      }
    } catch (error) {
      console.error('Error handling route change:', error);
      this.showErrorPage();
    }
  }

  getLayoutType(path) {
    const authPaths = ['/login', '/register'];
    return authPaths.includes(path) ? 'auth' : 'main';
  }

  async switchLayout(layoutType) {
    // Если текущий layout уже подходит - ничего не делаем
    if (
      (layoutType === 'auth' && this.currentLayout instanceof AuthLayout) ||
      (layoutType === 'main' && this.currentLayout instanceof MainLayout)
    ) {
      return;
    }

    // Удаляем старый layout
    if (this.currentLayout) {
      this.currentLayout.destroy();
    }

    // Создаем новый layout
    this.currentLayout = layoutType === 'auth' 
      ? new AuthLayout() 
      : new MainLayout();

    // Рендерим layout в DOM
    const layoutElement = this.currentLayout.render();
    const root = document.getElementById('root');
    
    if (root) {
      root.innerHTML = '';
      root.appendChild(layoutElement);
    }
  }

  showErrorPage() {
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h2>Something went wrong</h2>
          <p>Please try refreshing the page</p>
          <button onclick="window.location.hash = '#/'">Go Home</button>
        </div>
      `;
    }
  }
}