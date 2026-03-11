import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Navigate to the homepage before each test
  await page.goto('/');
});

test('homepage loads successfully', async ({ page }) => {
  // Check that the page title is correct
  await expect(page).toHaveTitle(/SuperInstance\.AI/);

  // Check that the page contains expected content
  await expect(page.getByRole('heading', { name: /SuperInstance/i })).toBeVisible();

  // Check for key sections
  await expect(page.getByText(/universal cell type system/i)).toBeVisible();
  await expect(page.getByText(/rate-based change mechanics/i)).toBeVisible();
});

test('navigation menu works correctly', async ({ page }) => {
  // Check that navigation links are present
  const navLinks = [
    'Home',
    'Features',
    'Documentation',
    'Demos',
    'Blog',
    'Community',
  ];

  for (const linkText of navLinks) {
    const link = page.getByRole('link', { name: new RegExp(linkText, 'i') });
    await expect(link).toBeVisible();
  }

  // Test clicking on Features link
  await page.getByRole('link', { name: /features/i }).click();
  await expect(page).toHaveURL(/.*features/);
  await expect(page.getByRole('heading', { name: /features/i })).toBeVisible();
});

test('footer contains important links', async ({ page }) => {
  // Scroll to footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  // Check footer links
  const footerLinks = [
    'GitHub',
    'Twitter',
    'Discord',
    'Privacy Policy',
    'Terms of Service',
    'Contact',
  ];

  for (const linkText of footerLinks) {
    const link = page.getByRole('link', { name: new RegExp(linkText, 'i') });
    await expect(link).toBeVisible();
  }
});

test('responsive design works on mobile', async ({ page }) => {
  // Set viewport to mobile size
  await page.setViewportSize({ width: 375, height: 667 });

  // Check that mobile navigation is accessible
  const menuButton = page.getByRole('button', { name: /menu/i });
  await expect(menuButton).toBeVisible();

  // Open mobile menu
  await menuButton.click();

  // Check that menu items are visible
  await expect(page.getByRole('link', { name: /features/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /documentation/i })).toBeVisible();
});

test('dark mode toggle works', async ({ page }) => {
  // Check for dark mode toggle button
  const themeToggle = page.getByRole('button', { name: /toggle theme/i });

  if (await themeToggle.isVisible()) {
    // Get initial theme
    const initialTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme') ||
      document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );

    // Toggle theme
    await themeToggle.click();

    // Check that theme changed
    const newTheme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme') ||
      document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );

    expect(newTheme).not.toBe(initialTheme);
  }
});

test('search functionality works', async ({ page }) => {
  // Look for search input
  const searchInput = page.getByRole('searchbox') || page.getByPlaceholder(/search/i);

  if (await searchInput.isVisible()) {
    // Type search query
    await searchInput.fill('SuperInstance');
    await searchInput.press('Enter');

    // Check search results or page change
    await expect(page).toHaveURL(/.*search.*/);
    await expect(page.getByText(/results for.*SuperInstance/i)).toBeVisible();
  }
});

test('external links open in new tab', async ({ page }) => {
  // Check GitHub link (common external link)
  const githubLink = page.getByRole('link', { name: /github/i });

  if (await githubLink.isVisible()) {
    await expect(githubLink).toHaveAttribute('target', '_blank');
    await expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  }
});

test('page has proper meta tags for SEO', async ({ page }) => {
  // Check important meta tags
  const metaTags = [
    { name: 'description', content: /SuperInstance/i },
    { name: 'keywords', content: /AI|spreadsheet|distributed/i },
    { property: 'og:title', content: /SuperInstance/i },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: /superinstance\.ai/i },
  ];

  for (const meta of metaTags) {
    const selector = meta.name
      ? `meta[name="${meta.name}"]`
      : `meta[property="${meta.property}"]`;

    const metaElement = page.locator(selector);
    await expect(metaElement).toHaveAttribute('content', meta.content);
  }
});

test('accessibility - keyboard navigation works', async ({ page }) => {
  // Test tab navigation
  await page.keyboard.press('Tab');

  // Check that focus is on first focusable element
  const focusedElement = page.locator('*:focus');
  await expect(focusedElement).toBeVisible();

  // Test skipping to main content
  const skipLink = page.getByRole('link', { name: /skip to main content/i });
  if (await skipLink.isVisible()) {
    await skipLink.focus();
    await page.keyboard.press('Enter');

    // Should focus main content
    const mainContent = page.getByRole('main');
    await expect(mainContent).toBeFocused();
  }
});