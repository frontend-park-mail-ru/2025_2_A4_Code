/**
 * Утилиты для валидации форм
 * @module validation
 */

/**
 * Валидация формы авторизации.
 * @param {{login?: string, password?: string}} values
 * @returns {Record<string,string>} errors map
 */
export function validateLogin(values) {
  const errors = {};
  const login = (values.login || '').trim();
  const password = (values.password || '').trim();

  if (!login) {
    errors.login = 'Введите логин или email';
  }
  if (!password) {
    errors.password = 'Введите пароль';
  } else if (password.length < 6) {
    errors.password = 'Пароль должен быть не менее 6 символов';
  }
  return errors;
}

/**
 * Попытка разбора строки даты рождения пользователя.
 * Поддерживает форматы YYYY-MM-DD и DD.MM.YYYY.
 * Возвращает Date или null, если строка некорректна.
 * @param {string} input
 * @returns {Date|null}
 */
function parseBirthday(input) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dot = /^(\d{2})\.(\d{2})\.(\d{4})$/;

  let y, m, d;
  let match;
  if ((match = input.match(iso))) {
    y = Number(match[1]); m = Number(match[2]); d = Number(match[3]);
  } else if ((match = input.match(dot))) {
    d = Number(match[1]); m = Number(match[2]); y = Number(match[3]);
  } else {
    return null;
  }

  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

/**
 * Валидация формы регистрации.
 * @param {{publicname?:string, username?:string, birthday?:string, password?:string, repeatpassword?:string, gender?:'female'|'male'}} values
 * @returns {Record<string,string>} errors map
 */
export function validateSignup(values) {
  const errors = {};
  const publicname = (values.publicname || '').trim();
  const username = (values.username || '').trim();
  const birthday = (values.birthday || '').trim();
  const password = (values.password || '').trim();
  const repeatpassword = (values.repeatpassword || '').trim();
  const gender = values.gender;

  if (!publicname) {
    errors.publicname = 'Имя обязательно';
  } else if (publicname.length < 2) {
    errors.publicname = 'Имя должно быть не короче 2 символов';
  }

  if (!username) {
    errors.username = 'Логин обязателен';
  } else if (username.length < 3) {
    errors.username = 'Логин должен быть не менее 3 символов';
  }

  if (!birthday) {
    errors.birthday = 'Дата рождения обязательна';
  } else {
    const parsed = parseBirthday(birthday);
    if (!parsed) {
      errors.birthday = 'Некорректная дата. Формат: YYYY-MM-DD или DD.MM.YYYY';
    } else {
      const today = new Date();
      const min = new Date(1900, 0, 1);
      parsed.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      if (parsed > today) {
        errors.birthday = 'Дата рождения не может быть в будущем';
      } else if (parsed < min) {
        errors.birthday = 'Дата рождения слишком ранняя';
      }
    }
  }

  if (!password) {
    errors.password = 'Пароль обязателен';
  } else if (password.length < 6) {
    errors.password = 'Пароль должен быть не менее 6 символов';
  }

  if (!repeatpassword) {
    errors.repeatpassword = 'Повторите пароль';
  } else if (password !== repeatpassword) {
    errors.repeatpassword = 'Пароли не совпадают';
  }

  if (!gender) {
    errors.gender = 'Выберите пол';
  }

  return errors;
}

/**
 * Маппинг ошибок с бэкенда
 * @param {{status?:number, message?:string}|Error} err
 * @returns {Record<string,string>} 
 */ 
export function mapBackendError(err) {
  console.log(err.message);
  const errors = {};
  const status = err?.status;
  const msg = (err?.message || '').toLowerCase();

  if (status === 401) {
    if (msg.includes('логин') || msg.includes('пароль')) {
      errors.general = 'Неверный логин или пароль';
      return errors;
    }
    if (msg.includes('существует')) {
      errors.username = 'Пользователь с таким логином уже существует';
      return errors;
    }
    errors.general = 'Неверный логин или пароль';
    return errors;
  }

  if (status === 400) {
    errors.general = 'Некорректные данные запроса';
    return errors;
  }

  errors.general = err?.message || 'Ошибка запроса';
  return errors;
}
