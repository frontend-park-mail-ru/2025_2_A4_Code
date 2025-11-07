import { Component } from "@shared/base/Component";
import template from "./AvatarButton.hbs";
import "./AvatarButton.scss";

type Props = {
    label?: string;
    imageUrl?: string | null;
    onClick?: (event: MouseEvent) => void;
};

const initials = (label?: string): string => (label ?? "").slice(0, 2).toUpperCase();

export class AvatarButtonComponent extends Component<Props> {
    private buttonEl: HTMLButtonElement | null = null;
    private avatarImageEl: HTMLImageElement | null = null;
    private avatarLabelEl: HTMLSpanElement | null = null;
    private pendingImageToken = 0;

    constructor(props: Props = {}) {
        super({
            label: props.label ?? "",
            imageUrl: props.imageUrl ?? null,
            onClick: props.onClick,
        });
    }

    protected renderTemplate(): string {
        return template({
            label: initials(this.props.label ?? ""),
            imageUrl: this.props.imageUrl ?? null,
        });
    }

    protected afterRender(): void {
        this.buttonEl = this.element as HTMLButtonElement | null;
        if (!this.buttonEl) {
            return;
        }

        this.buttonEl.addEventListener("click", this.handleClick);
        this.cacheAvatarElements();
    }

    private handleClick = (event: MouseEvent) => {
        this.props.onClick?.(event);
    };

    public setProps(newProps: Partial<Props>): void {
        const previous = this.props;
        this.props = { ...this.props, ...newProps };

        if (!this.buttonEl) {
            return;
        }

        const labelChanged = typeof newProps.label !== "undefined" && newProps.label !== previous.label;
        const imageChanged =
            typeof newProps.imageUrl !== "undefined" && newProps.imageUrl !== previous.imageUrl;

        if (imageChanged) {
            void this.updateAvatarImage(this.props.imageUrl ?? null, this.props.label ?? "");
        } else if (labelChanged) {
            this.updateLabel(this.props.label ?? "");
        }
    }

    public async unmount(): Promise<void> {
        if (this.buttonEl) {
            this.buttonEl.removeEventListener("click", this.handleClick);
        }
        this.buttonEl = null;
        this.avatarImageEl = null;
        this.avatarLabelEl = null;
        this.pendingImageToken = 0;
        await super.unmount();
    }

    private cacheAvatarElements(): void {
        if (!this.buttonEl) {
            return;
        }

        this.avatarImageEl = this.buttonEl.querySelector(
            '[data-avatar-content="image"]'
        ) as HTMLImageElement | null;
        this.avatarLabelEl = this.buttonEl.querySelector(
            '[data-avatar-content="initials"]'
        ) as HTMLSpanElement | null;
    }

    private updateLabel(label: string): void {
        const initialsValue = initials(label);

        if (this.avatarLabelEl) {
            this.avatarLabelEl.textContent = initialsValue;
        }

        if (this.avatarImageEl) {
            this.avatarImageEl.alt = label;
        }
    }

    private async updateAvatarImage(url: string | null, label: string): Promise<void> {
        if (!url) {
            this.pendingImageToken++;
            this.showInitials(label);
            return;
        }

        const requestId = ++this.pendingImageToken;

        try {
            const image = await this.createAvatarImage(url, label);
            if (!this.buttonEl || requestId !== this.pendingImageToken) {
                return;
            }
            this.replaceAvatarContent(image);
            this.updateLabel(this.props.label ?? label);
        } catch (error) {
            if (requestId !== this.pendingImageToken) {
                return;
            }
            console.warn("[avatar] failed to load image", error);
            this.showInitials(label);
        }
    }

    private showInitials(label: string): void {
        const span = document.createElement("span");
        span.className = "header__avatar";
        span.setAttribute("data-avatar-content", "initials");
        span.textContent = initials(label);
        this.replaceAvatarContent(span);
    }

    private replaceAvatarContent(node: HTMLElement): void {
        if (!this.buttonEl) {
            return;
        }

        this.buttonEl.replaceChildren(node);
        if (node instanceof HTMLImageElement) {
            this.avatarImageEl = node;
            this.avatarLabelEl = null;
        } else if (node instanceof HTMLSpanElement) {
            this.avatarLabelEl = node;
            this.avatarImageEl = null;
        } else {
            this.avatarImageEl = null;
            this.avatarLabelEl = null;
        }
    }

    private async createAvatarImage(url: string, label: string): Promise<HTMLImageElement> {
        const image = new Image();
        image.decoding = "async";
        image.className = "header__avatar header__avatar--image";
        image.alt = label;
        image.src = url;
        image.setAttribute("data-avatar-content", "image");

        try {
            await image.decode();
        } catch (error) {
            await new Promise<void>((resolve, reject) => {
                if (image.complete && image.naturalWidth > 0) {
                    resolve();
                    return;
                }

                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => reject(error), { once: true });
            });
        }

        return image;
    }
}
