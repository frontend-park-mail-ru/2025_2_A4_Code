export abstract class Component<TProps = any> {
    protected props: TProps;
    protected children: Component[] = [];
    protected element: HTMLElement | null = null;

    constructor(props: TProps = {} as TProps) {
        this.props = props;
    }

    protected abstract renderTemplate(): string;

    /**
     * Lifecycle hook that runs after the element has been rendered and appended.
     * Subclasses can override it to attach listeners or perform additional setup.
     */
    protected afterRender(): void {}

    protected createElement(html: string): HTMLElement {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html.trim();
        const element = wrapper.firstElementChild as HTMLElement;
        if (!element) {
            throw new Error("Failed to parse HTML string into HTMLElement");
        }
        return element;
    }

    public render(): HTMLElement {
        const childElements = this.children.map((child) => child.render());
        const template = this.renderTemplate();
        this.element = this.createElement(template);

        const childrenContainer = this.element.querySelector('[data-slot="children"]') || this.element;
        childElements.forEach((child) => childrenContainer.appendChild(child));

        try {
            this.afterRender();
        } catch {
            // ignore hook failures to avoid breaking render flow
        }

        return this.element;
    }

    public async mount(rootElement?: HTMLElement): Promise<void> {
        if (rootElement && this.element) {
            rootElement.appendChild(this.element);
        }
    }

    public async unmount(): Promise<void> {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
        for (const child of this.children) {
            await child.unmount();
        }
    }

    public addChild(child: Component): void {
        this.children.push(child);
    }

    public setProps(newProps: Partial<TProps>): void {
        this.props = { ...this.props, ...newProps };
        if (this.element) {
            const parent = this.element.parentElement;
            this.unmount().then(() => {
                const newElement = this.render();
                if (parent) {
                    parent.appendChild(newElement);
                    this.mount().then(() => undefined);
                }
            });
        }
    }

    public getElement(): HTMLElement | null {
        return this.element;
    }
}

