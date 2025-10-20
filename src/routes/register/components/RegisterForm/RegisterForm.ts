import template from './RegisterForm.hbs';
import './RegisterForm.scss';

interface ValidationErrors {
  name?: string;
  login?: string;
  date?: string;
  gender?: string;
  password?: string;
  password_confirm?: string;
}

export class RegisterForm {
  private errors: ValidationErrors = {};
  private formData: any = {};

  constructor() { }

  private validateName(name: string): string | null {
    if (!name.trim()) return 'Имя обязательно для заполнения';
    if (name.length < 2) return 'Имя должно содержать минимум 2 символа';
    if (!/^[a-zA-Zа-яА-ЯёЁ\s-]+$/.test(name)) return 'Имя может содержать только буквы, пробелы и дефисы';
    return null;
  }

  private validateLogin(login: string): string | null {
    if (!login.trim()) return 'Логин обязателен для заполнения';
    if (login.length < 3) return 'Логин должен содержать минимум 3 символа';
    if (!/^[a-zA-Z0-9@._-]+$/.test(login)) return 'Логин содержит недопустимые символы';
    if (!login.includes('@')) return 'Логин должен содержать @';
    return null;
  }

  private validateDate(date: string): string | null {
    if (!date.trim()) return 'Дата рождения обязательна';
    
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    if (!dateRegex.test(date)) return 'Дата должна быть в формате ДД.ММ.ГГГГ';
    
    const [day, month, year] = date.split('.').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    
    if (birthDate > today) return 'Дата рождения не может быть в будущем';
    if (today.getFullYear() - year < 13) return 'Вам должно быть не менее 13 лет';
    
    return null;
  }

  private validatePassword(password: string): string | null {
    if (!password) return 'Пароль обязателен для заполнения';
    if (password.length < 8) return 'Пароль должен содержать минимум 8 символов';
    if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) return 'Пароль должен содержать буквы в верхнем и нижнем регистре';
    if (!/(?=.*\d)/.test(password)) return 'Пароль должен содержать хотя бы одну цифру';
    return null;
  }

  private validatePasswordConfirm(password: string, passwordConfirm: string): string | null {
    if (!passwordConfirm) return 'Повторите пароль';
    if (password !== passwordConfirm) return 'Пароли не совпадают';
    return null;
  }

  private validateGender(gender: string): string | null {
    if (!gender) return 'Выберите пол';
    return null;
  }

  private validateForm(): boolean {
    this.errors = {};

    // Валидация имени
    const nameError = this.validateName(this.formData.name || '');
    if (nameError) this.errors.name = nameError;

    // Валидация логина
    const loginError = this.validateLogin(this.formData.login || '');
    if (loginError) this.errors.login = loginError;

    // Валидация даты
    const dateError = this.validateDate(this.formData.date || '');
    if (dateError) this.errors.date = dateError;

    // Валидация пола
    const genderError = this.validateGender(this.formData.gender || '');
    if (genderError) this.errors.gender = genderError;

    // Валидация пароля
    const passwordError = this.validatePassword(this.formData.password || '');
    if (passwordError) this.errors.password = passwordError;

    // Валидация подтверждения пароля
    const passwordConfirmError = this.validatePasswordConfirm(
      this.formData.password || '', 
      this.formData.password_confirm || ''
    );
    if (passwordConfirmError) this.errors.password_confirm = passwordConfirmError;

    return Object.keys(this.errors).length === 0;
  }

  private handleInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const name = target.className.replace('register-form__', '').replace('-input', '');
    
    if (name.includes('name')) this.formData.name = target.value;
    else if (name.includes('login')) this.formData.login = target.value;
    else if (name.includes('date')) this.formData.date = target.value;
    else if (name.includes('password')) {
      if (name.includes('repeat')) {
        this.formData.password_confirm = target.value;
      } else {
        this.formData.password = target.value;
      }
    }

    // Очищаем ошибку при вводе
    if (this.errors[name as keyof ValidationErrors]) {
      delete this.errors[name as keyof ValidationErrors];
      this.updateErrorDisplay();
    }
  }

  private handleGenderChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.formData.gender = target.value;
    
    if (this.errors.gender) {
      delete this.errors.gender;
      this.updateErrorDisplay();
    }
  }

  private handleSubmit(event: Event) {
    event.preventDefault();
    
    if (this.validateForm()) {
      console.log('Форма валидна, данные:', this.formData);
      // Здесь можно отправить данные на сервер
      alert('Регистрация успешна!');
    } else {
      this.updateErrorDisplay();
    }
  }

  private updateErrorDisplay() {
    // Удаляем старые сообщения об ошибках
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    
    // Убираем классы ошибок с инпутов
    document.querySelectorAll('.input-error').forEach(el => {
      el.classList.remove('input-error');
    });

    // Добавляем новые сообщения об ошибках
    Object.entries(this.errors).forEach(([field, message]) => {
      let input: HTMLInputElement | null = null;
      
      switch (field) {
        case 'name':
          input = document.querySelector('.register-form__name-input');
          break;
        case 'login':
          input = document.querySelector('.register-form__login-input');
          break;
        case 'date':
          input = document.querySelector('.register-form__date-input');
          break;
        case 'password':
          input = document.querySelector('.register-form__password-input');
          break;
        case 'password_confirm':
          input = document.querySelector('.register-form__password-repeat-input');
          break;
      }

      if (input) {
        input.classList.add('input-error');
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        errorElement.style.color = 'red';
        errorElement.style.fontSize = '12px';
        errorElement.style.marginTop = '5px';
        input.parentNode?.insertBefore(errorElement, input.nextSibling);
      }
    });

    // Обработка ошибки для пола
    if (this.errors.gender) {
      const genderContainer = document.querySelector('.register-form__gender-picker-container');
      if (genderContainer) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = this.errors.gender;
        errorElement.style.color = 'red';
        errorElement.style.fontSize = '12px';
        errorElement.style.marginTop = '5px';
        errorElement.style.width = '100%';
        errorElement.style.textAlign = 'center';
        genderContainer.parentNode?.insertBefore(errorElement, genderContainer.nextSibling);
      }
    }
  }

  private bindEvents() {
    setTimeout(() => {
      const form = document.querySelector('.register-form');
      const inputs = document.querySelectorAll('input');
      const genderInputs = document.querySelectorAll('input[name="gender"]');

      if (form) {
        form.addEventListener('submit', (e) => this.handleSubmit(e));
      }

      inputs.forEach(input => {
        if (input.type !== 'radio') {
          input.addEventListener('input', (e) => this.handleInputChange(e));
          input.addEventListener('blur', (e) => {
            // Валидация при потере фокуса
            const target = e.target as HTMLInputElement;
            const name = target.className.replace('register-form__', '').replace('-input', '');
            
            let error: string | null = null;
            switch (name) {
              case 'name':
                error = this.validateName(target.value);
                break;
              case 'login':
                error = this.validateLogin(target.value);
                break;
              case 'date':
                error = this.validateDate(target.value);
                break;
              case 'password':
                error = this.validatePassword(target.value);
                break;
              case 'passwordrepeat':
                error = this.validatePasswordConfirm(this.formData.password || '', target.value);
                break;
            }

            if (error) {
              this.errors[name as keyof ValidationErrors] = error;
              this.updateErrorDisplay();
            }
          });
        }
      });

      genderInputs.forEach(input => {
        input.addEventListener('change', (e) => this.handleGenderChange(e));
      });
    }, 0);
  }

  render() {
    this.bindEvents();
    return template();
  }
}