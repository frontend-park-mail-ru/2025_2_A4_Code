import { Component } from "@shared/base/Component";
import { ButtonComponent } from "@shared/components/Button/Button";
import template from "./MailView.hbs";
import "./MailView.scss";
import { MAIL_VIEW_TEXTS } from "@pages/constants/texts";
import { getOnlineStatus, subscribeToOnlineStatus } from "@shared/utils/onlineStatus";
import { probeOnlineStatus } from "@shared/utils/networkProbe";
import type { MailAttachment } from "@app-types/mail";
import { getAccessToken } from "@shared/api/authTokens";

type Props = {
    id: string;
    from: string;
    subject: string;
    time: string;
    body: string;
    avatarUrl?: string | null;
    fromEmail?: string;
    recipient?: string;
    attachments?: MailAttachment[];
    currentFolderId?: string;
    currentFolderType?: string;
    onBack?: () => void;
    onReply?: () => void;
    onForward?: () => void;
    onMoveToFolder?: () => void;
    onMarkAsSpam?: () => void;
    onDelete?: () => void;
};

export class MailViewComponent extends Component<Props> {
    private readonly toolbarButtons: Map<string, ButtonComponent>;
    private readonly offlineLockedButtons = new Set(["reply", "forward", "folder", "delete", "spam"]);
    private isOnline: boolean = getOnlineStatus();
    private unsubscribeOnline?: () => void;
    private readonly senderInitials: string;

    constructor(props: Props) {
        super(props);

        this.senderInitials = this.computeInitials(props.from);

        this.toolbarButtons = new Map([
            [
                "back",
                this.createToolbarButton("back", {
                    icon: '<img src="/img/message-back.svg" alt="" aria-hidden="true" />',
                    ariaLabel: MAIL_VIEW_TEXTS.backAriaLabel,
                    onClick: () => this.props.onBack?.(),
                    disabled: false,
                }),
            ],
            [
                "delete",
                this.createToolbarButton("delete", {
                    label: MAIL_VIEW_TEXTS.delete,
                    ariaLabel: MAIL_VIEW_TEXTS.delete,
                    icon: '<img src="/img/message-delete.svg" alt="" aria-hidden="true" />',
                    onClick: () => this.props.onDelete?.(),
                }),
            ],
            [
                "folder",
                this.createToolbarButton("folder", {
                    label: MAIL_VIEW_TEXTS.moveToFolder,
                    ariaLabel: MAIL_VIEW_TEXTS.moveToFolder,
                    icon: '<img src="/img/message-in-folder.svg" alt="" aria-hidden="true" />',
                    onClick: () => this.props.onMoveToFolder?.(),
                }),
            ],
            [
                "spam",
                this.createToolbarButton("spam", {
                    label: MAIL_VIEW_TEXTS.markAsSpam,
                    ariaLabel: MAIL_VIEW_TEXTS.markAsSpam,
                    icon: '<img src="/img/message-to-spam.svg" alt="" aria-hidden="true" />',
                    onClick: () => this.props.onMarkAsSpam?.(),
                }),
            ],
            [
                "reply",
                this.createToolbarButton("reply", {
                    label: MAIL_VIEW_TEXTS.reply,
                    ariaLabel: MAIL_VIEW_TEXTS.reply,
                    icon: '<img src="/img/message-reply.svg" alt="" aria-hidden="true" />',
                    onClick: () => this.props.onReply?.(),
                }),
            ],
            [
                "forward",
                this.createToolbarButton("forward", {
                    label: MAIL_VIEW_TEXTS.forward,
                    ariaLabel: MAIL_VIEW_TEXTS.forward,
                    icon: '<img src="/img/message-forward.svg" alt="" aria-hidden="true" />',
                    onClick: () => this.props.onForward?.(),
                }),
            ],
        ]);

        this.updateToolbarDisabledState();
        this.updateAvatarDisplay();
        this.unsubscribeOnline = subscribeToOnlineStatus((online) => {
            this.isOnline = online;
            this.updateToolbarDisabledState();
            this.updateAvatarDisplay();
        });
        this.ensureConnectivity();
    }

    private createToolbarButton(
        key: string,
        {
            label,
            icon,
            onClick,
            ariaLabel,
            disabled,
        }: {
            label?: string;
            icon: string;
            onClick?: () => void;
            ariaLabel?: string;
            disabled?: boolean;
        }
    ): ButtonComponent {
        const props: ConstructorParameters<typeof ButtonComponent>[0] = {
            icon,
            variant: "link",
            type: "button",
            disabled: disabled ?? !this.isOnline,
        };

        if (label) {
            props.label = label;
        }

        if (onClick) {
            props.onClick = () => {
                if (this.offlineLockedButtons.has(key) && !this.isOnline) {
                    return;
                }
                onClick();
            };
        }

        if (ariaLabel) {
            props.ariaLabel = ariaLabel;
        }

        return new ButtonComponent(props);
    }

