import "../config/env";
import { SupportWidgetApp } from "./SupportWidgetApp";

const rootElement = document.getElementById("support-widget-root");

if (!rootElement) {
    throw new Error("Support widget root element #support-widget-root not found");
}

const widgetApp = new SupportWidgetApp();
widgetApp.render();
widgetApp.mount(rootElement).then();
