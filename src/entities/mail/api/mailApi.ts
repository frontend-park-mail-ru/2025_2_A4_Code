import { apiService } from "@shared/api/ApiService";
import type { ApiResponse } from "@shared/api/types";
import type { Mail, MailAttachment, MailDetail } from "@app-types/mail";
import { formatDateTimeFromBackend } from "@utils";
import { ensureHttpsAssetUrl } from "@shared/utils/url";

type InboxApiResponse = {
    message_total: number | string;
    message_unread: number | string;
    messages: InboxMessageDto[];
    pagination: {
        has_next: boolean | string;
        next_last_message_id?: number | string;
        next_last_datetime?: string;
    };
};

type InboxMessageDto = {
    id: string;
    sender: {
        email: string;
        username: string;
        avatar?: string | null;
    };
    topic: string;
    snippet: string;
    datetime: string;
    is_read: boolean | string;
    read_status?: boolean | string;
};

type MessageDetailsDto = {
    topic: string;
    text: string;
    datetime: string;
    thread_id?: string;
    sender?: {
        email?: string;
        username?: string;
        avatar?: string | null;
    };
    email?: string;
    username?: string;
    avatar?: string | null;
    files?: MessageFileDto[];
    Files?: MessageFileDto[];
    receivers?: Array<{ email?: string }>;
    Receivers?: Array<{ email?: string }>;
};

type MessageFileDto = {
    name: string;
    file_type: string;
    size: number | string;
    storage_path?: string | null;
};
type PreparedAttachment = {
    name: string;
    file_type: string;
    size: string;
    storage_path: string;
};
type UploadAttachmentResponse = {
    storage_path: string;
    name: string;
    size: number;
    file_type: string;
};

type SendMessageRequest = {
    topic: string;
    text: string;
    receivers: Array<{ email: string }>;
    files: MessageFileDto[];
};

type ReplyMessageRequest = {
    root_message_id: string;
    topic: string;
    text: string;
    thread_root: string;
    receivers: Array<{ email: string }>;
    files: MessageFileDto[];
};

export type InboxSummary = {
    total: number;
    unread: number;
    items: Mail[];
    pagination: NormalizedPagination;
};

export type PaginationCursor = {
    lastMessageId?: string | number;
    lastDatetime?: string;
    limit?: number;
};

export type NormalizedPagination = {
    hasNext: boolean;
    nextLastMessageId?: string;
    nextLastDatetime?: string;
};

export type SendMessagePayload = {
    to: string;
    subject: string;
    body: string;
    attachments?: MailAttachment[];
};

export type ReplyMessagePayload = {
    to: string;
    subject: string;
    body: string;
    rootMessageId: string;
    threadRoot: string;
    attachments?: MailAttachment[];
};

export type SaveDraftPayload = {
    to?: string;
    subject?: string;
    body?: string;
    threadId?: string;
    draftId?: string;
    attachments?: MailAttachment[];
};

export type SendDraftPayload = {
    draftId: string;
    to?: string;
    subject?: string;
    body?: string;
    threadId?: string;
    attachments?: MailAttachment[];
};

export type FolderSummary = {
    id: string;
    name: string;
    type: string;
    icon?: string;
    unread?: number;
    backendId?: string;
};

export const MAX_FOLDER_NAME_LENGTH = 21;

const INBOX_ENDPOINT = "/messages/inbox";
const DEFAULT_PAGE_LIMIT = 100;
const FOLDERS_ENDPOINT = "/messages/get-folders";
const FOLDER_ENDPOINT = (name: string) => `/folders/${encodeURIComponent(name)}`;
const MESSAGE_ENDPOINT = (id: string) => `/messages/${id}`;
const SEND_ENDPOINT = "/messages/send";
const REPLY_ENDPOINT = "/messages/reply";
const CREATE_FOLDER_ENDPOINT = "/messages/create-folder";
const MOVE_TO_FOLDER_ENDPOINT = "/messages/move-to-folder";
const SAVE_DRAFT_ENDPOINT = "/messages/save-draft";
const DELETE_DRAFT_ENDPOINT = "/messages/delete-draft";
const RENAME_FOLDER_ENDPOINT = "/messages/rename-folder";
const DELETE_FOLDER_ENDPOINT = "/messages/delete-folder";
const SEND_DRAFT_ENDPOINT = "/messages/send-draft";
const MARK_SPAM_ENDPOINT = "/messages/mark-as-spam";
const SENDER_FALLBACK = "Неизвестный отправитель";
const ATTACHMENT_PATH_PREFIX = "attachments";
const MAX_STORAGE_PATH_LENGTH = 180;
const DEFAULT_ATTACHMENT_EXTENSION = "bin";

