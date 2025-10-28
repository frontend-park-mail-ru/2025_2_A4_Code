import {Component} from "./Component";
import {Router} from "../../infra";
import {Layout, SlotContent} from "./Layout";

type MountOptions = {
    skipAppend?: boolean;
};

export abstract class Page extends Component {
    protected router: Router = Router.getInstance();
    protected layout: Layout | null = null;

    constructor() {
        super();
    }

    public setLayout(layout: Layout): void {
        this.layout = layout;
    }

    protected abstract getSlotContent(): SlotContent;

    public async update(_params: Record<string, string>): Promise<void> {
        // optional override per page
    }

    public async renderWithLayout(layout: Layout, reuseLayout = false): Promise<HTMLElement> {
        this.layout = layout;
        const slotContent = this.getSlotContent();

        let element: HTMLElement;
        if (reuseLayout && layout.getElement()) {
            await layout.fillSlots(slotContent);
            element = layout.getElement() as HTMLElement;
        } else {
            element = layout.render(slotContent);
        }

        this.element = element;
        return element;
    }

    public render(): HTMLElement {
        if (!this.layout) {
            this.element = this.createElement('<div>Page content not wrapped in layout</div>');
            return this.element;
        }

        const element = this.layout.render(this.getSlotContent());
        this.element = element;
        return element;
    }

    public async updateSlot(slotName: string, content: HTMLElement | Component): Promise<void> {
        if (this.layout) {
            await this.layout.updateSlot(slotName, content);
        } else {
            console.warn('No layout set for page');
        }
    }

    public init(): void {
        // optional override
    }

    public async mount(rootElement: HTMLElement, options: MountOptions = {}): Promise<void> {
        if (this.layout) {
            if (!options.skipAppend) {
                await this.layout.mount(rootElement);
            }
            this.element = this.layout.getElement();
        } else if (!options.skipAppend) {
            await super.mount(rootElement);
        }

        try {
            this.init();
        } catch (e) {
            // ignore init errors by design
        }
    }

    public async unmount(): Promise<void> {
        await super.unmount();
    }
}
