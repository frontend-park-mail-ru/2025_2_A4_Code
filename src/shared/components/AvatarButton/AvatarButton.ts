import {Component} from "../../base/Component";
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

    constructor(props: Props = {}) {
        super({
            label: props.label ?? "AK",
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
        if (this.buttonEl) {
            this.buttonEl.addEventListener('click', this.handleClick);
        }
    }

    private handleClick = (event: MouseEvent) => {
        this.props.onClick?.(event);
    };

    public setProps(newProps: Partial<Props>): void {
        this.props = { ...this.props, ...newProps };
        if (this.buttonEl) {
            const labelEl = this.buttonEl.querySelector('.header__avatar') as HTMLElement | null;
            const img = this.buttonEl.querySelector('.header__avatar--image') as HTMLImageElement | null;

            if (typeof newProps.imageUrl !== 'undefined') {
                if (newProps.imageUrl) {
                    if (!img && this.buttonEl) {
                        this.buttonEl.innerHTML = `<img class="header__avatar header__avatar--image" src="${newProps.imageUrl}" alt="${newProps.label ?? this.props.label ?? ''}" loading="lazy" decoding="async" />`;
                    } else if (img) {
                        img.src = newProps.imageUrl;
                        img.alt = newProps.label ?? this.props.label ?? '';
                    }
                } else if (img) {
                    img.remove();
                    if (this.props.label) {
                        this.buttonEl.innerHTML = `<span class="header__avatar">${initials(this.props.label)}</span>`;
                    }
                }
            }

            if (typeof newProps.label !== 'undefined') {
                if (img) {
                    img.alt = newProps.label ?? '';
                } else if (labelEl) {
                    labelEl.textContent = initials(newProps.label);
                }
            }
        }
    }

    public async unmount(): Promise<void> {
        if (this.buttonEl) {
            this.buttonEl.removeEventListener('click', this.handleClick);
        }
        this.buttonEl = null;
        await super.unmount();
    }
}
