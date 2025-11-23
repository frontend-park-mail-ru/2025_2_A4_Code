export const HEADER_TEXTS = {
    defaultSearchPlaceholder: "Поиск",
    defaultAvatarLabel: " ",
} as const;

export const AVATAR_MENU_TEXTS = {
    profile: "Профиль",
    settings: "Настройки",
    logout: "Выйти",
} as const;

export type SidebarFolderText = {
    id: string;
    name: string;
    count?: number;
    icon?: string;
};

export const SIDEBAR_TEXTS: {
    composeButton: string;
    defaultFolders: SidebarFolderText[];
} = {
    composeButton: "Написать письмо",
    defaultFolders: [
        { id: "inbox", name: "Входящие", count: 0, icon: "/img/folder-inbox.svg" },
        { id: "conversations", name: "Диалоги", icon: "/img/folder-dialog.svg" },
        { id: "sent", name: "Отправленные", icon: "/img/folder-sent.svg" },
        { id: "draft", name: "Черновики", icon: "/img/folder-drafts.svg" },
        { id: "spam", name: "Спам", icon: "/img/folder-spam.svg" },
        { id: "trash", name: "Корзина", icon: "/img/folder-trash.svg" },
        { id: "custom", name: "Новая папка", icon: "/img/folder-custom.svg" },
    ],
};

export const MAIL_LIST_TEXTS = {
    emptyMessage: "No_emails_text",
} as const;

export const COMPOSE_MODAL_TEXTS = {
    attachFile: "Прикрепить файл",
    saveDraft: "Сохранить черновик",
    send: "Отправить",
} as const;
