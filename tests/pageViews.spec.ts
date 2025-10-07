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
