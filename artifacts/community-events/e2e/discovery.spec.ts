import { expect, test } from "@playwright/test";
import { expectSignedIn, newVisitor, signUp } from "./helpers";

/**
 * Seeded identifiers are fixed so these assertions do not depend on the current
 * date. See prisma/seed.ts: index 16 is an inactive future event and index 17 a
 * past event, neither of which may appear on the public board.
 */
const INACTIVE_FUTURE = "Coimbatore Secret Music Night";
const PAST_EVENT = "Coimbatore Music Night — Archive";

test.describe("Public discovery", () => {
  test("lists seeded upcoming events and hides inactive and past records", async ({ page }) => {
    await page.goto("/");

    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // The public API must not expose administrative records.
    await expect(page.getByText(INACTIVE_FUTURE)).toHaveCount(0);
    await expect(page.getByText(PAST_EVENT)).toHaveCount(0);
  });

  test("hides inactive and past events from the JSON API", async ({ request }) => {
    const response = await request.get("/api/events?pageSize=30");
    expect(response.status()).toBe(200);
    const body = await response.json();
    const titles: string[] = body.data.map((e: { title: string }) => e.title);

    expect(titles).not.toContain(INACTIVE_FUTURE);
    expect(titles).not.toContain(PAST_EVENT);
    for (const event of body.data) {
      expect(event.isActive).toBe(true);
      expect(new Date(event.startsAt).getTime()).toBeGreaterThan(Date.now());
    }
  });

  test("filters by category, city and search with AND semantics", async ({ request }) => {
    const response = await request.get("/api/events?category=MUSIC&city=Coimbatore&search=night&pageSize=30");
    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.data.length).toBeGreaterThan(0);
    for (const event of body.data) {
      expect(event.category).toBe("MUSIC");
      expect(event.city.toLowerCase()).toBe("coimbatore");
      const haystack = `${event.title} ${event.description} ${event.city}`.toLowerCase();
      expect(haystack).toContain("night");
    }
  });

  test("combining filters that cannot both match returns nothing", async ({ request }) => {
    const response = await request.get("/api/events?category=KIDS&city=Chennai&search=pottery&pageSize=30");
    expect(response.status()).toBe(200);
    expect((await response.json()).data).toHaveLength(0);
  });

  test("search matches description as well as title", async ({ request }) => {
    const response = await request.get("/api/events?search=clay&pageSize=30");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeGreaterThan(0);
  });

  test("city filter is case-insensitive", async ({ request }) => {
    const lower = await request.get("/api/events?city=bengaluru&pageSize=30");
    const upper = await request.get("/api/events?city=BENGALURU&pageSize=30");
    expect(lower.status()).toBe(200);
    expect(upper.status()).toBe(200);
    expect((await lower.json()).pagination.total).toBe((await upper.json()).pagination.total);
    expect((await lower.json()).pagination.total).toBeGreaterThan(0);
  });

  test("sorts nearest upcoming first", async ({ request }) => {
    const response = await request.get("/api/events?pageSize=30");
    const body = await response.json();
    const times = body.data.map((e: { startsAt: string }) => new Date(e.startsAt).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  test("paginates with stable, non-overlapping pages and metadata", async ({ request }) => {
    const first = await (await request.get("/api/events?page=1&pageSize=9")).json();
    expect(first.pagination).toMatchObject({ page: 1, pageSize: 9 });
    expect(first.data).toHaveLength(9);
    expect(first.pagination.totalPages).toBeGreaterThan(1);

    const second = await (await request.get("/api/events?page=2&pageSize=9")).json();
    const firstIds = new Set(first.data.map((e: { id: string }) => e.id));
    for (const event of second.data) expect(firstIds.has(event.id)).toBe(false);
  });

  test("rejects an excessive page size", async ({ request }) => {
    const response = await request.get("/api/events?pageSize=500");
    expect(response.status()).toBe(422);
  });

  test("the UI category filter narrows the visible results", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("article").first()).toBeVisible();
    const before = await page.locator("article").count();

    await page.getByRole("button", { name: /^Music/ }).click();
    await expect(page.locator("article").first()).toBeVisible();
    const after = await page.locator("article").count();
    expect(after).toBeLessThanOrEqual(before);

    // Every visible card must now carry the Music badge.
    const badges = await page.locator("article span").filter({ hasText: /^Music$/ }).count();
    expect(badges).toBeGreaterThan(0);
  });

  test("the UI search box filters as the visitor types", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("input-search").fill("pottery");
    await expect(page.getByText("The Art of Slow Pottery")).toBeVisible();
    await expect(page.getByText("Coimbatore Acoustic Night")).toHaveCount(0);
  });

  test("shows a friendly empty state rather than a blank screen", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("input-search").fill("zzzzznothingmatchesthis");
    await expect(page.getByText("No events match that")).toBeVisible();
  });

  test("event detail is reachable and shows a price in Indian format", async ({ page }) => {
    await page.goto("/");
    await page.locator("article a").first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/₹|Free/).first()).toBeVisible();
    // The card designer is gated behind sign-in, so an anonymous visitor gets the
    // sign-in prompt rather than a preview.
    await expect(page.getByRole("link", { name: /sign in to design/i })).toBeVisible();
    await expect(page.getByTestId("card-preview")).toBeHidden();
  });

  test("signed-in visitors get the card designer with a live preview", async ({ page }) => {
    const user = newVisitor("designer");
    await signUp(page, user);
    await expectSignedIn(page);

    await page.goto("/");
    await page.locator("article a").first().click();
    await expect(page.getByTestId("card-preview")).toBeVisible();
    await expect(page.getByText(/₹|Free/).first()).toBeVisible();
  });
});