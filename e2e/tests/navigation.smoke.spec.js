const { test, expect } = require('./fixtures');

test.describe('@smoke Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/employees$/);
  });

  for (const [label, path] of [
    ['Projects', '/projects'],
    ['Notifications', '/notifications'],
    ['My Profile', '/profile'],
    ['Employees', '/employees'],
  ]) {
    test(`header link "${label}" opens ${path}`, async ({ page }) => {
      await page.getByRole('navigation').getByRole('link', { name: label }).click();

      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { name: label, level: 1 })).toBeVisible();
    });
  }

  test('unknown route shows the 404 page', async ({ page }) => {
    await page.goto('/no-such-page');

    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });

  test('logout returns to the login page', async ({ page }) => {
    await page.getByRole('button', { name: 'Logout' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/employees');
    await expect(page).toHaveURL(/\/login$/);
  });
});
