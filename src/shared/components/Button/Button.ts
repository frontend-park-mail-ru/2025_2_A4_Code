import {Component} from "@shared/base/Component";
import template from "./Button.hbs";
import "./Button.scss";

type ButtonVariant = "primary" | "secondary" | "link";

type Props = {
    label?: string;
    type?: "button" | "submit" | "reset";
    variant?: ButtonVariant;
    disabled?: boolean;
    icon?: string;
    onClick?: (event: MouseEvent) => void;
    fullWidth?: boolean;
    ariaLabel?: string;
};

export class ButtonComponent extends Component<Props> {
    constructor(props: Props) {
        super({
            ...props,
            type: props.type ?? "button",
            variant: props.variant ?? "primary",
            fullWidth: props.fullWidth ?? false,
            label: props.label ?? "",
        });
    }

    protected renderTemplate(): string {
        return template({
            label: this.props.label ?? "",
            type: this.props.type ?? "button",
            variant: this.props.variant ?? "primary",
            disabled: this.props.disabled,
            icon: this.props.icon,
            fullWidth: this.props.fullWidth,
            ariaLabel: this.props.ariaLabel,
        });
    }

    protected afterRender(): void {
        const el = this.element as HTMLButtonElement | null;
        if (!el) return;
        if (this.props.disabled) {
            el.setAttribute("disabled", "disabled");
        }
        el.addEventListener("click", (event) => {
            if (this.props.disabled) {
                event.preventDefault();
                return;
            }
            this.props.onClick?.(event);
        });
    }
}
