import { test, expect } from 'playwright-test-coverage';

test('updateUser', async ({ page }) => {
  // Mock user data
  const mockUser = {
    id: '123',
    name: 'pizza diner',
    email: 'test@jwt.com',
    roles: [{ role: 'diner' }]
  };

  // Mock register endpoint
  await page.route('**/api/user', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ 
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ 
          user: mockUser,
          token: 'test-token'
        })
      });
    }
  });

  // Mock auth endpoint for login
  await page.route('**/api/auth', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: mockUser,
        token: 'test-token'
      })
    });
  });

  // Mock user "me" endpoint
  await page.route('**/api/user/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser)
    });
  });

  // Mock update user endpoint
  await page.route(`**/api/user/${mockUser.id}`, async (route) => {
    if (route.request().method() === 'PUT') {
      const updatedData = await route.request().postDataJSON();
      mockUser.name = updatedData.name; // Update mock user data
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUser)
      });
    }
  });

  // Start test flow
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
  await page.getByRole('textbox', { name: 'Email address' }).fill('test@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Register' }).click();

  // Click initials link (pd = pizza diner)
  await page.getByRole('link', { name: 'pd' }).click();

  // Verify initial name
  await expect(page.getByRole('main')).toContainText('pizza diner');

  // Edit user name
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('h3')).toContainText('Edit user');
  await page.getByRole('textbox').first().fill('pizza dinerx');
  await page.getByRole('button', { name: 'Update' }).click();

  // Wait for modal to close
  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  // Verify updated name
  await expect(page.getByRole('main')).toContainText('pizza dinerx');

  // Verify persistence through logout/login
  await page.getByRole('link', { name: 'Logout' }).click();
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('test@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();

  // Check profile again
  await page.getByRole('link', { name: 'pd' }).click();

  // Verify name is still updated
  await expect(page.getByRole('main')).toContainText('pizza dinerx');
});