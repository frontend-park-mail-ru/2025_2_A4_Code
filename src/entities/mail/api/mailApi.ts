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
    is_read: boolean;
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
    root_message_id: number;
    topic: string;
    text: string;
    thread_root: number;
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
    rootMessageId: number;
    threadRoot: number;
};

export type FolderSummary = {
    id: string;
    name: string;
    type: string;
    icon?: string;
    unread?: number;
    backendId?: string;
};

const INBOX_ENDPOINT = "/messages/inbox";
const FOLDERS_ENDPOINT = "/messages/get-folders";
const FOLDER_ENDPOINT = (name: string) => `/folders/${encodeURIComponent(name)}`;
const MESSAGE_ENDPOINT = (id: string) => `/messages/${id}`;
const SEND_ENDPOINT = "/messages/send";
const REPLY_ENDPOINT = "/messages/reply";
const CREATE_FOLDER_ENDPOINT = "/messages/create-folder";
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

    const requestBody: ReplyMessageRequest = {
        root_message_id: payload.rootMessageId,
        topic: payload.subject.trim(),
        text: payload.body,
        thread_root: payload.threadRoot,
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

function mapInboxMessage(apiMessage: InboxMessageDto): Mail {
    return {
        id: apiMessage.id,
        from: apiMessage.sender.username || apiMessage.sender.email,
        subject: apiMessage.topic,
        preview: apiMessage.snippet,
        time: formatDateTimeFromBackend(apiMessage.datetime),
        avatarUrl: ensureHttpsAssetUrl(apiMessage.sender.avatar),
        isRead: apiMessage.is_read,
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
