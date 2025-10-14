export class BaseLayout {
  constructor() {
    this.element = null;
  }

  // Абстрактные методы - должны быть реализованы в дочерних классах
  render() {
    throw new Error('Method "render" must be implemented');
  }

  setContent(content) {
    throw new Error('Method "setContent" must be implemented');
  }

  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }

  createElementFromHTML(htmlString) {
    const div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild;
  }
}