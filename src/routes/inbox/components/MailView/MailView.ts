import {Component} from "../../../../shared/base/Component";
import template from "./MailView.hbs";
import "./MailView.scss";

type Props = {
    id: string;
    from: string;
    subject: string;
    time: string;
    body: string;
    onBack?: () => void;
};

export class MailViewComponent extends Component<Props> {
    protected renderTemplate(): string {
        const { from, subject, time, body } = this.props;
        const initials = (from?.[0] || "").toUpperCase();
        return template({ from, subject, time, body, initials });
    }

    protected afterRender(): void {
        const el = this.element!;
        const back = el.querySelector('[data-action="back"]') as HTMLElement | null;
        back?.addEventListener('click', () => this.props.onBack?.());
    }
}

