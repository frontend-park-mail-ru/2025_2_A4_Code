import template from "./AuthLayout.hbs";
import "./AuthLayout.scss";
import { Component } from "@shared/base/Component";
import type { SlotContent } from "@shared/base/slots";

export class AuthLayout extends Component {
    private slots: Map<string, HTMLElement> = new Map();
    private slotComponents: Map<string, Component> = new Map();

    protected renderTemplate(): string {
        return template({});
    }

    public render(slots: SlotContent = {}): HTMLElement {
        const element = this.createElement(this.renderTemplate());
        this.element = element;
        this.captureSlots();
        this.fillInitialSlots(slots);
        return element;
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

        slotElement.innerHTML = "";

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
        this.slots.clear();
        await super.unmount();
    }

    private captureSlots(): void {
        this.slots.clear();
        this.slotComponents.clear();
        this.element
            ?.querySelectorAll("[data-slot]")
            .forEach((node) => {
                const el = node as HTMLElement;
                const name = el.getAttribute("data-slot");
                if (name) {
                    this.slots.set(name, el);
                }
            });
    }

    private fillInitialSlots(slots: SlotContent): void {
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
            }
        });
    }
}
