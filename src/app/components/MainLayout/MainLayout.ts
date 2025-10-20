import template from "../MainLayout/MainLayout.hbs";
import "./MainLayout.scss";

export class MainLayout {
    render(content: string): string {
        return template({content});
    }
}