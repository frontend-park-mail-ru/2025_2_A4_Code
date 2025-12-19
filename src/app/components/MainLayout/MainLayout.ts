import template from "./MainLayout.hbs";
import "./MainLayout.scss";
import { Component } from "@shared/base/Component";
import type { SlotContent } from "@shared/base/slots";

export class MainLayout extends Component {
    private mainElement: HTMLElement | null = null;
    private sidebarElement: HTMLElement | null = null;
    private sidebarOverlay: HTMLElement | null = null;
    private contentBackgroundEnabled = true;
    private sidebarWidth: string | null = null;
    private loadingElement: HTMLElement | null = null;
    private isLoading = false;
    private mobileSidebarOpen = false;
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
        this.captureLayoutElements();
        this.applyMainBackground();
        this.applySidebarWidth();
        this.applyLoadingState();
        this.updateModalState();
        this.applySidebarState();
        this.triggerTransition();

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
            // console.warn(`Slot ${slotName} not found`);
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

        if (slotName === "modal") {
            this.updateModalState();
        }
        if (slotName === "main") {
            this.triggerTransition();
        }
    }

    public async fillSlots(slots: SlotContent): Promise<void> {
        for (const [slotName, content] of Object.entries(slots)) {
            await this.updateSlot(slotName, content);
        }
    }

    public setContentBackground(enabled: boolean): void {
        this.contentBackgroundEnabled = enabled;
        this.applyMainBackground();
    }

    public setSidebarWidth(width: string | null): void {
        this.sidebarWidth = width;
        this.applySidebarWidth();
    }

    public setLoading(loading: boolean): void {
        this.isLoading = loading;
        this.applyLoadingState();
    }

    public toggleSidebar(): void {
        this.setSidebarOpen(!this.mobileSidebarOpen);
    }

    public setSidebarOpen(open: boolean): void {
        this.mobileSidebarOpen = open;
        this.applySidebarState();
    }

    public closeSidebar(): void {
        this.setSidebarOpen(false);
    }

    public triggerTransition(): void {
        if (!this.mainElement) return;
        this.mainElement.classList.remove("main-layout__main--transition");
        // reflow to restart the animation
        void this.mainElement.offsetWidth;
        this.mainElement.classList.add("main-layout__main--transition");
    }

    public async unmount(): Promise<void> {
        for (const [, component] of this.slotComponents) {
            await component.unmount();
        }
        this.slotComponents.clear();
        this.slots.clear();
        if (this.sidebarOverlay) {
            this.sidebarOverlay.onclick = null;
        }
        this.mainElement = null;
        this.sidebarElement = null;
        this.sidebarOverlay = null;
        this.loadingElement = null;
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
                this.slotComponents.delete(slotName);
            }
        });
    }

    private captureLayoutElements(): void {
        const element = this.element;
        if (!element) return;
        this.mainElement = element.querySelector(".main-layout__main") as HTMLElement | null;
        this.sidebarElement = element.querySelector(".main-layout__sidebar") as HTMLElement | null;
        this.sidebarOverlay = element.querySelector("[data-sidebar-overlay]") as HTMLElement | null;
        this.loadingElement = element.querySelector(".main-layout__loading") as HTMLElement | null;

        if (this.sidebarOverlay) {
            this.sidebarOverlay.onclick = () => this.closeSidebar();
        }
    }

    private applyMainBackground(): void {
        if (!this.mainElement) return;
        this.mainElement.classList.toggle("main-layout__main--no-bg", !this.contentBackgroundEnabled);
    }

    private applySidebarWidth(): void {
        if (!this.sidebarElement) return;
        if (this.sidebarWidth) {
            this.sidebarElement.style.setProperty("--main-layout-sidebar-width", this.sidebarWidth);
        } else {
            this.sidebarElement.style.removeProperty("--main-layout-sidebar-width");
        }
    }

    private applyLoadingState(): void {
        if (!this.loadingElement) return;
        this.loadingElement.classList.toggle("main-layout__loading--active", this.isLoading);
    }

    private updateModalState(): void {
        const modalRoot = this.getElement()?.querySelector(".main-layout__modal-root") as HTMLElement | null;
        if (!modalRoot) return;

        const hasModal = Array.from(modalRoot.children).some((child) => {
            const el = child as HTMLElement;
            if (el.childElementCount > 0) {
                return true;
            }
            const text = el.textContent?.trim() ?? "";
            return text.length > 0;
        });

        if (!hasModal) {
            modalRoot.innerHTML = "";
        }

        modalRoot.classList.toggle("main-layout__modal-root--active", hasModal);
    }

    private applySidebarState(): void {
        const root = this.getElement();
        if (!root) return;
        root.classList.toggle("main-layout--sidebar-open", this.mobileSidebarOpen);
    }
}
