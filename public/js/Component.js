/**
 * @module Component
 * @description Base component class with template loading functionality
 */

export default class Component {
    constructor(templatePath) {
        this.templatePath = templatePath;
        this.errors = {};
        this._templatePromise = null;
    }

    async loadTemplate() {
        if (!this._templatePromise) {
            this._templatePromise = (async () => {
                try {
                    console.log('Loading template from:', this.templatePath);
                    const response = await fetch(this.templatePath);
                    if (!response.ok) {
                        throw new Error(`Failed to load template: ${response.statusText}`);
                    }
                    const templateText = await response.text();
                    console.log('Template loaded:', templateText);
                    return Handlebars.compile(templateText);
                } catch (error) {
                    console.error('Error loading template:', error);
                    console.error('Template path was:', this.templatePath);
                    throw error;
                }
            })();
        }
        return this._templatePromise;
    }

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

    attachEventListeners() {
    }
}