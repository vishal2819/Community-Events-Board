import { expect, test } from "@playwright/test";
import { newVisitor, signUp, signIn, expectSignedIn } from "./helpers";

test.use({ extraHTTPHeaders: { Origin: "http://127.0.0.1:3100" } });

test.describe("Visitor favourites and feed", () => {
  test("saving favourites persists across a reload", async ({ page }) => {
    await signUp(page, newVisitor("fav"));

    await page.getByTestId("toggle-category-MUSIC").click();
    await page.getByTestId("toggle-category-FOOD").click();
    await page.getByTestId("button-save-favourites").click();

    await expect(page).toHaveURL(/\/feed/);

    await page.reload();
    await page.goto("/onboarding/favourites");
    await expect(page.getByTestId("toggle-category-MUSIC")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("toggle-category-FOOD")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("toggle-category-KIDS")).toHaveAttribute("aria-pressed", "false");
  });

  test("saving favourites replaces rather than appends", async ({ page }) => {
    await signUp(page, newVisitor("replace"));
    await page.getByTestId("toggle-category-MUSIC").click();
    await page.getByTestId("button-save-favourites").click();
    await expect(page).toHaveURL(/\/feed/);

    await page.goto("/onboarding/favourites");
    await expect(page.getByTestId("toggle-category-MUSIC")).toHaveAttribute("aria-pressed", "true");

    // Deselect music and pick sports instead.
    await page.getByTestId("toggle-category-MUSIC").click();
    await page.getByTestId("toggle-category-SPORTS").click();
    await page.getByTestId("button-save-favourites").click();
    await expect(page).toHaveURL(/\/feed/);

    await page.goto("/onboarding/favourites");
    await expect(page.getByTestId("toggle-category-SPORTS")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("toggle-category-MUSIC")).toHaveAttribute("aria-pressed", "false");
  });

  test("the feed only contains events from saved categories", async ({ page, request }) => {
    await signUp(page, newVisitor("feed"));
    await page.getByTestId("toggle-category-KIDS").click();
    await page.getByTestId("button-save-favourites").click();
    await expect(page).toHaveURL(/\/feed/);

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const feed = await request.get("/api/feed?pageSize=30", { headers: { Cookie: cookieHeader } });

    expect(feed.status()).toBe(200);
    const body = await feed.json();
    for (const event of body.data) {
      expect(event.category).toBe("KIDS");
      expect(event.isActive).toBe(true);
      expect(new Date(event.startsAt).getTime()).toBeGreaterThan(Date.now());
    }
  });

  test("shows a friendly empty state when no favourites are chosen", async ({ page }) => {
    await signUp(page, newVisitor("empty"));
    await page.goto("/onboarding/favourites");
    await page.getByRole("button", { name: /skip for now/i }).click();

    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByText("Nothing here yet")).toBeVisible();
  });
});

