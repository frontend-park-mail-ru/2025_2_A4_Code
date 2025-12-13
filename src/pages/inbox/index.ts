export { InboxPage } from "./InboxPage";
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        console.log("SW registered", reg.scope);
      }).catch((err) => {
        console.error("SW register error", err);
      });
    });
  }
import { requestNotificationPermission } from "@shared/utils/notifications";
  
async function enableNotifications() {
    const perm = await requestNotificationPermission();
    console.log("Notification permission:", perm);
  }
    