const { test, expect } = require('./fixtures');
const { createEmployee, deleteEmployee } = require('./helpers');

test.describe('@smoke Employees', () => {
  test('admin sees the "Add Employee" entry point', async ({ page }) => {
    await page.goto('/employees');
    await page.getByRole('button', { name: 'Add Employee' }).click();

    await expect(page).toHaveURL(/\/employees\/new$/);
  });

  test.describe('employee created via API', () => {
    let employee;

    test.beforeEach(async ({ request }) => {
      employee = await createEmployee(request);
    });

    test.afterEach(async ({ request }) => {
      if (employee) await deleteEmployee(request, employee.id);
    });

    test('is found by search and opens its details page', async ({ page }) => {
      await page.goto('/employees');
      await page.getByPlaceholder('Search by name...').fill(employee.firstName);

      const title = page.getByRole('heading', { name: employee.fullName });
      await expect(title).toBeVisible();
      await expect(page.getByText(employee.email)).toBeVisible();

      // The card: nearest block around the name that also holds the card's action buttons
      const card = title.locator('xpath=ancestor::div[.//button][1]');
      // Known app issue: the view button is icon-only and has no accessible name
      // (EmployeesPage.jsx), so getByRole cannot find it - it is located by its icon.
      // https://github.com/Z-F-R/docker-api-ui/issues/4
      const viewButton = card.locator('button:has(svg.lucide-eye)');
      await expect(viewButton).toHaveCount(1);
      await viewButton.click();

      await expect(page).toHaveURL(new RegExp(`/employees/${employee.id}$`));
      await expect(page.getByRole('heading', { name: employee.fullName })).toBeVisible();
    });
  });
});
