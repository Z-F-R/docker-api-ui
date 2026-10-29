const { test: setup, expect } = require('./fixtures');

setup('@smoke authenticate as admin', async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.login();

  await expect(page).toHaveURL(/\/employees$/);
  await page.context().storageState({ path: '.auth/admin.json' });
});
