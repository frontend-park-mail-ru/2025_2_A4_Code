import "./config/env";
import { App } from "./app";
import { registerServiceWorker } from "./serviceWorker/registerServiceWorker";
import { SupportWidgetHost } from "@shared/widgets/SupportWidgetHost/SupportWidgetHost";

const rootElement = document.getElementById("app");
if (!rootElement) {
    throw new Error("Root element #app not found");
}

const app = new App();
const supportWidgetHost = new SupportWidgetHost({
    iframeSrc: "/support-widget.html",
    buttonLabel: "Сапорт",
    modalTitle: "Поддержка",
    iframeTitle: "Сапорт виджет",
});

document.addEventListener("DOMContentLoaded", () => {
    app.init().then(() => {});
    supportWidgetHost.render();
    supportWidgetHost.mount(document.body).then();
});

registerServiceWorker();