export async function fetchInboxMessages(cursor?: PaginationCursor): Promise<InboxSummary> {
    const response = await apiService.request<ApiResponse<InboxApiResponse>>(
        INBOX_ENDPOINT + buildPaginationQuery(cursor ?? { limit: DEFAULT_PAGE_LIMIT })
    );
    return normalizeInboxSummary(response.body);
}

export async function fetchFolders(): Promise<FolderSummary[]> {
    const response = await apiService.request<
        ApiResponse<{ folders: Array<{ folder_id: string; folder_name: string; folder_type: string }> }>
    >(FOLDERS_ENDPOINT);
    return (response.body.folders ?? []).map((folder) => {
        const backendId = (folder.folder_id ?? "").trim();
        const type = (folder.folder_type ?? "").trim().toLowerCase() || "custom";
        const name = folder.folder_name?.trim() || folder.folder_type || "";
        const isCustom = type === "custom";
        const id = isCustom ? backendId || name || type : type;

        return {
            id: id || type || "custom",
            name,
            type,
            unread: undefined,
            backendId: backendId || undefined,
        };
    });
}

export async function fetchFolderMessages(folderName: string, cursor?: PaginationCursor): Promise<InboxSummary> {
    if (!folderName || folderName === "inbox") {
        return fetchInboxMessages(cursor);
    }

    const response = await apiService.request<ApiResponse<InboxApiResponse>>(
        FOLDER_ENDPOINT(folderName) + buildPaginationQuery(cursor ?? { limit: DEFAULT_PAGE_LIMIT })
    );
    return normalizeInboxSummary(response.body);
}

export async function fetchMessageById(id: string): Promise<MailDetail> {
    const response = await apiService.request<ApiResponse<MessageDetailsDto | { message?: MessageDetailsDto }>>(
        MESSAGE_ENDPOINT(id)
    );
    const raw = response.body as MessageDetailsDto | { message?: MessageDetailsDto };
    const dto = (raw as { message?: MessageDetailsDto }).message ?? (raw as MessageDetailsDto);
    return mapMessageDetails(id, dto || {});
}

export async function sendMessage(payload: SendMessagePayload): Promise<void> {
    const trimmedTo = payload.to.trim();
    if (!trimmedTo) {
        throw new Error("Recipient email is required");
    }

    const requestBody: SendMessageRequest = {
        topic: payload.subject.trim(),
        text: payload.body,
        receivers: [{ email: trimmedTo }],
        files: mapAttachmentsToDto(payload.attachments),
    };

    await apiService.request<ApiResponse<unknown>>(SEND_ENDPOINT, {
        method: "POST",
        body: requestBody,
    });
}

export async function replyToMessage(payload: ReplyMessagePayload): Promise<void> {
    const trimmedTo = payload.to.trim();
    if (!trimmedTo) {
        throw new Error("Recipient email is required");
    }

    const rootId = payload.rootMessageId ? `${payload.rootMessageId}` : "";
    const threadRoot = payload.threadRoot ? `${payload.threadRoot}` : rootId;

    const requestBody: ReplyMessageRequest = {
        root_message_id: rootId,
        topic: payload.subject.trim(),
        text: payload.body,
        thread_root: threadRoot,
        receivers: [{ email: trimmedTo }],
        files: mapAttachmentsToDto(payload.attachments),
    };

    await apiService.request<ApiResponse<unknown>>(REPLY_ENDPOINT, {
        method: "POST",
        body: requestBody,
    });
}

export async function createFolder(name: string): Promise<FolderSummary> {
    const trimmed = name.trim();
    if (!trimmed) {
        throw new Error("Folder name is required");
    }
    if (trimmed.length > MAX_FOLDER_NAME_LENGTH) {
        throw new Error(`Название папки не должно превышать ${MAX_FOLDER_NAME_LENGTH} символов`);
    }

    const response = await apiService.request<
        ApiResponse<{ folder_id: string; folder_name: string; folder_type: string }>
    >(CREATE_FOLDER_ENDPOINT, {
        method: "POST",
        body: { folder_name: trimmed },
    });

    const folderId = (response.body.folder_id ?? "").trim();
    const type = (response.body.folder_type ?? "custom").trim().toLowerCase();
    return {
        id: folderId || trimmed,
        name: response.body.folder_name?.trim() || trimmed,
        type,
        backendId: folderId || undefined,
    };
}

export async function moveMessageToFolder(messageId: string, folderId: string): Promise<void> {
    const payload = {
        message_id: messageId,
        folder_id: folderId,
    };

    await apiService.request<ApiResponse<unknown>>(MOVE_TO_FOLDER_ENDPOINT, {
        method: "POST",
        body: payload,
    });
}

