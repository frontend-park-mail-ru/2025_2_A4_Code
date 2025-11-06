export const AUTH_PAGE_TEXTS = {
    headerText: "Войти в почту",
    registrationButtonText: "Зарегистрироваться",
    loginInputPlaceholder: "Логин или email",
    passwordInputPlaceholder: "Пароль",
    forgotPasswordText: "Забыли пароль?",
    submitLoginButtonText: "Войти",
    genericError: "Не удалось выполнить вход. Проверьте данные и попробуйте снова.",
} as const;

export const REGISTER_PAGE_TEXTS = {
    headerText: "Регистрация",
    switchToAuthButton: "У меня уже есть аккаунт",
    genericError: "Не удалось завершить регистрацию. Попробуйте ещё раз.",
} as const;

export const REGISTER_FORM_TEXTS = {
    namePlaceholder: "Имя",
    loginPlaceholder: "login@flintmail.ru",
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
    avatarTooLargeWarning: "Размер файла превышает 5 МБ",
} as const;

export const PROFILE_SIDEBAR_TEXTS = {
    tabs: [
        {
            id: "personal",
            label: "Личные данные",
            icon: "/img/profile-sidebar-personal-logo.svg",
        },
        {
            id: "interface",
            label: "Интерфейс",
            icon: "/img/profile-sidebar-interface-logo.svg",
        },
    ] as const,
    backButtonLabel: "К письмам",
} as const;

export const INBOX_PAGE_TEXTS = {
    emptyList: "Пока писем нет.",
    recipientRequired: "Нужно указать получателя письма",
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
