import type { MailAttachment, MailDetail } from "@app-types/mail";

export type ComposeDraft = {
    initialTo?: string;
    initialSubject?: string;
    initialBody?: string;
    focusField?: "to" | "subject" | "body";
    threadId?: string;
    draftId?: string;
    attachments?: MailAttachment[];
};

export function buildReplyDraft(mail: MailDetail): ComposeDraft {
    const initialTo = (mail.fromEmail ?? "").trim();
    const initialSubject = ensureSubjectPrefix(mail.subject, "Re:");
    const initialBody = buildReplyBody(mail);

    return {
        initialTo,
        initialSubject,
        initialBody,
        focusField: initialTo ? "body" : "to",
        threadId: mail.threadId,
    };
}

export function buildForwardDraft(mail: MailDetail): ComposeDraft {
    return {
        initialSubject: ensureSubjectPrefix(mail.subject, "Fwd:"),
        initialBody: buildForwardBody(mail),
        focusField: "to",
        threadId: mail.threadId,
    };
}

export function ensureSubjectPrefix(subject: string, prefix: string): string {
    const trimmed = (subject ?? "").trim();
    if (!trimmed) {
        return prefix;
    }

    if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
        return trimmed;
    }

    return `${prefix} ${trimmed}`;
}

function buildReplyBody(mail: MailDetail): string {
    const plainText = getPlainTextFromBody(mail.body);
    const quotedLines = splitLines(plainText).map((line) => (line.length > 0 ? `> ${line}` : ">"));
    const quotedBody = quotedLines.join("\n");
    const sender = mail.fromEmail ? `${mail.from} <${mail.fromEmail}>` : mail.from;
    const timestamp = mail.time ? `В ${mail.time}, ${sender} написал:` : `${sender} написал:`;

    const parts: string[] = ["", "", timestamp];
    if (quotedBody.length > 0) {
        parts.push(quotedBody);
    }

    return parts.join("\n");
}

function buildForwardBody(mail: MailDetail): string {
    const sender = mail.fromEmail ? `${mail.from} <${mail.fromEmail}>` : mail.from;
    const headerLines = [
        "---------- Пересылаемое сообщение ---------",
        `От кого: ${sender}`,
    ];

    if (mail.time) {
        headerLines.push(`Время: ${mail.time}`);
    }

    if (mail.subject) {
        headerLines.push(`Тема: ${mail.subject}`);
    }

    const plainText = getPlainTextFromBody(mail.body);
    let body = `\n\n${headerLines.join("\n")}\n\n`;
    if (plainText) {
        body += plainText;
    }
    return body;
}

function getPlainTextFromBody(html: string): string {
    const container = document.createElement("div");
    container.innerHTML = html;

    const breaks = Array.from(container.querySelectorAll("br"));
    for (const br of breaks) {
        br.replaceWith("\n");
    }

    const textContent = container.textContent ?? "";
    const withoutCarriage = textContent.split("\r").join("");
    const withoutNbsp = withoutCarriage.split("\u00a0").join(" ");
    return withoutNbsp.trimEnd();
}

function splitLines(value: string): string[] {
    if (!value) {
        return [];
    }

    const result: string[] = [];
    let buffer = "";

    for (let i = 0; i < value.length; i += 1) {
        const char = value[i];

        if (char === "\n") {
            result.push(buffer);
            buffer = "";
            continue;
        }

        if (char === "\r") {
            result.push(buffer);
            buffer = "";

            if (value[i + 1] === "\n") {
                i += 1;
            }
            continue;
        }

        buffer += char;
    }

    result.push(buffer);
    return result;
}
