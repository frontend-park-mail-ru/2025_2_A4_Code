import { Component } from "@shared/base/Component";
import template from "./SupportWidgetApp.hbs";
import "./SupportWidgetApp.scss";

export class SupportWidgetApp extends Component {
    protected renderTemplate(): string {
        return template({});
    }
}
