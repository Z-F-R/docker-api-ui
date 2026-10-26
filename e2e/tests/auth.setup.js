// e2e/tests/auth.setup.js
const { test: setup, expect } = require('@playwright/test');
const { ADMIN } = require('./helpers');

setup('@smoke authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(ADMIN.email);
  await page.getByLabel('Password', { exact: true }).fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/employees$/);
  await page.context().storageState({ path: '.auth/admin.json' });
});
