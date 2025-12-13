// @shared/utils/notifications.ts

export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      return "denied";
    }
  
    if (Notification.permission === "granted" || Notification.permission === "denied") {
      return Notification.permission;
    }
  
    return await Notification.requestPermission();
  }
  
  type ShowNotificationOptions = {
    body?: string;
    icon?: string;
  };
  
  export async function showNotification(
    title: string,
    options: ShowNotificationOptions = {}
  ): Promise<void> {
    if (!("Notification" in window)) {
      return;
    }
  
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      return;
    }

    new Notification(title, {
      body: options.body,
      icon: options.icon ?? "/img/logo.svg",
    });
  }
  