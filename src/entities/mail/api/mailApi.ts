import { apiService } from "@shared/api/ApiService";
import type { ApiResponse } from "@shared/api/types";
import type { Mail, MailAttachment, MailDetail } from "@app-types/mail";
import { formatDateTimeFromBackend } from "@utils";

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
const INBOX_ENDPOINT = "/messages/inbox";
const MESSAGE_ENDPOINT = (id: string) => `/messages/${id}`;
const SEND_ENDPOINT = "/messages/send";
const REPLY_ENDPOINT = "/messages/reply";
const SENDER_FALLBACK = "Неизвестный отправитель";

export async function fetchInboxMessages(): Promise<InboxSummary> {
    const response = await apiService.request<ApiResponse<InboxApiResponse>>(INBOX_ENDPOINT);
    return {
        total: response.body.message_total,
        unread: response.body.message_unread,
        items: response.body.messages.map(mapInboxMessage),
        pagination: response.body.pagination,
    };
}

export async function fetchMessageById(id: string): Promise<MailDetail> {
    const response = await apiService.request<ApiResponse<MessageDetailsDto>>(MESSAGE_ENDPOINT(id));
    return mapMessageDetails(id, response.body);
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

function mapInboxMessage(apiMessage: InboxMessageDto): Mail {
    return {
        id: apiMessage.id,
        from: apiMessage.sender.username || apiMessage.sender.email,
        subject: apiMessage.topic,
        preview: apiMessage.snippet,
        time: formatDateTimeFromBackend(apiMessage.datetime),
        avatarUrl: apiMessage.sender.avatar ?? null,
        isRead: apiMessage.is_read,
    };
}

function mapMessageDetails(id: string, dto: MessageDetailsDto): MailDetail {
    const senderEmail = dto.sender?.email ?? dto.email ?? "";
    const senderUsername = dto.sender?.username ?? dto.username ?? "";
    const senderDisplay = senderUsername.trim().length > 0
        ? senderUsername.trim()
        : senderEmail.trim() || SENDER_FALLBACK;

    return {
        id,
        from: senderDisplay,
        fromEmail: senderEmail.trim() || undefined,
        subject: dto.topic,
        preview: dto.text.slice(0, 120),
        time: formatDateTimeFromBackend(dto.datetime),
        avatarUrl: dto.sender?.avatar ?? dto.avatar ?? null,
        isRead: true,
        body: dto.text.replace(/\n/g, "<br>"),
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
