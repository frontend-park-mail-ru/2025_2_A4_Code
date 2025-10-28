import template from "../MainLayout/MainLayout.hbs";
import "./MainLayout.scss";
import {Layout, SlotContent} from "../../../shared/base/Layout";
import {Component as BaseComponent} from "../../../shared/base/Component";

export class MainLayout extends Layout {
    protected renderTemplate(): string {
        return template({});
    }

    public render(slots: SlotContent = {}): HTMLElement {
        const element = super.render(slots);
        this.updateModalState();
        return element;
    }

    public async updateSlot(slotName: string, content: HTMLElement | BaseComponent): Promise<void> {
        await super.updateSlot(slotName, content);
        if (slotName === "modal") {
            this.updateModalState();
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
