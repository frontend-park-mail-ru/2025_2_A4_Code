import {Component} from "./Component";

export type SlotContent = { [slotName: string]: HTMLElement | Component };

export abstract class Layout extends Component {
    private slots: Map<string, HTMLElement> = new Map();
    private slotComponents: Map<string, Component> = new Map();

    protected abstract renderTemplate(): string;

    public render(slots: SlotContent = {}): HTMLElement {
        const template = this.renderTemplate();
        this.element = this.createElement(template);

        this.slots.clear();
        this.slotComponents.clear();

        this.element.querySelectorAll('[data-slot]').forEach((node) => {
            const el = node as HTMLElement;
            const name = el.getAttribute('data-slot');
            if (name) {
                this.slots.set(name, el);
            }
        });

        Object.entries(slots).forEach(([slotName, content]) => {
            const slotElement = this.slots.get(slotName);
            if (!slotElement) {
                return;
            }

            if (content instanceof Component) {
                const childEl = content.render();
                slotElement.appendChild(childEl);
                content.mount(slotElement).then();
                this.slotComponents.set(slotName, content);
            } else {
                slotElement.appendChild(content);
                this.slotComponents.delete(slotName);
            }
        });

        return this.element;
    }

    public async updateSlot(slotName: string, content: HTMLElement | Component): Promise<void> {
        let slotElement: HTMLElement | null = this.slots.get(slotName) ?? null;
        if (!slotElement && this.element) {
            slotElement = this.element.querySelector(`[data-slot="${slotName}"]`) as HTMLElement | null;
            if (slotElement) {
                this.slots.set(slotName, slotElement);
            }
        }

        if (!slotElement) {
            console.warn(`Slot ${slotName} not found`);
            return;
        }

        const prevComponent = this.slotComponents.get(slotName);
        if (prevComponent) {
            await prevComponent.unmount();
            this.slotComponents.delete(slotName);
        }

        slotElement.innerHTML = '';

        if (content instanceof Component) {
            const childEl = content.render();
            slotElement.appendChild(childEl);
            await content.mount(slotElement);
            this.slotComponents.set(slotName, content);
        } else {
            slotElement.appendChild(content);
        }
    }

    public async fillSlots(slots: SlotContent): Promise<void> {
        for (const [slotName, content] of Object.entries(slots)) {
            await this.updateSlot(slotName, content);
        }
    }

    public async unmount(): Promise<void> {
        for (const [, component] of this.slotComponents) {
            await component.unmount();
        }
        this.slotComponents.clear();
        await super.unmount();
        this.slots.clear();
    }
}