export async function markAsSpam(messageId: string): Promise<void> {
    const payload = { message_id: messageId };
    await apiService.request<ApiResponse<unknown>>(MARK_SPAM_ENDPOINT, {
        method: "POST",
        body: payload,
    });
}

export async function saveDraft(payload: SaveDraftPayload): Promise<{ draftId: string }> {
    const trimmedTo = payload.to?.trim();

    const requestBody = {
        draft_id: payload.draftId ?? "",
        thread_id: payload.threadId ?? "",
        topic: (payload.subject ?? "").trim(),
        text: payload.body ?? "",
        receivers: trimmedTo ? [{ email: trimmedTo }] : [],
        files: mapAttachmentsToDto(payload.attachments),
    };

    const response = await apiService.request<ApiResponse<{ draft_id?: string }>>(SAVE_DRAFT_ENDPOINT, {
        method: "POST",
        body: requestBody,
    });

    return { draftId: response.body?.draft_id ?? "" };
}

export async function renameFolder(folderId: string, newName: string): Promise<void> {
    const trimmed = newName.trim();
    if (!trimmed) {
        throw new Error("Folder name is required");
    }
    if (trimmed.length > MAX_FOLDER_NAME_LENGTH) {
        throw new Error(`Название папки не должно превышать ${MAX_FOLDER_NAME_LENGTH} символов`);
    }

    await apiService.request<ApiResponse<unknown>>(RENAME_FOLDER_ENDPOINT, {
        method: "PUT",
        body: { folder_id: folderId, new_folder_name: trimmed },
    });
}

export async function deleteFolder(folderId: string): Promise<void> {
    await apiService.request<ApiResponse<unknown>>(
        `${DELETE_FOLDER_ENDPOINT}?folder_id=${encodeURIComponent(folderId)}`,
        {
            method: "DELETE",
            parseJson: false,
        }
    );
}

export async function sendDraft(payload: SendDraftPayload): Promise<void> {
    if (!payload.draftId) {
        throw new Error("Draft id is required");
    }

    if (payload.to || payload.subject || payload.body) {
        await saveDraft({
            draftId: payload.draftId,
            to: payload.to,
            subject: payload.subject,
            body: payload.body,
            threadId: payload.threadId,
            attachments: payload.attachments,
        });
    }

    await apiService.request<ApiResponse<{ message_id?: string }>>(SEND_DRAFT_ENDPOINT, {
        method: "POST",
        body: { draft_id: payload.draftId },
    });
}

export async function deleteDraft(draftId: string): Promise<void> {
    if (!draftId) {
        throw new Error("Draft id is required");
    }
    await apiService.request<ApiResponse<unknown>>(DELETE_DRAFT_ENDPOINT, {
        method: "DELETE",
        body: { draft_id: draftId },
    });
}

export async function uploadAttachment(file: File, desiredPath?: string): Promise<MailAttachment> {
    const formData = new FormData();
    formData.append("file", file, file.name);
    if (desiredPath) {
        formData.append("path", desiredPath);
    }

    const response = await apiService.request<ApiResponse<UploadAttachmentResponse>>("/files/upload", {
        method: "POST",
        body: formData,
    });

    const body = response.body as UploadAttachmentResponse;
    return {
        name: body?.name ?? file.name,
        fileType: body?.file_type ?? file.type ?? "",
        size: Number(body?.size ?? file.size),
        storagePath: body?.storage_path ?? desiredPath ?? "",
    };
}

function buildPaginationQuery(cursor?: PaginationCursor): string {
    if (!cursor) {
        return "";
    }
    const params = new URLSearchParams();
    if (cursor.lastMessageId !== undefined) {
        params.set("last_message_id", String(cursor.lastMessageId));
    }
    if (cursor.lastDatetime) {
        params.set("last_datetime", cursor.lastDatetime);
    }
    if (cursor.limit) {
        params.set("limit", String(cursor.limit));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
}

function normalizeInboxSummary(api?: InboxApiResponse): InboxSummary {
    const messages = api?.messages ?? [];
    return {
        total: Number(api?.message_total) || 0,
        unread: Number(api?.message_unread) || 0,
        items: messages.map(mapInboxMessage),
        pagination: normalizePagination(api?.pagination),
    };
}

function mapAttachmentsToDto(attachments?: MailAttachment[]): PreparedAttachment[] {
    if (!attachments || attachments.length === 0) {
        return [];
    }

    return attachments.map((attachment) => ({
        name: attachment.name,
        file_type: attachment.fileType || "",
        size: String(Number(attachment.size) || 0),
        storage_path: normalizeStoragePath(attachment),
    }));
}

function normalizeStoragePath(attachment: MailAttachment): string {
    const candidate = (attachment.storagePath ?? "").trim();
    if (candidate.length > 0) {
        return candidate;
    }
    const safeName = buildSafeFileName(attachment.name);
    const path = `${ATTACHMENT_PATH_PREFIX}/${Date.now()}-${safeName}`;
    return path.slice(0, MAX_STORAGE_PATH_LENGTH);
}

function buildSafeFileName(name: string): string {
    const trimmed = name.trim() || DEFAULT_ATTACHMENT_EXTENSION;
    const parts = trimmed.split(".");
    const extRaw = parts.length > 1 ? parts.pop() || DEFAULT_ATTACHMENT_EXTENSION : DEFAULT_ATTACHMENT_EXTENSION;
    const baseRaw = parts.join(".") || "file";
    const ext = extRaw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || DEFAULT_ATTACHMENT_EXTENSION;
    const base = baseRaw.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "") || "file";
    const limitedBase = base.slice(0, 80);
    return `${limitedBase}.${ext}`;
}

