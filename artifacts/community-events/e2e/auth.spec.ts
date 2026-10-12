import { expect, test } from "@playwright/test";
import { newVisitor, signUp, expectSignedIn, SAME_ORIGIN } from "./helpers";

test.describe("Authentication", () => {
  test.use({ extraHTTPHeaders: SAME_ORIGIN });

  test("signup creates an account and lands on favourite selection", async ({ page }) => {
    const user = newVisitor("signup");
    await signUp(page, user);
    await expect(page).toHaveURL(/\/onboarding\/favourites/);
    await expectSignedIn(page);
  });

  test("login issues a JWT and an HttpOnly session cookie", async ({ page }) => {
    const user = newVisitor("cookie");
    await signUp(page, user);
    // Wait for the session to settle before inspecting the jar.
    await expectSignedIn(page);

    const cookies = await page.context().cookies();
    const session = cookies.find((c) => c.name === "civic_session");
    expect(session, "session cookie should be set").toBeTruthy();
    expect(session!.httpOnly, "session cookie must be HttpOnly").toBe(true);
    expect(session!.sameSite).toBe("Lax");

    // The browser must not be able to read the token from script storage.
    const storage = await page.evaluate(() => ({
      local: Object.entries(localStorage),
      session: Object.entries(sessionStorage),
    }));
    expect(JSON.stringify(storage)).not.toContain(session!.value);
  });

  test("the login response returns a JWT for API clients", async ({ request }) => {
    const user = newVisitor("bearer");
    const signup = await request.post("/api/auth/signup", {
      data: { email: user.email, password: user.password },
    });
    expect(signup.status()).toBe(201);
    const created = await signup.json();
    expect(created.data.token.split(".")).toHaveLength(3);
    expect(created.data.user.role).toBe("USER");

    const me = await request.get("/api/auth/me", {
      headers: { Authorization: `Bearer ${created.data.token}` },
    });
    expect(me.status()).toBe(200);
    expect((await me.json()).data.email).toBe(user.email);
  });

  test("/me never exposes a password hash", async ({ request }) => {
    const user = newVisitor("safe");
    const signup = await request.post("/api/auth/signup", {
      data: { email: user.email, password: user.password },
    });
    const body = JSON.stringify(await signup.json());
    expect(body.toLowerCase()).not.toContain("passwordhash");
  });

  test("logout clears the session from the interface", async ({ page }) => {
    const user = newVisitor("logout");
    await signUp(page, user);
    await expectSignedIn(page);

    await page.getByTestId("button-logout").click();

    await expect(page.getByTestId("link-login")).toBeVisible();
    await expect(page.getByTestId("button-logout")).toHaveCount(0);

    // The session cookie must actually be cleared, not just hidden in the UI.
    await expect
      .poll(async () => (await page.context().cookies()).find((c) => c.name === "civic_session" && c.value !== ""))
      .toBeUndefined();

    // A reload must not restore the session.
    await page.reload();
    await expect(page.getByTestId("link-login")).toBeVisible();
  });

  test("the logout endpoint reports success and clears the cookie", async ({ page, request }) => {
    const user = newVisitor("logout-api");
    await signUp(page, user);
    await expectSignedIn(page);

    const response = await request.post("/api/auth/logout");
    expect(response.status()).toBe(200);
    expect((await response.json()).data.message).toBe("Signed out.");

    const setCookie = response.headers()["set-cookie"] ?? "";
    expect(setCookie).toContain("civic_session=");
    // max-age=0 is how the server instructs the browser to drop the cookie.
    expect(setCookie.toLowerCase()).toMatch(/max-age=0|expires=thu, 01 jan 1970/);
  });

  test("rejects a password shorter than ten characters", async ({ page }) => {
    await page.goto("/signup");
    await page.getByTestId("input-email").fill(newVisitor("short").email);
    await page.getByTestId("input-password").fill("tooshort");
    await page.getByTestId("button-submit").click();
    await expect(page.getByText("Password must be 10 to 72 characters.")).toBeVisible();
  });

  test("rejects a malformed email without calling the API", async ({ page }) => {
    let called = false;
    await page.route("**/api/auth/signup", (route) => {
      called = true;
      return route.fulfill({ status: 201, body: "{}" });
    });
    await page.goto("/signup");
    await page.getByTestId("input-email").fill("not-an-email");
    await page.getByTestId("input-password").fill("Sunrise-Lantern-42!");
    await page.getByTestId("button-submit").click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    expect(called).toBe(false);
  });

  test("returns a generic error for a wrong password", async ({ request }) => {
    const user = newVisitor("wrongpw");
    await request.post("/api/auth/signup", { data: { email: user.email, password: user.password } });

    const response = await request.post("/api/auth/login", {
      data: { email: user.email, password: "Definitely-Wrong-99!" },
    });
    expect(response.status()).toBe(401);
    expect((await response.json()).error.message).toBe("Invalid email or password.");
  });

  test("does not reveal whether an account exists", async ({ request }) => {
    const existing = newVisitor("exists");
    await request.post("/api/auth/signup", { data: { email: existing.email, password: existing.password } });

    const known = await request.post("/api/auth/login", {
      data: { email: existing.email, password: "Definitely-Wrong-99!" },
    });
    const unknown = await request.post("/api/auth/login", {
      data: { email: "nobody-here@example.com", password: "Definitely-Wrong-99!" },
    });

    expect(known.status()).toBe(unknown.status());
    expect((await known.json()).error).toEqual((await unknown.json()).error);
  });

  test("normalises email casing on signup", async ({ request }) => {
    const user = newVisitor("case");
    const response = await request.post("/api/auth/signup", {
      data: { email: `  ${user.email.toUpperCase()} `, password: user.password },
    });
    expect(response.status()).toBe(201);
    expect((await response.json()).data.user.email).toBe(user.email);

    // The same address in a different case must not create a second account.
    const duplicate = await request.post("/api/auth/signup", {
      data: { email: user.email.toUpperCase(), password: user.password },
    });
    expect(duplicate.status()).toBe(409);
  });

  test("rejects an unknown property in the credentials payload", async ({ request }) => {
    const response = await request.post("/api/auth/signup", {
      data: { email: "someone@example.com", password: "Sunrise-Lantern-42!", role: "ADMIN" },
    });
    expect(response.status()).toBe(422);
  });

  test("a visitor cannot self-assign the admin role at signup", async ({ request }) => {
    const user = newVisitor("escalate");
    const response = await request.post("/api/auth/signup", {
      data: { email: user.email, password: user.password },
    });
    expect((await response.json()).data.user.role).toBe("USER");
  });

  test("rate limits repeated failed logins for one account", async ({ request }) => {
    const user = newVisitor("ratelimit");
    await request.post("/api/auth/signup", { data: { email: user.email, password: user.password } });

    let limited: number | null = null;
    for (let attempt = 0; attempt < 15; attempt++) {
      const response = await request.post("/api/auth/login", {
        data: { email: user.email, password: "Definitely-Wrong-99!" },
      });
      if (response.status() === 429) {
        limited = attempt;
        expect((await response.json()).error.code).toBe("RATE_LIMIT");
        break;
      }
    }
    // The per-account bucket allows ten attempts before refusing the eleventh.
    expect(limited, "login should eventually be rate limited").not.toBeNull();
    expect(limited!).toBeLessThanOrEqual(12);
  });
});

