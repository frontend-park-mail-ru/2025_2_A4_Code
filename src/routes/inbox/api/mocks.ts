import {Mail, MailDetail} from "../../../types/mail";

export const inboxMessagesMock: Mail[] = [
    {
        id: "a4c6451d-8803-48e1-b929-3e44a1f7ddf8",
        from: "Mail Administration",
        subject: "Документы за август",
        preview: "Здравствуйте! Во вложении документы за 12.08-17.08. Хорошего дня!",
        time: "21.08.2025 21:25",
        avatarUrl: "https://example.com/avatar/mail-admin.png",
        isRead: false,
    },
    {
        id: "f3db68c5-2d9f-4c79-9d53-802da243caa5",
        from: "Александра Петрова",
        subject: "Напоминание о встрече",
        preview: "Добрый день! Напоминаю, что завтра в 10:00 встреча по проекту.",
        time: "20.08.2025 18:10",
        avatarUrl: "https://example.com/avatar/alexandra.png",
        isRead: true,
    },
    {
        id: "1f2c7117-67f8-4e0d-9fce-8397cc867986",
        from: "HR A4Code",
        subject: "Обновление политики отпуска",
        preview: "Коллеги, обратите внимание на обновлённые правила оформления отпуска.",
        time: "19.08.2025 09:45",
        avatarUrl: "https://example.com/avatar/hr.png",
        isRead: false,
    },
];

export const mailDetailsMock: Record<string, MailDetail> = {
    "a4c6451d-8803-48e1-b929-3e44a1f7ddf8": {
        id: "a4c6451d-8803-48e1-b929-3e44a1f7ddf8",
        from: "Mail Administration",
        subject: "Документы за август",
        preview: "Здравствуйте! Во вложении документы за 12.08-17.08. Хорошего дня!",
        time: "21.08.2025 21:25",
        avatarUrl: "https://example.com/avatar/mail-admin.png",
        isRead: true,
        body: `Здравствуйте!\n\nВо вложении документы за отчётную неделю 12.08-17.08.\nПожалуйста, подтвердите получение.\n\nС уважением,\nКоманда A4Code`,
        threadId: "thread-001",
        attachments: [
            {
                name: "Отчёт.pdf",
                fileType: "application/pdf",
                size: 204800,
                storagePath: "https://example.com/files/report.pdf",
            },
        ],
    },
    "f3db68c5-2d9f-4c79-9d53-802da243caa5": {
        id: "f3db68c5-2d9f-4c79-9d53-802da243caa5",
        from: "Александра Петрова",
        subject: "Напоминание о встрече",
        preview: "Добрый день! Напоминаю, что завтра в 10:00 встреча по проекту.",
        time: "20.08.2025 18:10",
        avatarUrl: "https://example.com/avatar/alexandra.png",
        isRead: true,
        body: `Добрый день!\n\nНапоминаю, что завтра в 10:00 встреча по проекту A4Mail. Созвон назначен в Zoom.\nБуду благодарна, если пришлёшь вопросы заранее.\n\nХорошего вечера!\nАлександра`,
        threadId: "thread-002",
    },
    "1f2c7117-67f8-4e0d-9fce-8397cc867986": {
        id: "1f2c7117-67f8-4e0d-9fce-8397cc867986",
        from: "HR A4Code",
        subject: "Обновление политики отпуска",
        preview: "Коллеги, обратите внимание на обновлённые правила оформления отпуска.",
        time: "19.08.2025 09:45",
        avatarUrl: "https://example.com/avatar/hr.png",
        isRead: false,
        body: `Коллеги, добрый день!\n\nМы обновили внутреннюю политику оформления отпуска.\nОсновные изменения:\n\n• заявки нужно подавать минимум за 14 дней;\n• подтверждение отправляется автоматически;\n• появилась возможность переноса дней на следующий квартал.\n\nПодробности — во внутреннем портале.\n`,
        threadId: "thread-003",
    },
};
