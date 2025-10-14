import { test, expect } from 'playwright-test-coverage';

enum Role {
  Diner = 'diner',
  Admin = 'admin',
}

// Mock admin user
const admin = {
  id: '1',
  name: 'Admin User',
  email: 'admin@jwt.com',
  password: 'admin123',
  roles: [{ role: Role.Admin }]
};

test('admin can delete users from dashboard', async ({ page }) => {
  // Setup mock users
  let users = [
    { id: '0', name: 'Test User 1', email: 'user1@jwt.com', roles: [{ role: Role.Diner }] },
    { id: '1', name: 'Test User 2', email: 'user2@jwt.com', roles: [{ role: Role.Diner }] }
  ];

  // Mock authentication
  await page.route('**/api/auth', async (route) => {
    const data = route.request().postDataJSON();
    if (data.email === admin.email && data.password === admin.password) {
      await route.fulfill({ json: { user: admin, token: 'mock-token' } });
    } else {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
    }
  });

  // Mock me endpoint
  await page.route('**/api/user/me', async (route) => {
    await route.fulfill({ json: admin });
  });

  // Mock users endpoint
  await page.route('**/api/user?**', async (route) => {
    if (route.request().method() === 'GET' && !route.request().url().includes('/me')) {
      const url = new URL(route.request().url());
      const pageNum = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '10');
      
      console.error('Mock GET /api/user called with:', {
        page: pageNum,
        limit,
        url: route.request().url()
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: {
          users,
          page: pageNum,
          hasMore: false
        }
      });
    }
});

    // Mock delete user endpoint
    await page.route('http://localhost:3000/api/user/0', async (route) => {
        if (route.request().method() === 'DELETE') {
        const urlParts = route.request().url().split('/');
        const idToDelete = urlParts[urlParts.length - 1];

        console.log('Attempting to delete user with ID:', idToDelete);
        
        // Verify we have a valid ID
        if (!idToDelete) {
            await route.fulfill({ 
                status: 400, 
                json: { message: 'Missing user ID' } 
            });
            return;
        }

        // Update users array
        const previousLength = users.length;
        users = users.filter(user => user.id !== idToDelete);

        console.error('Mock DELETE /api/user called with ID:', idToDelete);
        console.error('Users after deletion attempt:', users);

        // If no user was removed, return 404
        if (users.length === previousLength) {
            await route.fulfill({ 
                status: 404, 
                json: { message: 'User not found' } 
            });
            return;
        }

        // Return 204 for successful deletion (no content)
        await route.fulfill({ status: 204 });
    }
    });


  // Add franchise mock
  await page.route('**/api/franchise**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: {
          franchises: [],
          more: false
        }
      });
    }
  });


  // Login as admin
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill(admin.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(admin.password);
  await page.getByRole('button', { name: 'Login' }).click();

  // Go to admin dashboard
  await page.goto('/admin-dashboard');

  // Verify initial users are visible
  await expect(page.getByRole('cell', { name: 'Test User 1' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Test User 2' })).toBeVisible();

  // Delete first user
  await page.getByRole('row', { name: 'Test User 1 user1@jwt.com' }).getByRole('button').click();

  // Verify deletion
  await expect(page.getByRole('cell', { name: 'Test User 1' })).not.toBeVisible();
  await expect(page.getByRole('cell', { name: 'Test User 2' })).toBeVisible();
});

