/**
 * @module Loading
 * @description Компонент загрузки
 */

export default class Loading {
    constructor() {
        this.element = this.createElement();
    }

    createElement() {
        const div = document.createElement('div');
        div.className = 'loading';
        div.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Загрузка...</div>
        `;
        return div;
    }

    show(parent) {
        parent.appendChild(this.element);
    }

    hide() {
        this.element?.remove();
    }
}