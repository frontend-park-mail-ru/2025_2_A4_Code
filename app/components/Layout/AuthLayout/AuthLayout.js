import { BaseLayout } from '../BaseLayout/BaseLayout.js';

export class AuthLayout extends BaseLayout {
  constructor() {
    super();
    this.contentContainer = null;
  }

  render() {
    const template = `
      <div class="auth-layout">
        <div class="auth-layout__background">
          <div class="auth-layout__brand">
            <h1>A4 Mail</h1>
            <p>Secure email service</p>
          </div>
        </div>
        
        <main class="auth-layout__content">
          <div class="auth-layout__form-container" id="auth-content">
            <!-- Auth forms will be injected here -->
            <div class="loading">Loading authentication...</div>
          </div>
        </main>
      </div>
    `;

    this.element = this.createElementFromHTML(template);
    this.contentContainer = this.element.querySelector('#auth-content');
    
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
}