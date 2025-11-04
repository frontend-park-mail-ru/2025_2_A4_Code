type RegisterFormFields = {
    name: string;
    login: string;
    birthdate: string;
    password: string;
    passwordRepeat: string;
};

export type ValidationError = {
    field: keyof RegisterFormFields;
    message: string;
};

export function validateRegisterForm(values: RegisterFormFields): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!values.name.trim()) {
        errors.push({ field: "name", message: "Введите имя" });
    }

    if (!values.login.trim()) {
        errors.push({ field: "login", message: "Введите логин" });
    }

    if (!values.birthdate) {
        errors.push({ field: "birthdate", message: "Укажите дату рождения" });
    }

    const password = values.password.trim();
    const passwordRepeat = values.passwordRepeat.trim();

    if (!password) {
        errors.push({ field: "password", message: "Введите пароль" });
    } else if (password.length < 6) {
        errors.push({ field: "password", message: "Пароль должен содержать не менее 6 символов" });
    }

    if (!passwordRepeat) {
        errors.push({ field: "passwordRepeat", message: "Повторите пароль" });
    } else if (password && password !== passwordRepeat) {
        errors.push({ field: "passwordRepeat", message: "Пароли не совпадают" });
    }

    return errors;
}
