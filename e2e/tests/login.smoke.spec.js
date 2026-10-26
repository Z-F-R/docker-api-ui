// e2e/tests/login.smoke.spec.js
const { test, expect } = require('@playwright/test');
const { ADMIN } = require('./helpers');

// These tests start without a session
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('@smoke Login', () => {
  test('login page renders the sign-in form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('Sign in to Employee Management')).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  test('anonymous user is redirected from a protected page to login', async ({ page }) => {
    await page.goto('/projects');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('wrong password keeps the user on login without a session', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(ADMIN.email);
    await page.getByLabel('Password', { exact: true }).fill('wrong-password');
    const response = page.waitForResponse((r) => r.url().endsWith('/login') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Sign in' }).click();

    expect((await response).status()).toBe(400);
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });

  test('wrong password shows an error message', async ({ page }) => {
    // Known bug: <Toaster /> is mounted only inside Layout (authenticated pages),
    // so toasts raised on /login and /register are never rendered - the user gets no feedback.
    // Remove test.fail() once the bug is fixed; Playwright reports it if this starts passing.
    test.fail();

    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(ADMIN.email);
    await page.getByLabel('Password', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Неверные учетные данные', { exact: true })).toBeVisible({ timeout: 3_000 });
  });

  test('admin logs in and lands on the employees list', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(ADMIN.email);
    await page.getByLabel('Password', { exact: true }).fill(ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/employees$/);
    await expect(page.getByRole('heading', { name: 'Employees', level: 1 })).toBeVisible();
  });
});
