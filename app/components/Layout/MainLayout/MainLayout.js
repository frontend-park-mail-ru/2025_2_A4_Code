import { BaseLayout } from '../BaseLayout/BaseLayout.js';

export class MainLayout extends BaseLayout {
  constructor() {
    super();
    this.contentContainer = null;
  }

  render() {
    const template = `
      <div class="main-layout">
        <aside class="main-layout__sidebar">
          <nav class="sidebar">
            <h3>A4_Mail</h3>
            <ul class="sidebar__menu">
              <li><a href="#/inbox" class="sidebar__link">Inbox</a></li>
              <li><a href="#/sent" class="sidebar__link">Sent</a></li>
              <li><a href="#/drafts" class="sidebar__link">Drafts</a></li>
              <li><a href="#/settings" class="sidebar__link">Settings</a></li>
            </ul>
          </nav>
        </aside>
        
        <div class="main-layout__main">
          <header class="main-layout__header">
            <div class="header">
              <button class="header__menu-toggle">☰</button>
              <h1 class="header__title">A4 Mail</h1>
              <div class="header__user">
                <span>User Name</span>
              </div>
            </div>
          </header>
          
          <main class="main-layout__content" id="main-content">
            <!-- Content will be injected here -->
            <div class="loading">Loading...</div>
          </main>
        </div>
      </div>
    `;

    this.element = this.createElementFromHTML(template);
    this.contentContainer = this.element.querySelector('#main-content');
    
    // Добавляем обработчики событий
    this.setupEventListeners();
    
    return this.element;
  }

  setContent(content) {
    if (!this.contentContainer) return;

    if (typeof content === 'string') {
      this.contentContainer.innerHTML = content;
    } else {
      this.contentContainer.innerHTML = '';
      this.contentContainer.appendChild(content);
    }
  }

  setupEventListeners() {
    const menuToggle = this.element.querySelector('.header__menu-toggle');
    const sidebar = this.element.querySelector('.main-layout__sidebar');
    
    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar--collapsed');
      });
    }
  }

  destroy() {
    // Дополнительная очистка для MainLayout
    this.contentContainer = null;
    super.destroy();
  }
}