    protected renderTemplate(): string {
        const { from, subject, time, body, avatarUrl } = this.props;
        return template({
            from,
            subject,
            time,
            body,
            initials: this.senderInitials,
            avatarUrl: avatarUrl ?? null,
            fromEmail: this.props.fromEmail ?? from,
            recipient: this.props.recipient ?? MAIL_VIEW_TEXTS.recipientFallback,
            recipientLabel: MAIL_VIEW_TEXTS.recipientLabel,
            hasAttachments: Boolean(this.props.attachments && this.props.attachments.length > 0),
        });
    }

    protected afterRender(): void {
        if (!this.element) {
            return;
        }

        const folderType = (this.props.currentFolderType || this.props.currentFolderId || "").toLowerCase();
        const hidden = new Set<string>();
        if (folderType === "trash") {
            hidden.add("delete");
            hidden.add("spam");
        } else if (folderType === "spam") {
            hidden.add("spam");
        }

        for (const [key, button] of this.toolbarButtons.entries()) {
            const slot = this.element.querySelector(`[data-slot="${key}"]`) as HTMLElement | null;
            if (!slot) {
                continue;
            }
            if (hidden.has(key)) {
                slot.innerHTML = "";
                continue;
            }

            slot.innerHTML = "";
            button.render();
            button.mount(slot).then();
        }

        this.updateAvatarDisplay();
        this.renderAttachments();
    }

    public async unmount(): Promise<void> {
        this.unsubscribeOnline?.();
        this.unsubscribeOnline = undefined;
        for (const button of this.toolbarButtons.values()) {
            await button.unmount();
        }
        await super.unmount();
    }

    private updateToolbarDisabledState(): void {
        for (const [key, button] of this.toolbarButtons.entries()) {
            const disableButton = this.offlineLockedButtons.has(key) && !this.isOnline;
            button.setProps({ disabled: disableButton });
        }
    }

    public refreshOnlineState(): void {
        this.isOnline = getOnlineStatus();
        this.updateToolbarDisabledState();
        this.updateAvatarDisplay();
        this.ensureConnectivity();
    }

    private ensureConnectivity(): void {
        void (probeOnlineStatus().catch(() => undefined));
    }

    private updateAvatarDisplay(): void {
        const avatarContainer = this.element?.querySelector("[data-avatar]") as HTMLElement | null;
        if (!avatarContainer) {
            return;
        }

        const image = avatarContainer.querySelector("[data-avatar-image]") as HTMLImageElement | null;
        const initialsEl = avatarContainer.querySelector("[data-avatar-initials]") as HTMLElement | null;
        const showImage = this.shouldShowAvatarImage();

        if (image) {
            image.style.display = showImage ? "block" : "none";
        }

        if (initialsEl) {
            initialsEl.textContent = this.senderInitials;
            initialsEl.style.display = showImage ? "none" : "flex";
        }
    }

    private shouldShowAvatarImage(): boolean {
        return Boolean(this.props.avatarUrl && this.isOnline);
    }

    private computeInitials(from: string | undefined): string {
        return (from?.[0] || "").toUpperCase();
    }

    private renderAttachments(): void {
        if (!this.element) return;
        const list = this.element.querySelector("[data-attachments-list]") as HTMLElement | null;
        const root = this.element.querySelector("[data-attachments]") as HTMLElement | null;
        if (!list || !root) {
            return;
        }

        const attachments = this.props.attachments ?? [];
        if (attachments.length === 0) {
            root.setAttribute("hidden", "true");
            list.innerHTML = "";
            return;
        }

        root.removeAttribute("hidden");
        list.innerHTML = "";

        attachments.forEach((item) => {
            const card = document.createElement("div");
            card.className = "mail-view__attachment";
            const href = this.resolveAttachmentUrl(item.storagePath);
            if (href) {
                card.setAttribute("data-href", href);
            }

            const name = document.createElement("div");
            name.className = "mail-view__attachment-name";
            name.textContent = item.name;

            const meta = document.createElement("div");
            meta.className = "mail-view__attachment-meta";
            meta.textContent = this.formatSize(item.size);

            const actions = document.createElement("div");
            actions.className = "mail-view__attachment-actions";

            const download = document.createElement("a");
            download.className = "mail-view__attachment-download";
            download.textContent = "Скачать";
            if (href) {
                download.href = href;
                download.download = item.name || undefined;
                download.rel = "noopener noreferrer";
                download.target = "_blank";
            } else {
                download.href = "#";
            }

            actions.appendChild(download);

            card.appendChild(name);
            card.appendChild(meta);
            card.appendChild(actions);
            card.onclick = (ev) => {
                const url = href;
                if (!url) return;
                ev.preventDefault();
                if (this.isPreviewable(item)) {
                    void this.openPreview(item, url);
                } else {
                    window.open(url, "_blank", "noopener");
                }
            };

            download.addEventListener("click", (ev) => {
                ev.stopPropagation();
            });

            list.appendChild(card);
        });
    }

