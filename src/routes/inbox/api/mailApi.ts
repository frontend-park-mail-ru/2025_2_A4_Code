import {apiService} from "../../../features/ApiServices/ApiService";
import {Mail, MailDetail} from "../../../types/mail";
import {inboxMessagesMock, mailDetailsMock} from "./mocks";

type InboxApiBody = {
    message_total: number;
    message_unread: number;
    messages: ApiMessage[];
};

type ApiMessage = {
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

type MessageDetailBody = {
    topic: string;
    text: string;
    datetime: string;
    sender: ApiMessage["sender"];
    thread_id?: string;
    files?: Array<{
        name: string;
        file_type: string;
        size: number;
        storage_path: string;
    }>;
};

type ApiResponse<T> = {
    status: string;
    message?: string;
    body: T;
};

const INBOX_ENDPOINT = "/messages/inbox";
const MESSAGE_DETAILS_ENDPOINT = (id: string) => `/messages/${id}`;

export async function fetchInboxMessages(): Promise<Mail[]> {
    try {
        const response = await apiService.request<ApiResponse<InboxApiBody>>(INBOX_ENDPOINT);
        return response.body.messages.map(mapMessage);
    } catch (error) {
        if (inboxMessagesMock.length > 0) {
            return inboxMessagesMock;
        }
        throw error;
    }
}

export async function fetchMessageById(id: string): Promise<MailDetail> {
    try {
        const response = await apiService.request<ApiResponse<MessageDetailBody>>(MESSAGE_DETAILS_ENDPOINT(id));
        return mapMessageDetail(id, response.body);
    } catch (error) {
        const mock = mailDetailsMock[id];
        if (mock) {
            return mock;
        }
        throw error;
    }
}

function mapMessage(apiMessage: ApiMessage): Mail {
    return {
        id: apiMessage.id,
        from: apiMessage.sender.username,
        subject: apiMessage.topic,
        preview: apiMessage.snippet,
        time: apiMessage.datetime,
        avatarUrl: apiMessage.sender.avatar ?? null,
        isRead: apiMessage.is_read,
    };
}

function mapMessageDetail(id: string, body: MessageDetailBody): MailDetail {
    return {
        id,
        from: body.sender.username,
        subject: body.topic,
        preview: body.text.slice(0, 120),
        time: body.datetime,
        avatarUrl: body.sender.avatar ?? null,
        isRead: true,
        body: body.text.replace(/\n/g, "<br>"),
        threadId: body.thread_id,
        attachments: body.files?.map((file) => ({
            name: file.name,
            fileType: file.file_type,
            size: file.size,
            storagePath: file.storage_path,
        })),
    };
}
