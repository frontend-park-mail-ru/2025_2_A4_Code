import { apiService } from "@shared/api/ApiService";
import type { ApiResponse } from "@shared/api/types";
import type { Mail, MailAttachment, MailDetail } from "@app-types/mail";
import { formatDateTimeFromBackend } from "@utils";
import { ensureHttpsAssetUrl } from "@shared/utils/url";

type InboxApiResponse = {
    message_total: number;
    message_unread: number;
    messages: InboxMessageDto[];
    pagination: {
        has_next: boolean;
        next_last_message_id?: number;
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
};

type MessageFileDto = {
    name: string;
    file_type: string;
    size: number;
    storage_path?: string | null;
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
    pagination: InboxApiResponse["pagination"];
};

export type SendMessagePayload = {
    to: string;
    subject: string;
    body: string;
};

export type ReplyMessagePayload = {
    to: string;
    subject: string;
    body: string;
    rootMessageId: string;
    threadRoot: string;
};

export type SaveDraftPayload = {
    to?: string;
    subject?: string;
    body?: string;
    threadId?: string;
    draftId?: string;
};

export type SendDraftPayload = {
    draftId: string;
    to?: string;
    subject?: string;
    body?: string;
    threadId?: string;
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

export async function fetchInboxMessages(): Promise<InboxSummary> {
    const response = await apiService.request<ApiResponse<InboxApiResponse>>(INBOX_ENDPOINT);
    const messages = response.body?.messages ?? [];
    return {
        total: Number(response.body.message_total) || 0,
        unread: Number(response.body.message_unread) || 0,
        items: messages.map(mapInboxMessage),
        pagination: response.body.pagination,
    };
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

export async function fetchFolderMessages(folderName: string): Promise<InboxSummary> {
    if (!folderName || folderName === "inbox") {
        return fetchInboxMessages();
    }

    const response = await apiService.request<ApiResponse<InboxApiResponse>>(FOLDER_ENDPOINT(folderName));
    const messages = response.body?.messages ?? [];
    return {
        total: Number(response.body.message_total) || 0,
        unread: Number(response.body.message_unread) || 0,
        items: messages.map(mapInboxMessage),
        pagination: response.body.pagination,
    };
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
        files: [],
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
        files: [],
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
        files: [],
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

function mapInboxMessage(apiMessage: InboxMessageDto): Mail {
    const isRead =
        typeof apiMessage.is_read === "string"
            ? apiMessage.is_read.toLowerCase() === "true"
            : Boolean(apiMessage.is_read);
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

function mapMessageDetails(id: string, dto: MessageDetailsDto): MailDetail {
    const text = dto?.text ?? "";
    const senderEmail = dto?.sender?.email ?? dto?.email ?? "";
    const senderUsername = dto?.sender?.username ?? dto?.username ?? "";
    const senderDisplay =
        senderUsername.trim().length > 0 ? senderUsername.trim() : senderEmail.trim() || SENDER_FALLBACK;

    return {
        id,
        from: senderDisplay,
        fromEmail: senderEmail.trim() || undefined,
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

function mapAttachments(files: MessageFileDto[] | undefined): MailAttachment[] | undefined {
    if (!files?.length) {
        return undefined;
    }

    return files.map((file) => ({
        name: file.name,
        fileType: file.file_type,
        size: file.size,
        storagePath: file.storage_path ?? null,
    }));
}
