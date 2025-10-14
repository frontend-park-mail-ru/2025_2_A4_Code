export class RegisterPage {
  async render() {
    const template = `
      <div class="register-page">
        <h2>Create Account</h2>
        <form class="register-form">
          <div class="form-group">
            <label for="name">Full Name</label>
            <input type="text" id="name" name="name" required>
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
          </div>
          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" name="confirmPassword" required>
          </div>
          <button type="submit" class="btn btn-primary">Create Account</button>
        </form>
        <p class="auth-link">
          Already have an account? <a href="#/login">Sign in</a>
        </p>
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = template;

    const form = element.querySelector('.register-form');
    form.addEventListener('submit', (e) => this.handleSubmit(e));

    return element;
  }

  handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    console.log('Registration attempt:', data);
    alert('Registration functionality to be implemented');
  }
}