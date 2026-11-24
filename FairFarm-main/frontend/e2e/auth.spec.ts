import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'laptop-1024', width: 1024, height: 768 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-360', width: 360, height: 740 },
];

test.describe('FairFarm Premium Auth & Multi-Role Experience', () => {
  test('Login page renders all 3 role cards, password toggle, and links cleanly', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /Sign in to FairFarm/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Farmer:/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Client \/ Buyer:/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Warehouse Holder:/i })).toBeVisible();

    // Selecting Warehouse Holder updates radio state
    const warehouseCard = page.getByRole('radio', { name: /Warehouse Holder:/i });
    await warehouseCard.click();
    await expect(warehouseCard).toHaveAttribute('aria-checked', 'true');

    // Password visibility toggle
    const pwdInput = page.getByLabel('Password', { exact: true });
    await pwdInput.fill('Secret123');
    await expect(pwdInput).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: /Show password/i }).click();
    await expect(pwdInput).toHaveAttribute('type', 'text');

    // Inline validation on invalid email
    await page.getByLabel('Email address').fill('not-an-email');
    await page.getByRole('button', { name: /^Sign in$/i }).click();
    await expect(page.getByText(/Enter a valid email address\./i)).toBeVisible();
  });

  test('Registration page adapts fields for Farmer, Client/Buyer and Warehouse Holder', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByLabel(/Farm \/ Village Name/i)).toBeVisible();

    await page.getByRole('radio', { name: /Client \/ Buyer:/i }).click();
    await expect(page.getByLabel(/Business \/ Store Name/i)).toBeVisible();

    await page.getByRole('radio', { name: /Warehouse Holder:/i }).click();
    await expect(page.getByLabel(/Warehouse \/ Storage Name/i)).toBeVisible();
    await expect(page.getByLabel(/Warehouse Location/i)).toBeVisible();
  });

  test('Forgot password, verify-email, and reset-password routes render cleanly', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: /Reset your password/i })).toBeVisible();

    await page.goto('/verify-email');
    await expect(page.getByRole('heading', { name: /Verify your email/i })).toBeVisible();

    await page.goto('/reset-password');
    await expect(page.getByRole('heading', { name: /Choose a new password/i })).toBeVisible();
  });

  test('Protected routes block unauthenticated users and Warehouse demo profile routes to /warehouse/dashboard', async ({ page }) => {
    await page.goto('/warehouse/dashboard');
    await expect(page).toHaveURL(/\/login/);

    // Demo mode Explore as Warehouse Holder
    await page.getByRole('radio', { name: /Warehouse Holder:/i }).click();
    await page.getByRole('button', { name: /^Explore$/i }).click();
    await expect(page).toHaveURL(/\/warehouse\/dashboard/);
    await expect(page.getByText(/Warehouse Holder Portal/i)).toBeVisible();
    await expect(page.getByRole('definition').filter({ hasText: 'Sahyadri Cold Storage' })).toBeVisible();
  });

  for (const vp of VIEWPORTS) {
    test(`No horizontal overflow on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const route of ['/login', '/register']) {
        await page.goto(route);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(overflow, `Horizontal overflow on ${route} at ${vp.name}`).toBe(false);
      }
    });
  }
});

