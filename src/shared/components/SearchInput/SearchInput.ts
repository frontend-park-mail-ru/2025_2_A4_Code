import {Component} from "../../base/Component";
import template from "./SearchInput.hbs";
import "./SearchInput.scss";

type Props = {
    value?: string;
    placeholder?: string;
    debounce?: number;
    onInput?: (value: string) => void;
};

export class SearchInputComponent extends Component<Props> {
    private inputEl: HTMLInputElement | null = null;
    private debounceTimer: number | null = null;

    constructor(props: Props = {}) {
        super({
            placeholder: props.placeholder ?? "",
            value: props.value ?? "",
            debounce: props.debounce ?? 0,
            onInput: props.onInput,
        });
    }

    protected renderTemplate(): string {
        return template({
            placeholder: this.props.placeholder ?? "",
            value: this.props.value ?? "",
        });
    }

    protected afterRender(): void {
        this.inputEl = this.element?.querySelector('input') as HTMLInputElement | null;
        if (!this.inputEl) return;
        this.inputEl.addEventListener('input', this.handleInput);
    }

    private handleInput = () => {
        if (!this.inputEl) return;
        const value = this.inputEl.value;
        const delay = this.props.debounce ?? 0;

        if (this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
        }

        if (delay > 0) {
            this.debounceTimer = window.setTimeout(() => {
                this.props.onInput?.(value);
            }, delay);
        } else {
            this.props.onInput?.(value);
        }
    };

    public setProps(newProps: Partial<Props>): void {
        this.props = { ...this.props, ...newProps };
        if (!this.inputEl) return;
        if (typeof newProps.placeholder !== 'undefined') {
            this.inputEl.placeholder = newProps.placeholder ?? "";
        }
        if (typeof newProps.value !== 'undefined') {
            this.inputEl.value = newProps.value ?? "";
        }
    }

    public async unmount(): Promise<void> {
        if (this.inputEl) {
            this.inputEl.removeEventListener('input', this.handleInput);
        }
        if (this.debounceTimer) {
            window.clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        this.inputEl = null;
        await super.unmount();
    }
}
