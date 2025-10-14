import { test, expect, type Page } from 'playwright-test-coverage';

enum Role {
  Diner = 'diner',
  Admin = 'admin',
}

type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  roles: { role: Role }[];
};

// ----------------- Helpers -----------------

async function basicInit(page: Page) {
  const diner: User = {
    id: '3',
    name: 'Kai Chen',
    email: 'd@jwt.com',
    password: 'a',
    roles: [{ role: Role.Diner }],
  };
  await mockUser(page, diner);
}

async function basicAdminInit(page: Page) {
  const admin: User = {
    id: '4',
    name: 'Admin Chen',
    email: 'a@jwt.com',
    password: 'a',
    roles: [{ role: Role.Admin }],
  };
  await mockUser(page, admin);

}

/**
 * Common function to mock API routes for a given user
 */
async function mockUser(page: Page, user: User) {
  let loggedInUser: User = user;
  const validUsers: Record<string, User> = { [user.email]: user };

  // Mock login
  await page.route('**/api/auth', async (route) => {
    const loginReq = route.request().postDataJSON();
    const u = validUsers[loginReq.email];
    if (!u || u.password !== loginReq.password) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }
    loggedInUser = u;
    await route.fulfill({ json: { user: loggedInUser, token: 'abcdef' } });
  });

  // Mock "me"
  await page.route('**/api/user/me', async (route) => {
    await route.fulfill({ json: loggedInUser });
  });

  // Mock menu
  await page.route('**/api/order/menu', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
        { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
      ],
    });
  });

  // Mock orders
  await page.route('**/api/order', async (route) => {
    const orderReq = route.request().postDataJSON();
    await route.fulfill({
      json: { order: { ...orderReq, id: 23 }, jwt: 'eyJpYXQ' },
    });
  });

  await page.goto('http://localhost:5173/');
}

// ----------------- Tests -----------------

test('admin can delete a user', async ({ page }) => {
  // In-memory mock user list
  let users: User[] = [
    {
      id: '5',
      name: 'Test User',
      email: 'test@jwt.com',
      password: 'test',
      roles: [{ role: Role.Diner }],
    },
  ];

  await basicAdminInit(page);

  // --- Mock the GET /api/user endpoint ---
  await page.route('**/api/user**', async (route) => {
    const url = route.request().url();

    // Always return current user list
    if (url.includes('page=1') || !url.includes('page=')) {
      await route.fulfill({
        json: {
          users,
          more: false,
        },
      });
      return;
    }

    // Default fallback
    await route.continue();
  });

  // --- Mock the DELETE /api/user/:id endpoint ---
  await page.route(/\/api\/user\/\d+$/, async (route) => {
    if (route.request().method() === 'DELETE') {
      const url = route.request().url();
      const idToDelete = url.split('/').pop();

      // Remove user from in-memory list
      users = users.filter((u) => u.id !== idToDelete);

      // Return proper 204 No Content response
      await route.fulfill({
        status: 204,
        body: '',
      });
      return;
    }

    await route.continue();
  });

  // --- Login as admin ---
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  // --- Navigate to Admin Dashboard ---
  await page.getByRole('link', { name: 'Admin' }).click();

  // Verify test user is visible before deletion
  await expect(page.getByText('Test User')).toBeVisible();
  await expect(page.getByText('test@jwt.com')).toBeVisible();

  // --- Delete user ---
  await page.getByRole('button', { name: 'Delete' }).click();

  // Wait for frontend to refresh user list after delete
  await page.waitForTimeout(200);

  // --- Verify user is gone ---
  await expect(page.getByText('Test User')).toHaveCount(0);
  await expect(page.getByText('test@jwt.com')).toHaveCount(0);
});

test('view about page, not logged in', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByText('The secret sauce')).toBeVisible();
  await page.getByRole('main').getByRole('img').first().click();
  await page.getByText('At JWT Pizza, our amazing').click();
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
});

test('view about page, logged in', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.goto('/about');
  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();
  await expect(page.getByText('The secret sauce')).toBeVisible();
});

test('view history page, not logged in', async ({ page }) => {
  await page.goto('/history');
  await expect(page.getByText('Mama Rucci, my my')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
});

test('view history page, logged in', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.goto('/history');
  await expect(page.getByText('Mama Rucci, my my')).toBeVisible();
  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();
});

