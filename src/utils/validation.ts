import {
    BIRTHDAY_EMPTY_ERROR, BIRTHDAY_NOT_ALLOWED_ERROR,
    EMAIL_REGEX,
    EMAIL_SAFE_REGEX, EMPTY_EMAIL_ERROR, INCORRECT_EMAIL_ERROR,
    LOGIN_EMPTY_ERROR,
    LOGIN_NOT_ALLOWED_ERROR,
    LOGIN_TOO_LONG_ERROR,
    NAME_EMPTY_ERROR, NAME_HAS_INVALID_CHARS_ERROR,
    NAME_REGEX,
    NAME_TOO_SHORT_ERROR,
    PASSWORD_EMPTY_ERROR,
    PASSWORD_HAS_INVALID_CHARS_ERROR,
    PASSWORD_NOT_ALLOWED_ERROR,
    PASSWORD_REGEX, PATRONYMIC_HAS_INVALID_CHARS_ERROR,
    PROFILE_TEXT_REGEX, REPEAT_PASSWORD_EMPTY_ERROR, REPEAT_PASSWORD_MISMATCH_ERROR, SURNAME_EMPTY_ERROR,
    SURNAME_HAS_INVALID_CHARS_ERROR,
    USER_LOGIN_REGEX
} from "./constants";

export type FieldError<T extends string> = {
    field: T;
    message: string;
};

export type LoginFormFields = {
    login: string;
    password: string;
};

export type RegisterFormFields = {
    name: string;
    login: string;
    birthdate: string;
    gender?: string;
    password: string;
    passwordRepeat: string;
};

export type ProfileFormFields = {
    firstName: string;
    lastName: string;
    middleName: string;
    birthDate: string;
    gender: string;
};

export function validateLoginForm(values: LoginFormFields): FieldError<keyof LoginFormFields>[] {
    const errors: FieldError<keyof LoginFormFields>[] = [];

    const login = values.login.trim();
    const password = values.password.trim();

    if (!login) {
        errors.push({ field: "login", message: LOGIN_EMPTY_ERROR  });
    } else if (login.length > 30) {
        errors.push({ field: "login", message: LOGIN_TOO_LONG_ERROR});
    } else if (!isAllowedLogin(login)) {
        errors.push({ field: "login", message: LOGIN_NOT_ALLOWED_ERROR});
    }

    if (!password) {
        errors.push({ field: "password", message: PASSWORD_EMPTY_ERROR});
    } else if (password.length < 6) {
        errors.push({ field: "password", message: PASSWORD_NOT_ALLOWED_ERROR});
    } else if (!PASSWORD_REGEX.test(password)) {
        errors.push({ field: "password", message: PASSWORD_HAS_INVALID_CHARS_ERROR});
    }

    return errors;
}

export function validateRegisterForm(values: RegisterFormFields): FieldError<keyof RegisterFormFields>[] {
    const errors: FieldError<keyof RegisterFormFields>[] = [];

    const name = values.name.trim();
    const login = values.login.trim();
    const birthdate = values.birthdate.trim();
    const password = values.password.trim();
    const passwordRepeat = values.passwordRepeat.trim();

    if (!name) {
        errors.push({ field: "name", message: NAME_EMPTY_ERROR });
    } else if (name.length < 2) {
        errors.push({ field: "name", message: NAME_TOO_SHORT_ERROR});
    } else if (!NAME_REGEX.test(name)) {
        errors.push({ field: "name", message: NAME_HAS_INVALID_CHARS_ERROR});
    }

    if (!login) {
        errors.push({ field: "login", message: LOGIN_EMPTY_ERROR });
    } else if (login.length > 30) {
        errors.push({ field: "login", message: LOGIN_TOO_LONG_ERROR});
    } else if (!USER_LOGIN_REGEX.test(login)) {
        errors.push({ field: "login", message: LOGIN_NOT_ALLOWED_ERROR});
    }

    if (!birthdate) {
        errors.push({ field: "birthdate", message: BIRTHDAY_EMPTY_ERROR});
    } else if (!isValidPastDate(birthdate)) {
        errors.push({ field: "birthdate", message: BIRTHDAY_NOT_ALLOWED_ERROR});
    }

    if (!password) {
        errors.push({ field: "password", message: PASSWORD_EMPTY_ERROR });
    } else if (password.length < 6) {
        errors.push({ field: "password", message: PASSWORD_NOT_ALLOWED_ERROR });
    } else if (!PASSWORD_REGEX.test(password)) {
        errors.push({ field: "password", message: PASSWORD_HAS_INVALID_CHARS_ERROR });
    }

    if (!passwordRepeat) {
        errors.push({ field: "passwordRepeat", message: REPEAT_PASSWORD_EMPTY_ERROR });
    } else if (password && password !== passwordRepeat) {
        errors.push({ field: "passwordRepeat", message: REPEAT_PASSWORD_MISMATCH_ERROR});
    }

    return errors;
}

export function validateProfileForm(values: ProfileFormFields): FieldError<keyof ProfileFormFields>[] {
    const errors: FieldError<keyof ProfileFormFields>[] = [];

    const firstName = values.firstName.trim();
    const lastName = values.lastName.trim();
    const middleName = values.middleName.trim();
    const birthDate = values.birthDate.trim();

    if (!firstName) {
        errors.push({ field: "firstName", message: NAME_EMPTY_ERROR });
    } else if (!PROFILE_TEXT_REGEX.test(firstName)) {
        errors.push({ field: "firstName", message: NAME_HAS_INVALID_CHARS_ERROR });
    }

    if (!lastName) {
        errors.push({ field: "lastName", message: SURNAME_EMPTY_ERROR});
    } else if (!PROFILE_TEXT_REGEX.test(lastName)) {
        errors.push({ field: "lastName", message:  SURNAME_HAS_INVALID_CHARS_ERROR});
    }

    if (middleName && !PROFILE_TEXT_REGEX.test(middleName)) {
        errors.push({ field: "middleName", message: PATRONYMIC_HAS_INVALID_CHARS_ERROR});
    }

    if (birthDate && !isValidPastDate(birthDate)) {
        errors.push({ field: "birthDate", message: BIRTHDAY_NOT_ALLOWED_ERROR });
    }

    return errors;
}

export function validateRecipientAddress(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return EMPTY_EMAIL_ERROR;
    }
    if (!EMAIL_REGEX.test(trimmed) || !EMAIL_SAFE_REGEX.test(trimmed)) {
        return INCORRECT_EMAIL_ERROR;
    }
    return null;
}

function isAllowedLogin(value: string): boolean {
    if (USER_LOGIN_REGEX.test(value)) {
        return true;
    }
    if (!EMAIL_REGEX.test(value)) {
        return false;
    }
    return EMAIL_SAFE_REGEX.test(value);
}

function isValidPastDate(value: string): boolean {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
        return false;
    }
    const date = new Date(timestamp);
    const now = new Date();
    const oldPast = new Date(1890, 0, 0);
    return date <= now && date > oldPast;
}
