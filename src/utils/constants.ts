export const LOGIN_EMPTY_ERROR = "Введите логин";
export const LOGIN_NOT_ALLOWED_ERROR = "Некорректный формат почты";

export const PASSWORD_EMPTY_ERROR = "Введите пароль";
export const PASSWORD_NOT_ALLOWED_ERROR = "Пароль должен быть не короче 6 символов";
export const PASSWORD_HAS_INVALID_CHARS_ERROR = "Пароль содержит недопустимые символы";

export const NAME_EMPTY_ERROR = "Введите имя";
export const NAME_TOO_SHORT_ERROR = "Имя слишком короткое";
export const NAME_HAS_INVALID_CHARS_ERROR = "Имя содержит недопустимые символы";

export const SURNAME_EMPTY_ERROR = "Введите фамилию";
export const SURNAME_HAS_INVALID_CHARS_ERROR = "Фамилия содержит недопустимые символы";

export const PATRONYMIC_HAS_INVALID_CHARS_ERROR = "Отчество содержит недопустимые символы";

export const BIRTHDAY_EMPTY_ERROR = "Укажите дату рождения";
export const BIRTHDAY_NOT_ALLOWED_ERROR = "Некорректная дата рождения";

export const EMPTY_EMAIL_ERROR = "Укажите email получателя";
export const INCORRECT_EMAIL_ERROR = "Некорректный email";

export const REPEAT_PASSWORD_EMPTY_ERROR = "Повторите пароль";
export const REPEAT_PASSWORD_MISMATCH_ERROR = "Пароли не совпадают";

export const ASCII_LETTERS = "A-Za-z";
export const CYRILLIC_LETTERS = "А-Яа-я";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
export const EMAIL_SAFE_REGEX = /^[A-Za-z0-9@._+-]+$/;
export const USER_LOGIN_REGEX = new RegExp(`^[A-Za-z0-9._-]+$`);
export const NAME_REGEX = new RegExp(`^[${ASCII_LETTERS}${CYRILLIC_LETTERS}\\s'-]+$`);
export const PASSWORD_REGEX = new RegExp(`^[${ASCII_LETTERS}${CYRILLIC_LETTERS}0-9!@#$%^&*()_+\\-=\\[\\]{};':"\\\\|,.<>/?~\\s]+$`);
export const PROFILE_TEXT_REGEX = new RegExp(`^[${ASCII_LETTERS}${CYRILLIC_LETTERS}\\s'-]*$`);
