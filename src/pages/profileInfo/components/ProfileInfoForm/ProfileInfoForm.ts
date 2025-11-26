import { Component } from "@shared/base/Component";
import template from "./ProfileInfoForm.hbs";
import "./ProfileInfoForm.scss";

type TimeRange = { from: string; to: string };

type Props = {
    description?: string;
    timeRange?: TimeRange;
    onSave?: (data: { description: string; timeRange: TimeRange }) => void;
};

export class ProfileInfoFormComponent extends Component<Props> {
    private descriptionInput?: HTMLTextAreaElement | null;
    private fromSelect?: HTMLSelectElement | null;
    private toSelect?: HTMLSelectElement | null;

    constructor(props: Props = {}) {
        super(props);
    }

    protected renderTemplate(): string {
        const description = this.props.description ?? "";
        const timeFrom = this.props.timeRange?.from ?? "16:00";
        const timeTo = this.props.timeRange?.to ?? "16:00";

        return template({
            description,
            optionsFrom: this.buildOptionsHtml(timeFrom),
            optionsTo: this.buildOptionsHtml(timeTo),
        });
    }

    protected afterRender(): void {
        const element = this.getElement();
        if (!element) return;

        this.descriptionInput = element.querySelector("#profile-description") as HTMLTextAreaElement | null;
        this.fromSelect = element.querySelector('[data-role="from"]') as HTMLSelectElement | null;
        this.toSelect = element.querySelector('[data-role="to"]') as HTMLSelectElement | null;

        element.addEventListener("submit", (event) => {
            event.preventDefault();
            this.handleSubmit();
        });
    }

    private handleSubmit(): void {
        const description = (this.descriptionInput?.value ?? "").slice(0, 200).trim();
        const from = this.fromSelect?.value ?? "16:00";
        const to = this.toSelect?.value ?? "16:00";

        this.props.onSave?.({
            description,
            timeRange: { from, to },
        });
    }

    private buildOptionsHtml(selected: string): string {
        const options: string[] = [];
        for (let hour = 0; hour < 24; hour += 1) {
            const value = `${hour.toString().padStart(2, "0")}:00`;
            const isSelected = value === selected ? " selected" : "";
            options.push(`<option value="${value}"${isSelected}>${value}</option>`);
        }
        return options.join("");
    }
}