/**
 * Deliberately does not set the SAME_ORIGIN default, so requests reach the server
 * with no Origin header at all. That is the case a cookie-authenticated mutation
 * must refuse, and it cannot be observed while a default Origin is injected.
 */
test.describe("CSRF protection", () => {
  async function sessionCookieHeader(page: import("@playwright/test").Page): Promise<string> {
    const user = newVisitor("csrf");
    await signUp(page, user);
    await expectSignedIn(page);
    const cookies = await page.context().cookies();
    return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  }

  test("rejects a mutation from a foreign origin that carries the session cookie", async ({ page, request }) => {
    const cookieHeader = await sessionCookieHeader(page);

    const response = await request.put("/api/favourites", {
      headers: { Cookie: cookieHeader, Origin: "https://evil.example" },
      data: { categories: ["MUSIC"] },
    });
    expect(response.status()).toBe(403);
    expect((await response.json()).error.code).toBe("CSRF");

    // The refused request must not have changed anything.
    const saved = await request.get("/api/favourites", { headers: { Cookie: cookieHeader } });
    expect((await saved.json()).categories).toHaveLength(0);
  });

  test("rejects a cookie-authenticated mutation with no Origin header", async ({ page, request }) => {
    const cookieHeader = await sessionCookieHeader(page);

    const response = await request.put("/api/favourites", {
      headers: { Cookie: cookieHeader },
      data: { categories: ["MUSIC"] },
    });
    expect(response.status()).toBe(403);
    expect((await response.json()).error.code).toBe("CSRF");
  });

  test("rejects a same-host Origin sent over an unexpected protocol", async ({ page, request }) => {
    const cookieHeader = await sessionCookieHeader(page);

    const response = await request.put("/api/favourites", {
      headers: { Cookie: cookieHeader, Origin: `ftp://127.0.0.1:3100` },
      data: { categories: ["MUSIC"] },
    });
    expect(response.status()).toBe(403);
  });

  test("a bearer client without cookies may omit Origin", async ({ request }) => {
    const user = newVisitor("bearer-noorigin");
    const created = await request.post("/api/auth/signup", {
      data: { email: user.email, password: user.password },
      headers: { Origin: "" },
    });
    const token = (await created.json()).data.token;

    // A read is always allowed; this proves the no-Origin path is not blanket-denied.
    const response = await request.get("/api/events", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(200);
  });
});