    private resolveAttachmentUrl(storagePath?: string | null): string | null {
        if (!storagePath) return null;
        if (/^https?:\/\//i.test(storagePath)) {
            return storagePath;
        }
        const base = typeof window !== "undefined" ? window.__API_BASE_URL__ ?? "" : "";
        const normalizedPath = storagePath.startsWith("/") ? storagePath.slice(1) : storagePath;
        const encodedPath = normalizedPath
            .split("/")
            .filter(Boolean)
            .map((part) => encodeURIComponent(part))
            .join("/");
        const token = getAccessToken();
        const query = token ? `?token=${encodeURIComponent(token)}` : "";
        return `${base}/files/${encodedPath}${query}`;
    }

    private isPreviewable(item: MailAttachment): boolean {
        const type = this.getEffectiveType(item);
        if (type.startsWith("image/")) return true;
        if (type === "application/pdf") return true;
        if (type.startsWith("text/")) return true;
        return false;
    }

    private getEffectiveType(item: MailAttachment): string {
        const direct = this.normalizeType(item.fileType || "");
        if (direct && direct !== "application/octet-stream") {
            return direct;
        }
        const byName = this.detectTypeByExtension(item.name);
        if (byName) return byName;
        return this.detectTypeByExtension(item.storagePath);
    }

    private normalizeType(raw: string): string {
        const base = (raw || "").split(";")[0].trim().toLowerCase();
        return base;
    }

    private detectTypeByExtension(nameOrPath?: string | null): string {
        const ext = (nameOrPath?.split(".").pop() || "").toLowerCase();
        const map: Record<string, string> = {
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            pdf: "application/pdf",
            txt: "text/plain",
        };
        return map[ext] ?? "";
    }

    private async openPreview(item: MailAttachment, url: string): Promise<void> {
        const overlay = document.createElement("div");
        overlay.className = "mail-attachment-preview";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");

        const content = document.createElement("div");
        content.className = "mail-attachment-preview__content";

        const header = document.createElement("div");
        header.className = "mail-attachment-preview__header";
        const title = document.createElement("div");
        title.className = "mail-attachment-preview__title";
        title.textContent = item.name || "Вложение";
        const closeBtn = document.createElement("button");
        closeBtn.className = "mail-attachment-preview__close";
        closeBtn.innerHTML = "&times;";
        closeBtn.type = "button";

        const download = document.createElement("a");
        download.className = "mail-attachment-preview__download";
        download.href = url;
        download.download = item.name || undefined;
        download.target = "_blank";
        download.rel = "noopener noreferrer";
        download.textContent = "Скачать";

        header.appendChild(title);
        header.appendChild(download);
        header.appendChild(closeBtn);

        const body = document.createElement("div");
        body.className = "mail-attachment-preview__body";

        const loading = document.createElement("div");
        loading.textContent = "Загрузка...";
        body.appendChild(loading);

        content.appendChild(header);
        content.appendChild(body);
        overlay.appendChild(content);

        const close = () => {
            overlay.remove();
            if (previewUrl && previewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(previewUrl);
            }
        };
        closeBtn.onclick = close;
        overlay.onclick = (ev) => {
            if (ev.target === overlay) {
                close();
            }
        };
        document.addEventListener(
            "keydown",
            (ev) => {
                if (ev.key === "Escape") {
                    close();
                }
            },
            { once: true }
        );

        document.body.appendChild(overlay);

        let previewUrl: string | null = null;
        try {
            const token = getAccessToken();
            const resp = await fetch(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!resp.ok) {
                window.open(url, "_blank", "noopener");
                close();
                return;
            }
            const blob = await resp.blob();
            previewUrl = URL.createObjectURL(blob);
            body.innerHTML = "";

            if (item.fileType?.startsWith("image/")) {
                const img = document.createElement("img");
                img.src = previewUrl;
                img.alt = item.name || "";
                body.appendChild(img);
            } else {
                const frame = document.createElement("iframe");
                frame.src = previewUrl;
                frame.title = item.name || "preview";
                frame.setAttribute("loading", "lazy");
                body.appendChild(frame);
            }
        } catch (error) {
            console.error("Failed to load attachment preview", error);
            window.open(url, "_blank", "noopener");
            close();
        }
    }

    private formatSize(size: number | undefined): string {
        if (!size || Number.isNaN(size)) return "";
        if (size >= 1024 * 1024) {
            return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
        }
        if (size >= 1024) {
            return `${(size / 1024).toFixed(0)} КБ`;
        }
        return `${size} Б`;
    }
}
