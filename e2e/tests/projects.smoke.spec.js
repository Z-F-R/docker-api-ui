const { test, expect } = require('./fixtures');
const { uid, deleteProjectByName } = require('./helpers');

test.describe('@smoke Projects', () => {
  let projectName;

  test.afterEach(async ({ request }) => {
    if (projectName) await deleteProjectByName(request, projectName);
  });

  test('admin creates a project through the dialog and finds it in the list', async ({ page }) => {
    projectName = `UI Smoke ${uid()}`;

    await page.goto('/projects');
    await page.getByRole('button', { name: 'Create Project' }).click();

    const dialog = page.getByRole('dialog', { name: 'Create New Project' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Project Name').fill(projectName);
    await dialog.getByLabel('Description').fill('Project created by the Playwright smoke suite');
    await dialog.getByLabel('Wage').fill('2000');
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();

    // exact: the toast text is also mirrored into an aria-live region for screen readers
    await expect(page.getByText('Project created successfully', { exact: true })).toBeVisible();
    await expect(dialog).toBeHidden();

    await page.getByPlaceholder('Search projects by name...').fill(projectName);
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
  });
});
