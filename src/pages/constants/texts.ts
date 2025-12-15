export const AUTH_PAGE_TEXTS = {
    headerText: "Войти в почту",
    registrationButtonText: "Зарегистрироваться",
    loginInputPlaceholder: "Логин или email",
    passwordInputPlaceholder: "Пароль",
    forgotPasswordText: "Забыли пароль?",
    submitLoginButtonText: "Войти",
    genericError: "Не удалось войти. Проверьте данные и попробуйте снова.",
} as const;

export const REGISTER_PAGE_TEXTS = {
    headerText: "Регистрация",
    switchToAuthButton: "У меня уже есть аккаунт",
    genericError: "Не удалось завершить регистрацию. Проверьте данные и попробуйте снова.",
} as const;

export const REGISTER_FORM_TEXTS = {
    namePlaceholder: "Имя",
    loginPlaceholder: "Логин",
    genderLabel: "Пол",
    genderOptions: {
        male: "Мужской",
        female: "Женский",
    },
    passwordPlaceholder: "Пароль",
    passwordRepeatPlaceholder: "Повторите пароль",
    submitLabel: "Зарегистрироваться",
} as const;

export const PROFILE_FORM_TEXTS = {
    title: "Профиль",
    firstNameLabel: "Имя",
    lastNameLabel: "Фамилия",
    middleNameLabel: "Отчество",
    birthDateLabel: "Дата рождения",
    genderLabel: "Пол",
    genderOptions: {
        male: "Мужской",
        female: "Женский",
    },
    uploadButtonDefault: "Загрузить фото",
    uploadButtonLoading: "Загрузка...",
    saveButtonLabel: "Сохранить",
    saveButtonLoading: "Сохраняем...",
    cancelButtonLabel: "Отменить",
    avatarTooLargeWarning: "Размер файла превышает 1 МБ",
} as const;

export const PROFILE_SIDEBAR_TEXTS = {
    tabs: [
        {
            id: "personal",
            label: "Профиль",
            icon: "/img/profile-sidebar-personal-logo.svg",
        },
        {
            id: "interface",
            label: "Интерфейс",
            icon: "/img/profile-sidebar-interface-logo.svg",
        },
    ] as const,
    backButtonLabel: "к письмам",
} as const;

export const INBOX_PAGE_TEXTS = {
    emptyList: "Писем нет",
    recipientRequired: "Укажите email получателя",
    bodyRequired: "Добавьте текст письма",
    offlineMailTitle: "Письмо недоступно",
    offlineMailMessage:
        "Не удалось загрузить письмо, возможно нет подключения к интернету. Попробуйте обновить страницу.",
    offlineBackAction: "Вернуться к списку",
} as const;

export const MAIL_VIEW_TEXTS = {
    backAriaLabel: "Назад",
    delete: "Удалить",
    moveToFolder: "В папку",
    markAsSpam: "Спам",
    reply: "Ответить",
    forward: "Переслать",
    recipientLabel: "Кому:",
    recipientFallback: "вам",
} as const;
