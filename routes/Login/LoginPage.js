export class LoginPage {
  async render() {
    const template = `
      <div class="login-page">
        <h2>Sign In to A4 Mail</h2>
        <form class="login-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
          </div>
          <button type="submit" class="btn btn-primary">Sign In</button>
        </form>
        <p class="auth-link">
          Don't have an account? <a href="#/register">Sign up</a>
        </p>
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = template;

    // Добавляем обработчик формы
    const form = element.querySelector('.login-form');
    form.addEventListener('submit', (e) => this.handleSubmit(e));

    return element;
  }

  handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const email = formData.get('email');
    const password = formData.get('password');

    // Здесь будет логика авторизации
    console.log('Login attempt:', { email, password });
    alert('Login functionality to be implemented');
  }
}