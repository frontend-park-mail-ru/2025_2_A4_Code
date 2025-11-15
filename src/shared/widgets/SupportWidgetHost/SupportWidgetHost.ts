import { Component } from "@shared/base/Component";
import template from "./SupportWidgetHost.hbs";
import "./SupportWidgetHost.scss";

type Props = {
    iframeSrc: string;
    buttonLabel?: string;
    buttonAriaLabel?: string;
    modalTitle?: string;
    iframeTitle?: string;
};

export class SupportWidgetHost extends Component<Props> {
    private modalElement: HTMLElement | null = null;
    private iframeElement: HTMLIFrameElement | null = null;
    private openButton: HTMLButtonElement | null = null;
    private closeElements: HTMLElement[] = [];
    private isOpen = false;
    private iframeLoaded = false;

    private handleOpen = (): void => {
        this.toggleModal(true);
    };

    private handleClose = (): void => {
        this.toggleModal(false);
    };

    private handleKeydown = (event: KeyboardEvent): void => {
        if (event.key === "Escape") {
            this.toggleModal(false);
        }
    };

    constructor(props: Props) {
        super({
            ...props,
            buttonLabel: props.buttonLabel ?? "Support",
            buttonAriaLabel: props.buttonAriaLabel ?? "Open support dialog",
            modalTitle: props.modalTitle ?? "Support",
            iframeTitle: props.iframeTitle ?? "Support widget",
        });
    }

    protected renderTemplate(): string {
        return template({
            buttonLabel: this.props.buttonLabel,
            buttonAriaLabel: this.props.buttonAriaLabel,
            modalTitle: this.props.modalTitle,
            iframeTitle: this.props.iframeTitle,
            iframeSrc: this.props.iframeSrc,
        });
    }

    protected afterRender(): void {
        this.modalElement = this.element?.querySelector("[data-modal]") as HTMLElement | null;
        this.iframeElement = this.element?.querySelector("[data-iframe]") as HTMLIFrameElement | null;
        this.openButton = this.element?.querySelector("[data-open]") as HTMLButtonElement | null;
        this.closeElements = Array.from(this.element?.querySelectorAll("[data-close]") ?? []);

        this.openButton?.addEventListener("click", this.handleOpen);
        this.closeElements.forEach((el) => el.addEventListener("click", this.handleClose));
    }

    public async unmount(): Promise<void> {
        this.openButton?.removeEventListener("click", this.handleOpen);
        this.closeElements.forEach((el) => el.removeEventListener("click", this.handleClose));
        document.removeEventListener("keydown", this.handleKeydown);
        if (this.isOpen) {
            document.body.classList.remove("support-widget-body-locked");
        }
        await super.unmount();
    }

    private toggleModal(open: boolean): void {
        if (!this.modalElement) {
            return;
        }

        this.isOpen = open;
        this.modalElement.classList.toggle("support-widget-host__modal--open", open);
        this.modalElement.setAttribute("aria-hidden", open ? "false" : "true");
        document.body.classList.toggle("support-widget-body-locked", open);

        if (open) {
            this.ensureIframeLoaded();
            document.addEventListener("keydown", this.handleKeydown);
        } else {
            document.removeEventListener("keydown", this.handleKeydown);
        }
    }

    private ensureIframeLoaded(): void {
        if (this.iframeLoaded || !this.iframeElement) {
            return;
        }

        const deferredSrc = this.iframeElement.dataset.src || this.props.iframeSrc;
        this.iframeElement.src = deferredSrc;
        this.iframeLoaded = true;
    }
}
