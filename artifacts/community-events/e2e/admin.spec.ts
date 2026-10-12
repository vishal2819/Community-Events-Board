import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { newVisitor, signUp, signInAsAdmin, expectSignedIn } from "./helpers";
import { baseURL } from "./runtime";

test.use({ extraHTTPHeaders: { Origin: baseURL } });

function uniqueTitle(prefix: string): string {
  return `${prefix} ${Math.random().toString(36).slice(2, 8)}`;
}

/** Cookie header for the browser session, so the request fixture behaves like the tab. */
async function cookieHeader(page: Page): Promise<string> {
  return (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
}

/** Signs in as admin and waits for the list to finish loading before navigating again. */
async function signInAndSettle(page: Page): Promise<void> {
  await signInAsAdmin(page);
  await expect(page).toHaveURL(/\/admin\/events/);
  await expect(page.getByTestId("link-new-event")).toBeVisible();
}

/** Fills the admin event form. Empty strings are left untouched. */
async function fillEventForm(page: Page, fields: Record<string, string>): Promise<void> {
  await page.getByTestId("form-event").waitFor({ state: "visible" });
  for (const [label, value] of Object.entries(fields)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
}

async function createEventViaApi(request: APIRequestContext, headers: Record<string, string>, title: string) {
  return request.post("/api/admin/events", {
    headers,
    data: {
      title,
      category: "MUSIC",
      city: "Pune",
      startsAt: "2030-04-05T13:00:00.000Z",
      price: "499",
      description: "An event created by the browser test suite.",
    },
  });
}

test.describe("Admin event management", () => {
  test("an admin signs in and reaches the management list", async ({ page }) => {
    await signInAndSettle(page);
  });

  test("creates an event that then appears on the public board", async ({ page }) => {
    await signInAndSettle(page);
    const title = uniqueTitle("E2E Launch Night");

    await page.goto("/admin/events/new");
    await fillEventForm(page, {
      Title: title,
      City: "Pune",
      "Starts at (IST)": "2030-04-05T19:30",
      "Price (INR)": "499",
      Description: "A brand new event created by the browser test suite.",
    });
    await page.getByTestId("button-save-event").click();
    await expect(page).toHaveURL(/\/admin\/events/);

    await page.goto("/");
    await page.getByTestId("input-search").fill(title);
    await expect(page.getByText(title)).toBeVisible();
  });

  test("rejects invalid event input before it reaches the server", async ({ page }) => {
    await signInAndSettle(page);
    await page.goto("/admin/events/new");

    await fillEventForm(page, {
      Title: "ab",
      City: "P",
      "Price (INR)": "-5",
      Description: "short",
    });
    await page.getByTestId("button-save-event").click();

    await expect(page.getByText("Title must be 3 to 120 characters.")).toBeVisible();
    await expect(page.getByText("City must be 2 to 80 characters.")).toBeVisible();
    await expect(page.getByText("Enter rupees like 499 or 499.50.")).toBeVisible();
    await expect(page.getByText("Description must be 10 to 4000 characters.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/events\/new/);
  });

  test("the server rejects an invalid event regardless of client validation", async ({ page, request }) => {
    await signInAndSettle(page);
    const headers = { Cookie: await cookieHeader(page) };

    const badPrice = await request.post("/api/admin/events", {
      headers,
      data: {
        title: "Server side check",
        category: "MUSIC",
        city: "Pune",
        startsAt: "2030-04-05T13:00:00.000Z",
        price: "-5",
        description: "The server must reject this on its own.",
      },
    });
    expect(badPrice.status()).toBe(422);

    const badCategory = await request.post("/api/admin/events", {
      headers,
      data: {
        title: "Server side check",
        category: "DANCE",
        city: "Pune",
        startsAt: "2030-04-05T13:00:00.000Z",
        price: "100",
        description: "The server must reject this on its own.",
      },
    });
    expect(badCategory.status()).toBe(422);
  });

  test("deactivating an event removes it from public discovery but keeps it for admins", async ({ page, request }) => {
    await signInAndSettle(page);
    const headers = { Cookie: await cookieHeader(page) };
    const title = uniqueTitle("E2E Retired Event");

    const created = await createEventViaApi(request, headers, title);
    expect(created.status()).toBe(201);
    const id = (await created.json()).data.id as string;

    // Active: visible publicly.
    await page.goto("/");
    await page.getByTestId("input-search").fill(title);
    await expect(page.getByText(title)).toBeVisible();

    // Retiring it removes it from the public board.
    const retired = await request.patch(`/api/admin/events/${id}`, {
      headers,
      data: { isActive: false },
    });
    expect(retired.status()).toBe(200);

    await page.goto("/");
    await page.getByTestId("input-search").fill(title);
    await expect(page.getByText("No events match that")).toBeVisible();

    // The record itself must still be there for an administrator.
    const asAdmin = await request.get("/api/admin/events?pageSize=30", { headers });
    const events = (await asAdmin.json()).data as { title: string; isActive: boolean }[];
    const row = events.find((e) => e.title === title);
    expect(row, "deactivated events stay in the admin list").toBeTruthy();
    expect(row!.isActive).toBe(false);
  });

  test("the admin list offers a working activate and deactivate control", async ({ page }) => {
    await signInAndSettle(page);
    await expect(page.locator("table tbody tr").first()).toBeVisible();

    // Toggle whichever record is shown first, then confirm the control flips.
    const firstRow = page.locator("table tbody tr").first();
    const deactivate = firstRow.getByRole("button", { name: /^Deactivate / });
    const activate = firstRow.getByRole("button", { name: /^Activate / });

    if (await deactivate.isVisible()) {
      await deactivate.click();
      await expect(activate).toBeVisible();
      await activate.click();
      await expect(deactivate).toBeVisible();
    } else {
      await activate.click();
      await expect(deactivate).toBeVisible();
      await deactivate.click();
      await expect(activate).toBeVisible();
    }
  });

  test("edits an existing event and the change is reflected publicly", async ({ page, request }) => {
    await signInAndSettle(page);
    const headers = { Cookie: await cookieHeader(page) };
    const title = uniqueTitle("E2E Editable");

    const created = await createEventViaApi(request, headers, title);
    expect(created.status()).toBe(201);
    const id = (await created.json()).data.id as string;

    await page.goto(`/admin/events/${id}/edit`);
    const revised = `${title} Revised`;
    await fillEventForm(page, { Title: revised });
    await page.getByTestId("button-save-event").click();
    await expect(page).toHaveURL(/\/admin\/events/);

    await page.goto("/");
    await page.getByTestId("input-search").fill(revised);
    await expect(page.getByText(revised)).toBeVisible();
  });

  test("a stale edit is rejected rather than silently overwriting", async ({ page, request }) => {
    await signInAndSettle(page);
    const headers = { Cookie: await cookieHeader(page) };
    const title = uniqueTitle("E2E Concurrent");

    const created = await createEventViaApi(request, headers, title);
    const id = (await created.json()).data.id as string;

    const original = await (await request.get(`/api/admin/events/${id}`, { headers })).json();
    const updatedAt = original.data.updatedAt as string;

    const first = await request.patch(`/api/admin/events/${id}`, {
      headers,
      data: { title: `${title} first`, updatedAt },
    });
    expect(first.status()).toBe(200);

    // Replaying the original timestamp must be refused.
    const second = await request.patch(`/api/admin/events/${id}`, {
      headers,
      data: { title: `${title} second`, updatedAt },
    });
    expect(second.status()).toBe(409);
    expect((await second.json()).error.code).toBe("STALE_EVENT");
  });

  test("admin listing includes past and inactive events", async ({ page, request }) => {
    await signInAndSettle(page);
    const headers = { Cookie: await cookieHeader(page) };

    const admin = await (await request.get("/api/admin/events?pageSize=30", { headers })).json();
    const adminEvents = admin.data as { title: string; isActive: boolean; startsAt: string }[];
    expect(adminEvents.some((e) => !e.isActive), "admin list should include inactive events").toBe(true);
    expect(
      adminEvents.some((e) => new Date(e.startsAt).getTime() < Date.now()),
      "admin list should include past events",
    ).toBe(true);

    // The public API must not expose them.
    const pub = await (await request.get("/api/events?pageSize=30")).json();
    for (const event of pub.data) {
      expect(event.isActive).toBe(true);
      expect(new Date(event.startsAt).getTime()).toBeGreaterThan(Date.now());
    }
  });

  test("offers no way to delete an event", async ({ page }) => {
    await signInAndSettle(page);
    await expect(page.locator("table tbody tr").first()).toBeVisible();

    await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /delete/i })).toHaveCount(0);

    // DELETE is not routed at all, so the server cannot act on it even by hand.
    const response = await page.evaluate(async () => {
      const result = await fetch("/api/admin/events", { method: "DELETE" });
      return result.status;
    });
    expect([404, 405]).toContain(response);
  });

  test("a visitor cannot reach the admin interface", async ({ page }) => {
    await signUp(page, newVisitor("visitor-admin"));
    await expectSignedIn(page);

    for (const path of ["/admin/events", "/admin/events/new"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login|\/$/);
    }
  });

  test("a visitor cannot use admin APIs", async ({ page, request }) => {
    await signUp(page, newVisitor("visitor-api"));
    await expectSignedIn(page);
    const headers = { Cookie: await cookieHeader(page) };

    const list = await request.get("/api/admin/events", { headers });
    expect(list.status()).toBe(403);
    expect((await list.json()).error.code).toBe("FORBIDDEN");

    const create = await request.post("/api/admin/events", {
      headers,
      data: {
        title: "Injected by a visitor",
        category: "MUSIC",
        city: "Pune",
        startsAt: "2030-01-01T13:00:00.000Z",
        price: "100",
        description: "A visitor should never be able to create this.",
      },
    });
    expect(create.status()).toBe(403);

    const update = await request.patch("/api/admin/events/00000000-0000-4000-8000-000000000001", {
      headers,
      data: { isActive: false },
    });
    expect(update.status()).toBe(403);
  });

  test("a visitor cannot promote itself through request fields", async ({ page, request }) => {
    await signUp(page, newVisitor("escalate-admin"));
    await expectSignedIn(page);
    const headers = { Cookie: await cookieHeader(page) };

    // Supplying a role at signup is refused outright by the strict schema.
    const escalation = await request.post("/api/auth/signup", {
      data: { email: "escalated@example.com", password: "Sunrise-Lantern-42!", role: "ADMIN" },
    });
    expect(escalation.status()).toBe(422);

    // A forged bearer token is rejected.
    const forged = await request.get("/api/admin/events", {
      headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJBRE1JTiJ9.sig" },
    });
    expect(forged.status()).toBe(401);

    // The signed-in visitor is still only a USER.
    const me = await request.get("/api/auth/me", { headers });
    expect((await me.json()).data.role).toBe("USER");
  });

  test("unauthenticated callers get 401 from every protected API", async ({ request }) => {
    for (const path of ["/api/feed", "/api/favourites", "/api/reminders"]) {
      const response = await request.get(path);
      expect(response.status(), `${path} should require authentication`).toBe(401);
    }
    expect((await request.get("/api/admin/events")).status()).toBe(401);
  });

  test("a tampered token is rejected", async ({ request }) => {
    const user = newVisitor("tamper");
    const created = await request.post("/api/auth/signup", {
      data: { email: user.email, password: user.password },
    });
    const token = (await created.json()).data.token as string;
    const [header, payload, signature] = token.split(".");

    const response = await request.get("/api/feed", {
      headers: { Authorization: `Bearer ${header}.${payload}.${signature.slice(0, -2)}xx` },
    });
    expect(response.status()).toBe(401);
  });
});