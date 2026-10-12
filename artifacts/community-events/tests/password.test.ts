import { afterEach, describe, expect, it } from "vitest";
import { PASSWORD_COST, hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("produces a bcrypt hash at the configured cost", async () => {
    const hash = await hashPassword("Sunrise-Lantern-42!");
    expect(hash).toMatch(/^\$2[aby]\$/);
    // The cost is the field after the algorithm prefix, e.g. $2b$12$.
    expect(hash.split("$")[2]).toBe(String(PASSWORD_COST));
  });

  it("uses a cost high enough to be meaningful", () => {
    expect(PASSWORD_COST).toBeGreaterThanOrEqual(12);
  });

  it("never stores the plaintext", async () => {
    const password = "Sunrise-Lantern-42!";
    const hash = await hashPassword(password);
    expect(hash).not.toContain(password);
  });

  it("salts, so the same password hashes differently each time", async () => {
    const [first, second] = await Promise.all([hashPassword("same-password"), hashPassword("same-password")]);
    expect(first).not.toBe(second);
    // Both must still verify.
    await expect(verifyPassword("same-password", first)).resolves.toBe(true);
    await expect(verifyPassword("same-password", second)).resolves.toBe(true);
  });

  it("verifies the correct password", async () => {
    const hash = await hashPassword("correct-password-1");
    await expect(verifyPassword("correct-password-1", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-password-1");
    await expect(verifyPassword("wrong-password-1", hash)).resolves.toBe(false);
  });

  it("rejects an empty password against a real hash", async () => {
    const hash = await hashPassword("correct-password-1");
    await expect(verifyPassword("", hash)).resolves.toBe(false);
  });

  it("returns false rather than throwing for a malformed hash", async () => {
    await expect(verifyPassword("anything", "not-a-bcrypt-hash")).resolves.toBe(false);
  });

  it("returns false rather than throwing for an empty stored hash", async () => {
    await expect(verifyPassword("anything", "")).resolves.toBe(false);
  });
});

describe("bcrypt input limits", () => {
  const originalMax = 72;
  it("accepts a password at the 72 byte ceiling", async () => {
    const password = "a".repeat(originalMax);
    const hash = await hashPassword(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
  });

  it("handles a multi-byte password within the byte budget", async () => {
    // bcrypt truncates at 72 bytes, so validation must count bytes, not characters.
    const password = "é".repeat(36);
    expect(password.length).toBe(36);
    expect(new TextEncoder().encode(password).length).toBe(72);
    const hash = await hashPassword(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
  });
});

afterEach(() => {
  // Keep the module import honest about not relying on ambient state.
  expect(typeof PASSWORD_COST).toBe("number");
});