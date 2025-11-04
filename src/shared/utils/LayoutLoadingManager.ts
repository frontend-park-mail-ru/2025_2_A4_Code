import { Layout } from "../base/Layout";

type LoadableLayout = Layout & { setLoading?(loading: boolean): void };

function resolveLoadableLayout(layout: Layout | null): LoadableLayout | null {
    if (!layout) {
        return null;
    }

    if (typeof (layout as LoadableLayout).setLoading === "function") {
        return layout as LoadableLayout;
    }

    return null;
}

export class LayoutLoadingManager {
    private counter = 0;
    private manualOverride = false;

    constructor(private readonly layoutGetter: () => Layout | null) {}

    public begin(): void {
        this.counter += 1;
        this.apply();
    }

    public end(): void {
        if (this.counter === 0) {
            return;
        }
        this.counter -= 1;
        this.apply();
    }

    public setBusy(active: boolean): void {
        this.manualOverride = active;
        this.apply();
    }

    public reset(): void {
        this.counter = 0;
        this.manualOverride = false;
        this.apply();
    }

    private apply(): void {
        const layout = resolveLoadableLayout(this.layoutGetter());
        if (!layout) {
            return;
        }
        const shouldShow = this.manualOverride || this.counter > 0;
        layout.setLoading?.(shouldShow);
    }
}
