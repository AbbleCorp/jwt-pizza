import { test, expect, type Page } from 'playwright-test-coverage';

enum Role {
  Diner = 'Diner',
  Admin = 'Admin',
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

async function mockUser(page: Page, user: User) {
  let loggedInUser: User = user;
  const validUsers: Record<string, User> = { [user.email]: user };

  // Mock login
  await page.route('**/api/auth', async (route) => {
    const loginReq = route.request().postDataJSON();
    if (route.request().method() === 'DELETE') {
      // Logout route
      loggedInUser = undefined;
      await route.fulfill({ status: 200, json: { message: 'logout successful' } });
      return;
    }

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

  // Mock franchises
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    await route.fulfill({
      json: {
        franchises: [
          {
            id: 2,
            name: 'LotaPizza',
            stores: [
              { id: 4, name: 'Lehi' },
              { id: 5, name: 'Springville' },
              { id: 6, name: 'American Fork' },
            ],
          },
          { id: 3, name: 'PizzaCorp', stores: [{ id: 7, name: 'Spanish Fork' }] },
          { id: 4, name: 'topSpot', stores: [] },
        ],
      },
    });
  });

  // Mock order
  await page.route('**/api/order', async (route) => {
    const orderReq = route.request().postDataJSON();
    await route.fulfill({
      json: { order: { ...orderReq, id: 23 }, jwt: 'eyJpYXQ' },
    });
  });

  await page.goto('http://localhost:5173/');
}

// ----------------- Tests -----------------

test('login', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
});


test('purchase with login', async ({ page }) => {
  await basicInit(page);

  // Go to order page
  await page.getByRole('button', { name: 'Order now' }).click();

  // Create order
  await expect(page.locator('h2')).toContainText('Awesome is a click away');

  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();

  await expect(page.locator('form')).toContainText('Selected pizzas: 2');

  await page.getByRole('button', { name: 'Checkout' }).click();

  // Login
  await page.getByPlaceholder('Email address').click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Email address').press('Tab');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  // Pay
  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tbody')).toContainText('Pepperoni');
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');

  await page.getByRole('button', { name: 'Pay now' }).click();

  // Check balance
  await expect(page.getByText('0.008')).toBeVisible();
});

test('login with purchase', async ({ page }) => {
  await basicInit(page);

  // Login first
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();

  // Go to order page
  await page.getByRole('button', { name: 'Order now' }).click();

  // Create order
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();

  await expect(page.locator('form')).toContainText('Selected pizzas: 2');

  await page.getByRole('button', { name: 'Checkout' }).click();

  // Pay
  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tbody')).toContainText('Pepperoni');
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');

  await page.getByRole('button', { name: 'Pay now' }).click();

  // Check balance
  await expect(page.getByText('0.008')).toBeVisible();

  //verify
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByRole('heading', { name: 'JWT Pizza' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
});

test('logout', async ({ page }) => {
  await basicInit(page);

  // Visit logout page
  await page.goto('/logout');

  // Verify user is logged out
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
});


test('register new user', async ({ page }) => {
  // Set up registration mock
  await page.route('**/api/auth', async (route) => {
    const req = route.request();
    const data = req.postDataJSON();
    if (req.method() === 'POST' && data.name && data.email && data.password) {
      await route.fulfill({
        status: 201,
        json: {
          user: { id: '99', name: data.name, email: data.email, roles: [{ role: 'Diner' }] },
          token: 'mocked-token',
        },
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/register');

  // Fill registration form
  await page.getByRole('textbox', { name: 'Name' }).fill('New User');
  await page.getByRole('textbox', { name: 'Email address' }).fill('new@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Register' }).click();

  // Verify redirect / logged in UI
  await expect(page.getByRole('link', { name: 'NU' })).toBeVisible();
  
});