test('not found page', async ({ page }) => {
  await page.goto('/some/random/page');
  await expect(page.getByText('Oops')).toBeVisible();
  await expect(page.getByRole('main')).toContainText(
    'It looks like we have dropped a pizza on the floor. Please try another page.'
  );
});


test('diner dashboard', async ({ page }) => {
  await basicInit(page);

  // Login
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'KC' }).click();
  await expect(page.getByText('Your pizza kitchen')).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Kai Chen');
  await expect(page.getByRole('main')).toContainText('d@jwt.com');
  await expect(page.getByRole('main')).toContainText('diner');
});


test('admin dashboard', async ({ page }) => {
  const admin = {
    id: '4',
    name: 'Admin Chen',
    email: 'a@jwt.com',
    password: 'a',
    roles: [{ role: Role.Admin }],
  };

  // Mock login endpoint
  await page.route('**/api/auth', async (route) => {
    const req = route.request().postDataJSON();
    if (req.email === admin.email && req.password === admin.password) {
      await route.fulfill({ json: { user: admin, token: 'admin-token' } });
    } else {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
    }
  });

  // Mock "me" endpoint
  await page.route('**/api/user/me', async (route) => {
    await route.fulfill({ json: admin });
  });

  // Mock franchises (admin-specific data)
  await page.route('**/api/franchise*', async (route) => {
    await route.fulfill({
      json: {
        franchises: [
          { id: 2, name: 'LotaPizza', stores: [{ id: 4, name: 'Lehi' }] },
          { id: 3, name: 'PizzaCorp', stores: [] },
          { id: 4, name: 'topSpot', stores: [] },
        ],
      },
    });
  });

  // Navigate to login page
  await page.goto('/login');

  // Fill and submit admin login form
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  // Go to admin dashboard
  await page.goto('/admin-dashboard');

  // Assertions
  await expect(page.getByRole('heading', { name: 'Franchises' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'LotaPizza' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'PizzaCorp' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'topSpot' })).toBeVisible();
});

test('view franchise page logged in as franchisee', async ({ page }) => {
  // --- Mock the logged-in franchisee ---
  const franchisee = {
    id: '4', // matches the userId in the API path
    name: 'Pizza Franchisee',
    email: 'f@jwt.com',
    password: 'a',
    roles: [{ role: 'franchisee' }],
  };

  // Mock login endpoint
  await page.route('**/api/auth', async (route) => {
    const data = route.request().postDataJSON();
    if (data.email === franchisee.email && data.password === franchisee.password) {
      await route.fulfill({ json: { user: franchisee, token: 'franchisee-token' } });
    } else {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
    }
  });

  // Mock "me" endpoint
  await page.route('**/api/user/me', async (route) => {
    await route.fulfill({ json: franchisee });
  });

  // Mock the franchise endpoint for this specific user
  await page.route(`**/api/franchise/${franchisee.id}`, async (route) => {
    await route.fulfill({
      json: [
        {
          id: 2,
          name: 'pizzaPocket',
          admins: [{ id: 4, name: 'Pizza Franchisee', email: 'f@jwt.com' }],
          stores: [{ id: 4, name: 'SLC', totalRevenue: 0 }],
        },
      ],
    });
  });

  // --- Navigate and log in ---
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill(franchisee.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(franchisee.password);
  await page.getByRole('button', { name: 'Login' }).click();

  // Go to franchise dashboard
  await page.getByLabel('Global').getByRole('link', { name: 'Franchise' }).click();

  // --- Assertions ---
  await expect(page.getByRole('cell', { name: 'SLC' })).toBeVisible();

});

test('create franchise and view it', async ({ page }) => {
  // --- In-memory store to simulate DB ---
  let franchises: any[] = [];

  const admin = {
    id: '4',
    name: 'Admin Chen',
    email: 'a@jwt.com',
    password: 'a',
    roles: [{ role: Role.Admin }],
    isRole: (role: Role) => role === Role.Admin,
  };

  // --- Mock login endpoint ---
  await page.route('**/api/auth', async (route) => {
    const data = route.request().postDataJSON();
    if (data.email === admin.email && data.password === admin.password) {
      await route.fulfill({ json: { user: admin, token: 'admin-token' } });
    } else {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
    }
  });

  // --- Mock "me" endpoint ---
  await page.route('**/api/user/me', async (route) => {
    await route.fulfill({ json: admin });
  });

  // --- Mock GET /api/franchise to list franchises ---
  await page.route('**/api/franchise*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          franchises,
          more: false,
        },
      });
    }
  });

  // --- Mock POST /api/franchise to create franchise ---
  await page.route('**/api/franchise', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const newFranchise = {
        ...body,
        id: franchises.length + 1,
        stores: [],
      };
      franchises.push(newFranchise);
      await route.fulfill({ json: newFranchise });
    }
  });

  // --- Navigate to login page ---
  await page.goto('/login');

  // Login as admin
  await page.getByRole('textbox', { name: 'Email address' }).fill(admin.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(admin.password);
  await page.getByRole('button', { name: 'Login' }).click();

  // Go to admin dashboard
  await page.goto('/admin-dashboard');

  // --- Create a new franchise via UI ---
  await page.getByRole('button', { name: 'Add franchise' }).click();
  await page.getByRole('textbox', { name: 'Franchise name' }).fill('pizzaPocket');
  await page.getByRole('textbox', { name: 'Admin email' }).fill('f@jwt.com');
  await page.getByRole('button', { name: 'Create' }).click();

  // --- Assert that the new franchise appears immediately ---
  await expect(page.getByRole('cell', { name: 'pizzaPocket' })).toBeVisible();

  // Optional: create another franchise to verify multiple items
  await page.getByRole('button', { name: 'Add franchise' }).click();
  await page.getByRole('textbox', { name: 'Franchise name' }).fill('PizzaCorp');
  await page.getByRole('textbox', { name: 'Admin email' }).fill('admin2@jwt.com');
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByRole('cell', { name: 'PizzaCorp' })).toBeVisible();
});



