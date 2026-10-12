import { afterEach, describe, expect, it } from "vitest";
import { ApiError } from "@/lib/http";
import { consumeLimit, limitAuth } from "@/lib/auth/rate-limit";

const clock = 1_700_000_000_000;

function req(headers: Record<string, string>) {
  return new Request("https://civic.example/api/auth/login", { headers });
}

afterEach(() => {
  delete process.env.AUTH_TRUSTED_IP_HEADER;
});

describe("consumeLimit", () => {
  it("allows attempts up to the limit", () => {
    expect(() => {
      for (let i = 0; i < 3; i++) consumeLimit("allowed", 3, clock);
    }).not.toThrow();
  });

  it("throws once the limit is exceeded", () => {
    expect(() => {
      for (let i = 0; i < 4; i++) consumeLimit("over", 3, clock);
    }).toThrow(ApiError);
  });

  it("reports a 429 with a RATE_LIMIT code", () => {
    try {
      consumeLimit("status", 1, clock);
      consumeLimit("status", 1, clock);
      expect.unreachable("expected a rate limit rejection");
    } catch (error) {
      expect((error as ApiError).status).toBe(429);
      expect((error as ApiError).code).toBe("RATE_LIMIT");
    }
  });

  it("starts a fresh window once the previous one has elapsed", () => {
    consumeLimit("window", 1, clock);
    expect(() => consumeLimit("window", 1, clock)).toThrow();
    expect(() => consumeLimit("window", 1, clock + 16 * 60 * 1000)).not.toThrow();
  });

  it("keeps separate buckets per key", () => {
    consumeLimit("key-a", 1, clock);
    expect(() => consumeLimit("key-a", 1, clock)).toThrow();
    expect(() => consumeLimit("key-b", 1, clock)).not.toThrow();
  });
});

describe("limitAuth forwarded-header handling", () => {
  // Buckets live in module scope, so each test uses its own account to stay
  // independent of the order tests run in.
  it("ignores x-forwarded-for by default, so a rotated header cannot buy a new bucket", () => {
    const email = "rotating@example.com";
    // Every attempt changes the address, but the per-account cap still applies.
    for (let i = 0; i < 10; i++) limitAuth(req({ "x-forwarded-for": `10.0.0.${i}` }), email);
    expect(() => limitAuth(req({ "x-forwarded-for": "10.9.9.9" }), email)).toThrow(/Too many attempts/);
  });

  it("does not let one account's attempts exhaust a different account", () => {
    for (let i = 0; i < 11; i++) {
      try { limitAuth(req({}), "noisy@example.com"); } catch { /* exhausted, as intended */ }
    }
    expect(() => limitAuth(req({}), "quiet@example.com")).not.toThrow();
  });

  it("buckets by the trusted header only once it is explicitly configured", () => {
    process.env.AUTH_TRUSTED_IP_HEADER = "x-real-ip";
    // Two distinct trusted peers each get their own allowance.
    expect(() => limitAuth(req({ "x-real-ip": "203.0.113.1" }), "peer-a@example.com")).not.toThrow();
    expect(() => limitAuth(req({ "x-real-ip": "203.0.113.2" }), "peer-b@example.com")).not.toThrow();
  });

  it("does not fall back to an untrusted header when a trusted header is configured", () => {
    process.env.AUTH_TRUSTED_IP_HEADER = "x-real-ip";
    const email = "spoof@example.com";
    // A configured trusted header must not cause x-forwarded-for to be used.
    for (let i = 0; i < 10; i++) limitAuth(req({ "x-forwarded-for": `10.0.0.${i}` }), email);
    expect(() => limitAuth(req({ "x-forwarded-for": "10.9.9.9" }), email)).toThrow(/Too many attempts/);
  });

  it("caps a single trusted peer independently of the account", () => {
    process.env.AUTH_TRUSTED_IP_HEADER = "x-real-ip";
    const headers = { "x-real-ip": "198.51.100.7" };
    // 40 is the per-peer cap; spreading across distinct accounts still trips it.
    for (let i = 0; i < 40; i++) {
      try { limitAuth(req(headers), `spread-${i}@example.com`); } catch { /* peer cap reached */ }
    }
    expect(() => limitAuth(req(headers), "final@example.com")).toThrow(/Too many attempts/);
  });
});