export const HEADER_TEXTS = {
    defaultSearchPlaceholder: "РџРѕРёСЃРє",
    defaultAvatarLabel: " ",
} as const;

export const AVATAR_MENU_TEXTS = {
    profile: "РџСЂРѕС„РёР»СЊ",
    settings: "РќР°СЃС‚СЂРѕР№РєРё",
    logout: "Р’С‹Р№С‚Рё",
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
    composeButton: "РќР°РїРёСЃР°С‚СЊ РїРёСЃСЊРјРѕ",
    defaultFolders: [
        { id: "inbox", name: "Р’С…РѕРґСЏС‰РёРµ", count: 0, icon: "/img/folder-inbox.svg" },
        { id: "conversations", name: "Р”РёР°Р»РѕРіРё", icon: "/img/folder-dialog.svg" },
        { id: "sent", name: "РћС‚РїСЂР°РІР»РµРЅРЅС‹Рµ", icon: "/img/folder-sent.svg" },
        { id: "draft", name: "Р§РµСЂРЅРѕРІРёРєРё", icon: "/img/folder-drafts.svg" },
        { id: "spam", name: "РЎРїР°Рј", icon: "/img/folder-spam.svg" },
        { id: "trash", name: "РљРѕСЂР·РёРЅР°", icon: "/img/folder-trash.svg" },
        { id: "custom", name: "РќРѕРІР°СЏ РїР°РїРєР°", icon: "/img/folder-custom.svg" },
    ],
};

export const MAIL_LIST_TEXTS = {
    emptyMessage: "No_emails_text",
} as const;

export const COMPOSE_MODAL_TEXTS = {
    attachFile: "РџСЂРёРєСЂРµРїРёС‚СЊ С„Р°Р№Р»",
    saveDraft: "РЎРѕС…СЂР°РЅРёС‚СЊ С‡РµСЂРЅРѕРІРёРє",
    send: "РћС‚РїСЂР°РІРёС‚СЊ",
} as const;

export const INBOX_PAGE_TEXTS = {
    recipientRequired: 'Укажите получателя',
    bodyRequired: 'Добавьте текст письма',
    offlineMailTitle: 'Письмо недоступно',
    offlineMailMessage: 'Мы не смогли загрузить письмо, проверьте подключение и попробуйте снова.',
    offlineBackAction: 'К списку писем',
    emptyList: 'Писем нет',
} as const;

