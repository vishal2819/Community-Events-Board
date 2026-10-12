import { afterEach, describe, expect, it } from "vitest";
import { ApiError } from "@/lib/http";
import { assertOrigin, cookieToken, COOKIE_NAME } from "@/lib/auth/session";

function request(headers: Record<string, string>, url = "https://civic.example/api/favourites") {
  return new Request(url, { headers });
}

afterEach(() => {
  delete process.env.AUTH_TRUSTED_IP_HEADER;
});

describe("cookieToken", () => {
  it("reads the session cookie out of a header", () => {
    expect(cookieToken(`${COOKIE_NAME}=abc123; Path=/; HttpOnly`)).toBe("abc123");
  });

  it("tolerates surrounding whitespace between cookies", () => {
    expect(cookieToken(`theme=dark; ${COOKIE_NAME}=abc123; Path=/`)).toBe("abc123");
  });

  it("returns undefined when the cookie is absent", () => {
    expect(cookieToken("theme=dark; Path=/")).toBeUndefined();
  });

  it("returns undefined for a missing cookie header", () => {
    expect(cookieToken(null)).toBeUndefined();
  });

  it("does not match a cookie whose name merely ends with the session name", () => {
    expect(cookieToken(`not_${COOKIE_NAME}=abc123`)).toBeUndefined();
  });
});

describe("assertOrigin", () => {
  it("accepts a same-origin request", () => {
    expect(() => assertOrigin(request({ origin: "https://civic.example", host: "civic.example" }))).not.toThrow();
  });

  it("accepts a same-origin request over http for local development", () => {
    expect(() => assertOrigin(request({ origin: "http://localhost:3000", host: "localhost:3000" }, "http://localhost:3000/api/x"))).not.toThrow();
  });

  it("rejects a cross-origin request that carries a cookie", () => {
    expect(() => assertOrigin(request({
      origin: "https://evil.example",
      host: "civic.example",
      cookie: `${COOKIE_NAME}=abc123`,
    }))).toThrow(/same-origin/);
  });

  it("rejects a same-host request over a foreign protocol", () => {
    expect(() => assertOrigin(request({ origin: "ftp://civic.example", host: "civic.example", cookie: `${COOKIE_NAME}=abc123` })))
      .toThrow(/same-origin/);
  });

  it("rejects a missing Origin on a cookie-authenticated mutation", () => {
    expect(() => assertOrigin(request({ host: "civic.example", cookie: `${COOKIE_NAME}=abc123` }))).toThrow(ApiError);
  });

  it("allows a missing Origin for a bearer client with no ambient cookies", () => {
    expect(() => assertOrigin(request({ host: "civic.example", authorization: "Bearer token" }))).not.toThrow();
  });

  it("still enforces same-origin for a bearer client that sends Origin", () => {
    expect(() => assertOrigin(request({
      origin: "https://evil.example",
      host: "civic.example",
      authorization: "Bearer token",
    }))).toThrow(/same-origin/);
  });

  it("throws an ApiError with a 403 status", () => {
    try {
      assertOrigin(request({ origin: "https://evil.example", host: "civic.example", cookie: `${COOKIE_NAME}=x` }));
      expect.unreachable("expected a CSRF rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(403);
      expect((error as ApiError).code).toBe("CSRF");
    }
  });
});