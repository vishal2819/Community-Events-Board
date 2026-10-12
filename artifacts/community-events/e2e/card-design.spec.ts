import { expect, test } from "@playwright/test";
import { newVisitor, signUp, expectSignedIn } from "./helpers";

test.use({ extraHTTPHeaders: { Origin: "http://127.0.0.1:3100" } });

/** Signs a visitor in and opens the first event so the designer is available. */
async function openFirstEvent(page: import("@playwright/test").Page) {
  await signUp(page, newVisitor("card"));
  await expectSignedIn(page);
  await page.goto("/");
  await expect(page.locator("article").first()).toBeVisible();
  await page.locator("article a").first().click();
  await expect(page.getByTestId("card-preview")).toBeVisible();
}

test.describe("Event card designer", () => {
  test("the preview updates live when a theme is chosen", async ({ page }) => {
    await openFirstEvent(page);

    const preview = page.getByTestId("card-preview");
    await expect(preview).toHaveAttribute("data-theme-key", "warm-atelier");

    await page.getByTestId("theme-midnight-indigo").click();
    await expect(preview).toHaveAttribute("data-theme-key", "midnight-indigo");

    await page.getByTestId("theme-botanical").click();
    await expect(preview).toHaveAttribute("data-theme-key", "botanical");
  });

  test("adds and removes stickers", async ({ page }) => {
    await openFirstEvent(page);

    await page.getByTestId("sticker-vinyl").click();
    await page.getByRole("button", { name: "Stickers (1/3)" }).or(page.getByText("(1/3)")).first().waitFor();

    await page.getByTestId("sticker-spark").click();
    await expect(page.getByText("(2/3)")).toBeVisible();

    // Deselecting frees a slot again.
    await page.getByTestId("sticker-vinyl").click();
    await expect(page.getByText("(1/3)")).toBeVisible();
  });

  test("enforces a maximum of three stickers in the interface", async ({ page }) => {
    await openFirstEvent(page);

    await page.getByTestId("sticker-vinyl").click();
    await page.getByTestId("sticker-coldbrew").click();
    await page.getByTestId("sticker-spark").click();
    await expect(page.getByText("(3/3)")).toBeVisible();

    // Every remaining sticker control is now disabled.
    await expect(page.getByTestId("sticker-flower")).toBeDisabled();
    await expect(page.getByTestId("sticker-ticket")).toBeDisabled();
    await expect(page.getByText("Three is the limit")).toBeVisible();
  });

  test("saves the design and restores it after a reload", async ({ page }) => {
    await openFirstEvent(page);

    await page.getByTestId("theme-botanical").click();
    await page.getByTestId("sticker-flower").click();
    await page.getByTestId("sticker-ticket").click();

    const saved = page.waitForResponse((r) => r.url().includes("/card-design") && r.request().method() === "PUT");
    await page.getByTestId("button-save-card").click();
    expect((await saved).status()).toBe(200);

    // Once the save lands there is nothing left to save, so the button disables.
    await expect(page.getByTestId("button-save-card")).toBeDisabled();

    await page.reload();
    await expect(page.getByTestId("card-preview")).toHaveAttribute("data-theme-key", "botanical");
    await expect(page.getByTestId("sticker-flower")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("sticker-ticket")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("sticker-vinyl")).toHaveAttribute("aria-pressed", "false");
  });

  test("revert restores the last saved design", async ({ page }) => {
    await openFirstEvent(page);

    await page.getByTestId("theme-midnight-indigo").click();
    const saved = page.waitForResponse((r) => r.url().includes("/card-design") && r.request().method() === "PUT");
    await page.getByTestId("button-save-card").click();
    await saved;

    await page.getByTestId("theme-warm-atelier").click();
    await expect(page.getByTestId("card-preview")).toHaveAttribute("data-theme-key", "warm-atelier");

    await page.getByTestId("button-revert-card").click();
    await expect(page.getByTestId("card-preview")).toHaveAttribute("data-theme-key", "midnight-indigo");
  });

  test("the server rejects a fourth sticker regardless of client state", async ({ page, request }) => {
    await openFirstEvent(page);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const headers = { Cookie: cookieHeader };

    const list = await (await request.get("/api/events?pageSize=1", { headers })).json();
    const id = list.data[0].id as string;

    const three = await request.put(`/api/events/${id}/card-design`, {
      headers,
      data: { theme: "warm-atelier", stickers: ["vinyl", "spark", "flower"] },
    });
    expect(three.status()).toBe(200);

    const four = await request.put(`/api/events/${id}/card-design`, {
      headers,
      data: { theme: "warm-atelier", stickers: ["vinyl", "spark", "flower", "ticket"] },
    });
    expect(four.status()).toBe(422);

    const duplicates = await request.put(`/api/events/${id}/card-design`, {
      headers,
      data: { theme: "warm-atelier", stickers: ["vinyl", "vinyl"] },
    });
    expect(duplicates.status()).toBe(422);

    const badTheme = await request.put(`/api/events/${id}/card-design`, {
      headers,
      data: { theme: "neon-hacker", stickers: [] },
    });
    expect(badTheme.status()).toBe(422);
  });

  test("a design is scoped to its owner and event", async ({ page, request }) => {
    await openFirstEvent(page);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const headers = { Cookie: cookieHeader };

    const list = await (await request.get("/api/events?pageSize=1", { headers })).json();
    const id = list.data[0].id as string;
    await request.put(`/api/events/${id}/card-design`, {
      headers,
      data: { theme: "botanical", stickers: [] },
    });

    // A second visitor must not see the first visitor's saved design.
    const other = newVisitor("card-other");
    const created = await request.post("/api/auth/signup", {
      data: { email: other.email, password: other.password },
    });
    const token = (await created.json()).data.token;

    const mine = await request.get(`/api/events/${id}/card-design`, { headers });
    expect((await mine.json()).theme).toBe("botanical");

    const theirs = await request.get(`/api/events/${id}/card-design`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect((await theirs.json()).theme).toBe("warm-atelier");
  });

  test("design requires authentication", async ({ request }) => {
    const list = await (await request.get("/api/events?pageSize=1")).json();
    const id = list.data[0].id as string;

    const read = await request.get(`/api/events/${id}/card-design`);
    expect(read.status()).toBe(401);

    const write = await request.put(`/api/events/${id}/card-design`, {
      data: { theme: "warm-atelier", stickers: [] },
    });
    expect(write.status()).toBe(401);
  });
});