import { expect, type Page } from "@playwright/test";
import { baseURL, readRuntime } from "./runtime";

export interface TestUser {
  email: string;
  password: string;
}

/**
 * Playwright's `request` fixture shares a cookie jar with the browser context, so
 * an API call made after a signup carries the session cookie. The server then
 * correctly treats it as a cookie-authenticated mutation and demands a same-origin
 * Origin header. Sending it by default keeps API tests exercising real behaviour
 * instead of being rejected as CSRF.
 */
export const SAME_ORIGIN = { Origin: baseURL };

/**
 * Each visitor test needs its own account. Signup is the real code path, so the
 * address is unique per test rather than reused, which keeps specs independent.
 */
export function newVisitor(label = "visitor"): TestUser {
  const unique = `${label}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    email: `${unique}@example.com`,
    // 24 chars: satisfies the 10 character minimum and the 72 byte bcrypt ceiling.
    password: "Sunrise-Lantern-42!",
  };
}

export async function signUp(page: Page, user: TestUser): Promise<void> {
  await page.goto("/signup");
  await page.getByTestId("input-email").fill(user.email);
  await page.getByTestId("input-password").fill(user.password);
  await page.getByTestId("button-submit").click();
  // Wait for the session to settle: navigating straight after the click races the
  // signup mutation, and the protected page then bounces to /login.
  await expect(page).toHaveURL(/\/onboarding\/favourites/, { timeout: 15_000 });
  await expectSignedIn(page);
}

/** Signs a visitor in through the UI so the session cookie is genuinely set. */
export async function signIn(page: Page, user: TestUser): Promise<void> {
  await page.goto("/login");
  await page.getByTestId("input-email").fill(user.email);
  await page.getByTestId("input-password").fill(user.password);
  await page.getByTestId("button-submit").click();
}

export async function signInAsAdmin(page: Page): Promise<void> {
  const admin = readRuntime();
  await page.goto("/admin/login");
  await page.getByTestId("input-email").fill(admin.email);
  await page.getByTestId("input-password").fill(admin.password);
  await page.getByTestId("button-submit").click();
}

/** Reads the session cookie, confirming HttpOnly is set on the browser side. */
export async function sessionCookies(page: Page) {
  return page.context().cookies();
}

/**
 * Confirms a visitor session exists. Checks `/api/auth/me` rather than a header
 * control, because the sign-out button is hidden at phone widths.
 */
export async function expectSignedIn(page: Page): Promise<void> {
  const response = await page.request.get("/api/auth/me");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.data, "session should resolve to a user").not.toBeNull();
  expect(body.data.role).toBe("USER");
}

export async function expectSignedOut(page: Page): Promise<void> {
  const response = await page.request.get("/api/auth/me");
  expect(response.status()).toBe(200);
  expect((await response.json()).data).toBeNull();
}