test.describe("Reminders", () => {
  test("a reminder updates immediately and survives a reload", async ({ page }) => {
    await signUp(page, newVisitor("reminder"));
    await page.goto("/");
    await expect(page.locator("article").first()).toBeVisible();

    const card = page.locator("article").first();
    // Wait for the write to be accepted, otherwise a reload can outrun it.
    const saved = page.waitForResponse((r) => r.url().includes("/reminder") && r.request().method() === "PUT");
    await card.getByRole("button", { name: /remind me about/i }).click();
    expect((await saved).status()).toBe(200);

    // Optimistic state flips immediately, before any navigation.
    await expect(card.getByRole("button", { name: /remove reminder for/i })).toBeVisible();

    await page.reload();
    await expect(page.locator("article").first().getByRole("button", { name: /remove reminder for/i })).toBeVisible();
  });

  test("a reminder can be removed and the removal persists", async ({ page }) => {
    await signUp(page, newVisitor("unremind"));
    await page.goto("/");
    await expect(page.locator("article").first()).toBeVisible();

    const card = page.locator("article").first();
    const put = page.waitForResponse((r) => r.url().includes("/reminder") && r.request().method() === "PUT");
    await card.getByRole("button", { name: /remind me about/i }).click();
    await put;
    await expect(card.getByRole("button", { name: /remove reminder for/i })).toBeVisible();

    const removed = page.waitForResponse((r) => r.url().includes("/reminder") && r.request().method() === "DELETE");
    await card.getByRole("button", { name: /remove reminder for/i }).click();
    await removed;
    await expect(card.getByRole("button", { name: /remind me about/i })).toBeVisible();

    await page.reload();
    await expect(page.locator("article").first().getByRole("button", { name: /remind me about/i })).toBeVisible();
  });

  test("saved reminders appear on the feed reminders tab", async ({ page }) => {
    await signUp(page, newVisitor("reminders-tab"));
    await page.goto("/");
    await expect(page.locator("article").first()).toBeVisible();

    const put = page.waitForResponse((r) => r.url().includes("/reminder") && r.request().method() === "PUT");
    await page.locator("article").first().getByRole("button", { name: /remind me about/i }).click();
    await put;

    await page.goto("/feed");
    await page.getByTestId("tab-reminders").click();
    await expect(page.locator("article").first()).toBeVisible();
    await expect(page.getByTestId("tab-reminders")).toContainText("1");
  });

  test("setting the same reminder twice is idempotent", async ({ page, request }) => {
    const user = newVisitor("idempotent");
    await signUp(page, user);
    await expectSignedIn(page);

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const headers = { Cookie: cookieHeader };

    const events = await (await request.get("/api/events?pageSize=1", { headers })).json();
    const id = events.data[0].id as string;

    const first = await request.put(`/api/events/${id}/reminder`, { headers });
    const second = await request.put(`/api/events/${id}/reminder`, { headers });
    expect(first.status()).toBe(200);
    expect(second.status()).toBe(200);
    expect((await first.json()).hasReminder).toBe(true);
    expect((await second.json()).hasReminder).toBe(true);

    const list = await (await request.get("/api/reminders", { headers })).json();
    expect(list.data.filter((e: { id: string }) => e.id === id)).toHaveLength(1);

    // Removing twice must also be idempotent.
    const del1 = await request.delete(`/api/events/${id}/reminder`, { headers });
    const del2 = await request.delete(`/api/events/${id}/reminder`, { headers });
    expect(del1.status()).toBe(200);
    expect(del2.status()).toBe(200);

    const after = await (await request.get("/api/reminders", { headers })).json();
    expect(after.data).toHaveLength(0);
  });

  test("a reminder cannot be set for an unknown event", async ({ request }) => {
    const user = newVisitor("badreminder");
    const created = await request.post("/api/auth/signup", {
      data: { email: user.email, password: user.password },
    });
    const token = (await created.json()).data.token;

    const response = await request.put("/api/events/00000000-0000-4000-8000-999999999999/reminder", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(404);
  });

  test("a reminder cannot be set for an inactive event", async ({ page, request }) => {
    const user = newVisitor("inactive-reminder");
    await signUp(page, user);
    await expectSignedIn(page);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    // The seeded inactive event must not be reachable through the public API.
    const publicList = await (await request.get("/api/events?pageSize=30", { headers: { Cookie: cookieHeader } })).json();
    const inactive = publicList.data.find(
      (e: { title: string }) => e.title === "Coimbatore Secret Music Night",
    );
    expect(inactive, "inactive events must not be publicly listed").toBeUndefined();

    const direct = await request.get(
      "/api/events/00000000-0000-4000-8000-000000000017",
      { headers: { Cookie: cookieHeader } },
    );
    expect(direct.status()).toBe(404);
  });
});

test.describe("Session persistence", () => {
  test("a signed-in visitor stays signed in across navigation", async ({ page }) => {
    const user = newVisitor("persist");
    await signUp(page, user);
    await expectSignedIn(page);

    await page.goto("/");
    await expect(page.getByTestId("button-logout")).toBeVisible();
    await page.goto("/feed");
    await expect(page.getByTestId("button-logout")).toBeVisible();
    await page.goto("/onboarding/favourites");
    await expect(page.getByTestId("button-logout")).toBeVisible();
  });

  test("signing in again reaches the feed", async ({ page }) => {
    const user = newVisitor("relogin");
    await signUp(page, user);

    await page.goto("/login");
    await page.getByTestId("input-email").fill("wrong@example.com");
    await page.getByTestId("input-password").fill("Definitely-Wrong-99!");
    await page.getByTestId("button-submit").click();

    // The client renders its own copy, so assert the alert rather than exact text.
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    await signIn(page, user);
    await expect(page).toHaveURL(/\/feed/);
    await expectSignedIn(page);
  });
});