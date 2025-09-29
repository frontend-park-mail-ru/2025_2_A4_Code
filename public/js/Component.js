/**
 * @module Component
 * @description Базовый компонент с загрузкой и рендерингом Handlebars-шаблона
 */


/**
 * Класс компонента
 */
export default class Component {
    /**
     * Создание компонента
     * @param {string} templatePath Абсолютный путь к Handlebars-шаблону под public/
     */
    constructor(templatePath) {
        this.templatePath = templatePath;
        this.errors = {};
        this._templatePromise = null;
    }

    /**
     * Загрузка и компиляция Handlebars-шаблона (кэширование на уровне экземпляра)
     * @returns {Promise<HandlebarsTemplateDelegate<any>>}
     */
    async loadTemplate() {
        if (!this._templatePromise) {
            this._templatePromise = (async () => {
                const response = await fetch(this.templatePath);

                if (!response.ok) {
                    throw new Error(`Failed to load template: ${response.statusText}`);
                }
                const templateText = await response.text();
                return Handlebars.compile(templateText);
            })();
        }
        return this._templatePromise;
    }

    /**
     * Рендеринг компонента в #root
     * @returns {Promise<HTMLElement>} Рендеренный корневой элемент
     */
    async render() {
        const template = await this.loadTemplate();
        
        const container = document.createElement('div');
        container.innerHTML = template(this.getTemplateData());

       
        const root = document.getElementById('root');
        const existingContent = document.querySelector(this.getRootSelector());
        
        if (existingContent) {
            existingContent.replaceWith(container.firstElementChild);
        } else {
            root.innerHTML = '';
            root.appendChild(container.firstElementChild);
        }
        
        this.attachEventListeners();
        return container.firstElementChild;
    }


    getTemplateData() {
        return {};
    }

    getRootSelector() {
        return '.form';
    }

    attachEventListeners() {}
}