import template from "../MainLayout/MainLayout.hbs";
import "./MainLayout.scss";
import {Layout, SlotContent} from "../../../shared/base/Layout";
import {Component as BaseComponent} from "../../../shared/base/Component";

export class MainLayout extends Layout {
    private mainElement: HTMLElement | null = null;
    private sidebarElement: HTMLElement | null = null;
    private contentBackgroundEnabled = true;
    private sidebarWidth: string | null = null;

    protected renderTemplate(): string {
        return template({});
    }

    public render(slots: SlotContent = {}): HTMLElement {
        const element = super.render(slots);
        this.mainElement = element.querySelector(".main-layout__main") as HTMLElement | null;
        this.sidebarElement = element.querySelector(".main-layout__sidebar") as HTMLElement | null;
        this.applyMainBackground();
        this.applySidebarWidth();
        this.updateModalState();
        this.triggerTransition();
        return element;
    }

    public async updateSlot(slotName: string, content: HTMLElement | BaseComponent): Promise<void> {
        await super.updateSlot(slotName, content);
        if (slotName === "modal") {
            this.updateModalState();
        }
        if (slotName === "main") {
            this.triggerTransition();
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

    public triggerTransition(): void {
        if (!this.mainElement) return;
        this.mainElement.classList.remove("main-layout__main--transition");
        // reflow to restart the animation
        void this.mainElement.offsetWidth;
        this.mainElement.classList.add("main-layout__main--transition");
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

    private updateModalState(): void {
        const modalRoot = this.getElement()?.querySelector('.main-layout__modal-root') as HTMLElement | null;
        if (!modalRoot) return;

        const hasModal = Array.from(modalRoot.children).some((child) => {
            const el = child as HTMLElement;
            if (el.childElementCount > 0) {
                return true;
            }
            const text = el.textContent?.trim() ?? '';
            return text.length > 0;
        });

        if (!hasModal) {
            modalRoot.innerHTML = '';
        }

        modalRoot.classList.toggle('main-layout__modal-root--active', hasModal);
    }
}
