import { expect, test } from '@playwright/test';
import { features } from './fragmentreference.spec.js';
import Fragments from './fragmentreference.page.js';

let fragment;
test.describe('verify fragment references are working in CC pages', () => {
  test.beforeEach(async ({ page }) => {
    fragment = new Fragments(page);
  });
  // Check fragments are referenced and shows in CC pages
  test(`${features[0].name},${features[0].tags}`, async ({ page, baseURL }) => {
    console.info(`[Test Page]: ${baseURL}${features[0].path}`);
    await test.step('fragment reference display in cc home page', async () => {
      await page.goto(`${baseURL}${features[0].path}`);
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(`${baseURL}${features[0].path}`);
    });
    await test.step('fragment shows up in page from its reference', async () => {
      await expect(fragment.pageFragment).toBeVisible();
      await expect(fragment.fragmentHeading).toBeVisible();
      await expect(fragment.fragmentSection).toBeVisible();
      await expect(fragment.fragmentProduct1).toBeVisible();
      await expect(fragment.fragmentProduct2).toBeVisible();
    });
  });
});
