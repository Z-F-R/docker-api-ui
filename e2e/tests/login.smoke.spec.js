const { test, expect } = require('./fixtures');
const { ADMIN } = require('./helpers');

// These tests start without a session
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('@smoke Login', () => {
  test('login page renders the sign-in form', async ({ loginPage }) => {
    await loginPage.goto();

    await expect(loginPage.title).toBeVisible();
    await expect(loginPage.email).toBeVisible();
    await expect(loginPage.password).toBeVisible();
    await expect(loginPage.submit).toBeEnabled();
  });

  test('anonymous user is redirected from a protected page to login', async ({ page }) => {
    await page.goto('/projects');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('wrong password keeps the user on login without a session', async ({ page, loginPage }) => {
    await loginPage.goto();
    const response = page.waitForResponse((r) => r.url().endsWith('/login') && r.request().method() === 'POST');
    await loginPage.login(ADMIN.email, 'wrong-password');

    // Known app issue: 400 instead of the conventional 401, https://github.com/Z-F-R/docker-api-ui/issues/1
    expect((await response).status()).toBe(400);
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });

  test('wrong password shows an error message', async ({ page, loginPage }) => {
    // Known app issue: <Toaster /> is mounted only inside Layout (authenticated pages),
    // so toasts raised on /login and /register are never rendered - the user gets no feedback.
    // https://github.com/Z-F-R/docker-api-ui/issues/3
    // Remove test.fail() once the bug is fixed; Playwright reports it if this starts passing.
    test.fail();

    await loginPage.goto();
    await loginPage.login(ADMIN.email, 'wrong-password');

    // The app's own message in Russian: "Invalid credentials"
    await expect(page.getByText('Неверные учетные данные', { exact: true })).toBeVisible({ timeout: 3_000 });
  });

  test('admin logs in and lands on the employees list', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login();

    await expect(page).toHaveURL(/\/employees$/);
    await expect(page.getByRole('heading', { name: 'Employees', level: 1 })).toBeVisible();
  });
});