function mapInboxMessage(apiMessage: InboxMessageDto): Mail {
    const isRead = parseIsRead(
        apiMessage.is_read ??
            (apiMessage as unknown as { read_status?: unknown }).read_status ??
            (apiMessage as unknown as { readStatus?: unknown }).readStatus
    );
    return {
        id: apiMessage.id,
        from: apiMessage.sender.username || apiMessage.sender.email,
        subject: apiMessage.topic,
        preview: apiMessage.snippet,
        time: formatDateTimeFromBackend(apiMessage.datetime),
        avatarUrl: ensureHttpsAssetUrl(apiMessage.sender.avatar),
        isRead,
    };
}

function normalizePagination(pagination?: InboxApiResponse["pagination"]): NormalizedPagination {
    return {
        hasNext: parseBooleanLike(pagination?.has_next),
        nextLastMessageId: pagination?.next_last_message_id
            ? String(pagination.next_last_message_id)
            : undefined,
        nextLastDatetime: pagination?.next_last_datetime || undefined,
    };
}

function parseBooleanLike(raw: unknown): boolean {
    if (typeof raw === "boolean") return raw;
    if (typeof raw === "number") return raw > 0;
    if (typeof raw === "string") {
        const norm = raw.trim().toLowerCase();
        return norm === "true" || norm === "1" || norm === "yes";
    }
    return false;
}

function mapMessageDetails(id: string, dto: MessageDetailsDto): MailDetail {
    const text = dto?.text ?? "";
    const senderEmail = dto?.sender?.email ?? dto?.email ?? "";
    const senderUsername = dto?.sender?.username ?? dto?.username ?? "";
    const senderDisplay =
        senderUsername.trim().length > 0 ? senderUsername.trim() : senderEmail.trim() || SENDER_FALLBACK;
    const rawReceivers = (dto as any).receivers ?? (dto as any).Receivers;
    const firstReceiver =
        Array.isArray(rawReceivers) && rawReceivers.length
            ? rawReceivers
                  .map((r: any) => (r?.email ?? "").trim())
                  .find((val: string) => val.length > 0)
            : undefined;
    const recipient =
        firstReceiver ||
        (dto as any).recipient?.trim?.() ||
        (dto as any).receiver?.trim?.() ||
        (dto as any).to?.trim?.() ||
        dto.email?.trim?.() ||
        "";

    return {
        id,
        from: senderDisplay,
        fromEmail: senderEmail.trim() || undefined,
        recipient: recipient || undefined,
        subject: dto.topic ?? "",
        preview: text.slice(0, 120),
        time: formatDateTimeFromBackend(dto.datetime),
        avatarUrl: ensureHttpsAssetUrl(dto.sender?.avatar ?? dto.avatar ?? null),
        isRead: true,
        body: text.replace(/\n/g, "<br>"),
        threadId: dto.thread_id,
        attachments: mapAttachments(dto.files ?? dto.Files),
    };
}

function parseIsRead(raw: unknown): boolean {
    if (typeof raw === "boolean") {
        return raw;
    }
    if (typeof raw === "number") {
        return raw > 0;
    }
    if (typeof raw === "string") {
        const normalized = raw.trim().toLowerCase();
        return normalized === "true" || normalized === "1" || normalized === "yes";
    }
    return false;
}

function mapAttachments(files: MessageFileDto[] | undefined): MailAttachment[] | undefined {
    if (!files?.length) {
        return undefined;
    }

    return files.map((file) => ({
        name: file.name,
        fileType: file.file_type,
        size: typeof file.size === "string" ? Number(file.size) || 0 : file.size,
        storagePath: file.storage_path ?? null,
    }));
}
