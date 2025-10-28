export interface Mail {
    id: string;
    from: string;
    subject: string;
    preview: string;
    time: string;
    avatarUrl?: string | null;
    isRead?: boolean;
    body?: string;
}

export interface MailAttachment {
    name: string;
    fileType: string;
    size: number;
    storagePath: string;
}

export interface MailDetail extends Mail {
    body: string;
    threadId?: string;
    attachments?: MailAttachment[];
}
