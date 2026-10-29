const { ADMIN } = require('../helpers');

class LoginPage {
  constructor(page) {
    this.page = page;
    this.title = page.getByText('Sign in to Employee Management');
    this.email = page.getByLabel('Email', { exact: true });
    this.password = page.getByLabel('Password', { exact: true });
    this.submit = page.getByRole('button', { name: 'Sign in' });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email = ADMIN.email, password = ADMIN.password) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}

module.exports = { LoginPage };
