import { showFolderNotification } from "@shared";
import { getAccessToken } from "@shared/api/authTokens";
import type { InboxStore } from "../model/InboxStore";

type WS = WebSocket | null;

const NEW_MAIL_TITLE = "FlintMail - Новое письмо";

export class NewMailWatcher {
    private readonly store: InboxStore;
    private socket: WS = null;
    private reconnectAttempts = 0;
    private permissionRequested = false;
    private lastUnread: number | null = null;

    constructor(store: InboxStore) {
        this.store = store;
    }

    public start(): void {
        if (typeof window === "undefined") return;
        this.requestPermission();
        this.setupPermissionRequestOnInteraction();
        this.connect();
    }

    public stop(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.lastUnread = null;
    }

    private connect(): void {
        const url = this.buildWsUrl("/ws/notifications");
        console.info("[ws] connecting to", url);
        try {
            const ws = new WebSocket(url);
            this.socket = ws;
            ws.onopen = () => {
                console.info("[ws] connected");
                this.reconnectAttempts = 0;
            };
            ws.onmessage = (event) => {
                console.info("[ws] message", event.data);
                this.handleMessage(event.data);
            };
            ws.onclose = (ev) => {
                console.warn("[ws] closed", ev.code, ev.reason);
                this.scheduleReconnect();
            };
            ws.onerror = (ev) => {
                console.warn("[ws] error", ev);
                this.scheduleReconnect();
            };
        } catch (error) {
            console.warn("[ws] failed to open", error);
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect(): void {
        if (this.socket) {
            this.socket.onclose = null;
            this.socket.onerror = null;
        }
        this.socket = null;
        this.lastUnread = null;
        const delay = Math.min(30000, 2000 * Math.pow(2, this.reconnectAttempts));
        this.reconnectAttempts += 1;
        setTimeout(() => this.connect(), delay);
    }

    private handleMessage(data: any): void {
        let parsed: { type?: string; total?: number; unread?: number } = {};
        try {
            parsed = JSON.parse(typeof data === "string" ? data : "");
        } catch {
            return;
        }
        if (parsed.type !== "mail_update") return;

        const unread = this.parseCount(parsed.unread);
        const total = this.parseCount(parsed.total);
        const shouldNotify = this.lastUnread !== null && unread !== null && unread > this.lastUnread;
        this.lastUnread = unread ?? this.lastUnread ?? null;

        const state = this.store.getState();
        const newestFrom = state.mails[0]?.from ?? NEW_MAIL_TITLE;
        const newestSubj = state.mails[0]?.subject ?? "";
        const isInboxActive = (state.activeFolderId || "").toLowerCase() === "inbox";
        const shouldReload =
            isInboxActive &&
            ((unread !== null && unread > state.unread) || (total !== null && total > state.total));

        console.info("[notify] mail_update", { newestFrom, newestSubj, unread, total, shouldNotify });
        if (shouldNotify) {
            this.notify(newestFrom, newestSubj);
        }

        if (shouldReload) {
            void this.store.loadFolder("inbox");
        }
    }

    private buildWsUrl(path: string): string {
        const base = (typeof window !== "undefined" && (window as any).__API_BASE_URL__) || "";
        const url = new URL(base || window.location.href);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        url.pathname = path.startsWith("/") ? path : `/${path}`;
        const token = getAccessToken();
        if (token) {
            url.searchParams.set("token", token);
        }
        return url.toString();
    }

    private notify(from: string, subject: string): void {
        if (typeof window === "undefined") return;
        const permission = typeof Notification !== "undefined" ? Notification.permission : "unsupported";
        console.info("[notify] attempt", { permission, from, subject });
        if (window.Notification && permission === "granted") {
            try {
                new Notification(NEW_MAIL_TITLE, {
                    body: subject ? `${from}: ${subject}` : from,
                    tag: "new-mail",
                    requireInteraction: true,
                    renotify: true,
                });
                return;
            } catch (error) {
                console.warn("[notify] failed to show system notification", error);
            }
        }
        const fallbackBody = subject ? `${NEW_MAIL_TITLE}: ${subject}` : NEW_MAIL_TITLE;
        showFolderNotification(fallbackBody);
    }

    private requestPermission(force = false): void {
        if (this.permissionRequested && !force) return;
        if (typeof window === "undefined" || !window.Notification) return;
        if (Notification.permission === "default") {
            this.permissionRequested = true;
            Notification.requestPermission().catch(() => undefined);
        }
    }

    private setupPermissionRequestOnInteraction(): void {
        if (typeof document === "undefined" || !("Notification" in window)) return;
        if (Notification.permission !== "default") return;

        const handler = () => {
            console.debug("[notify] requesting permission from user gesture");
            this.requestPermission(true);
        };

        document.addEventListener("click", handler, { once: true, passive: true });
        document.addEventListener("keydown", handler, { once: true });
    }

    private parseCount(value: unknown): number | null {
        if (typeof value === "number") return value;
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
    }
}
