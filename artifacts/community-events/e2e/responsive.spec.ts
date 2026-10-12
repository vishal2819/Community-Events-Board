import { expect, test } from "@playwright/test";
import { newVisitor, signUp, expectSignedIn } from "./helpers";

/**
 * Runs only under the mobile project. The brief requires layouts to hold at phone
 * widths with no horizontal overflow, overlapping controls or clipped dialogs.
 */
const WIDTHS = [320, 375, 390];

async function horizontalOverflow(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test.describe("Responsive layouts", () => {
  for (const width of WIDTHS) {
    test(`discovery has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await page.goto("/");
      await expect(page.locator("article").first()).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    });

    test(`event detail and card designer fit at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await page.goto("/");
      await expect(page.locator("article").first()).toBeVisible();
      await page.locator("article a").first().click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    });

    test(`signup fits at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await page.goto("/signup");
      await expect(page.getByTestId("input-email")).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    });
  }

  test("navigation collapses behind a menu on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 780 });
    await page.goto("/");

    // Desktop links are hidden at this width.
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();

    const toggle = page.getByRole("button", { name: /toggle navigation/i });
    await expect(toggle).toBeVisible();
    await toggle.click();

    const mobileNav = page.locator("#mobile-nav");
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "Discover" })).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });

  test("the card designer preview stays inside the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await signUp(page, newVisitor("mobile-card"));
    await expectSignedIn(page);

    await page.goto("/");
    await expect(page.locator("article").first()).toBeVisible();
    await page.locator("article a").first().click();

    const preview = page.getByTestId("card-preview");
    await expect(preview).toBeVisible();
    const box = await preview.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(320);
    expect(box!.x).toBeGreaterThanOrEqual(0);
  });
});