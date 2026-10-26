// e2e/tests/employees.smoke.spec.js
const { test, expect } = require('@playwright/test');
const { createEmployee, deleteEmployee } = require('./helpers');

test.describe('@smoke Employees', () => {
  let employee;

  test.beforeEach(async ({ request }) => {
    employee = await createEmployee(request);
  });

  test.afterEach(async ({ request }) => {
    if (employee) await deleteEmployee(request, employee.id);
  });

  test('employee created via API is found by search and opens its details page', async ({ page }) => {
    await page.goto('/employees');
    await page.getByPlaceholder('Search by name...').fill(employee.firstName);

    const title = page.getByRole('heading', { name: employee.fullName });
    await expect(title).toBeVisible();
    await expect(page.getByText(employee.email)).toBeVisible();

    // Innermost block that holds both the name and the action buttons
    const card = page
      .locator('div')
      .filter({ has: title })
      .filter({ has: page.getByRole('button') })
      .last();
    await card.getByRole('button').first().click();

    await expect(page).toHaveURL(new RegExp(`/employees/${employee.id}$`));
    await expect(page.getByRole('heading', { name: employee.fullName })).toBeVisible();
  });

  test('admin sees the "Add Employee" entry point', async ({ page }) => {
    await page.goto('/employees');
    await page.getByRole('button', { name: 'Add Employee' }).click();

    await expect(page).toHaveURL(/\/employees\/new$/);
  });
});