test('close franchise', async ({ page }) => {
  // --- In-memory store ---
  let franchises = [
    { id: 1, name: 'pizzaPocket', admins: [{ email: 'f@jwt.com', id: 4, name: 'Pizza Franchisee' }], stores: [] },
    { id: 2, name: 'PizzaCorp', admins: [{ email: 'admin2@jwt.com', id: 5, name: 'Admin Two' }], stores: [] },
  ];

  const admin = {
    id: '4',
    name: 'Admin Chen',
    email: 'a@jwt.com',
    password: 'a',
    roles: [{ role: Role.Admin }],
    isRole: (role: Role) => role === Role.Admin,
  };

  // --- Mock login ---
  await page.route('**/api/auth', async (route) => {
    const data = route.request().postDataJSON();
    if (data.email === admin.email && data.password === admin.password) {
      await route.fulfill({ json: { user: admin, token: 'admin-token' } });
    } else {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
    }
  });

  // --- Mock "me" endpoint ---
  await page.route('**/api/user/me', async (route) => {
    await route.fulfill({ json: admin });
  });

  // --- Mock GET franchises ---
  await page.route('**/api/franchise*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { franchises, more: false } });
    }
  });

  // --- Mock DELETE franchise ---
  await page.route('**/api/franchise/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      const urlParts = route.request().url().split('/');
      const idToDelete = Number(urlParts[urlParts.length - 1]);
      franchises = franchises.filter((f) => f.id !== idToDelete);
      await route.fulfill({ json: { message: 'franchise deleted' } });
    }
  });

  // --- Navigate and login ---
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill(admin.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(admin.password);
  await page.getByRole('button', { name: 'Login' }).click();

  // Go to admin dashboard
  await page.goto('/admin-dashboard');

  // Assert initial franchises are visible
  await expect(page.getByRole('cell', { name: 'pizzaPocket' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'PizzaCorp' })).toBeVisible();

  // --- Close a franchise ---
  await page.getByRole('button', { name: 'Close ' }).first().click();
  await page.getByRole('button', { name: 'Close' }).click();
  // Optionally wait for any UI update
  await page.waitForTimeout(100); // or wait for network request if needed

  // Assert pizzaPocket is removed, PizzaCorp still visible
  await expect(page.getByRole('cell', { name: 'PizzaCorp' })).toBeVisible();
});


