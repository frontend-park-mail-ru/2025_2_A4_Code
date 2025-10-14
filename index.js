'use strict';

import { App } from "./app/App.js";

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();

    console.log("Application started successfully");
});

window.addEventListener('error', (event) => {
    console.log('Error: ', event.error);
});
