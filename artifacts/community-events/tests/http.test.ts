import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { ApiError, handler, json, readJson } from "@/lib/http";
import { credentialsSchema } from "@/lib/validations";

function post(body: string, contentType: string | null = "application/json") {
  return new Request("https://civic.example/api/auth/login", {
    method: "POST",
    headers: contentType ? { "content-type": contentType } : {},
    body,
  });
}

describe("readJson", () => {
  it("parses a valid payload through the schema", async () => {
    const parsed = await readJson(post(JSON.stringify({ email: "a@b.com", password: "0123456789" })), credentialsSchema);
    expect(parsed.email).toBe("a@b.com");
  });

  it("rejects a request without a JSON content type", async () => {
    await expect(readJson(post("{}", "text/plain"), credentialsSchema)).rejects.toMatchObject({ status: 415 });
  });

  it("rejects a request with no content type at all", async () => {
    await expect(readJson(post("{}", null), credentialsSchema)).rejects.toMatchObject({ status: 415 });
  });

  it("accepts a content type carrying a charset", async () => {
    await expect(readJson(post(JSON.stringify({ email: "a@b.com", password: "0123456789" }), "application/json; charset=utf-8"), credentialsSchema))
      .resolves.toBeDefined();
  });

  it("rejects malformed JSON", async () => {
    await expect(readJson(post("{not json"), credentialsSchema)).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a body beyond the size cap", async () => {
    const oversized = JSON.stringify({ email: "a@b.com", password: "0123456789", pad: "x".repeat(17_000) });
    await expect(readJson(post(oversized), credentialsSchema)).rejects.toMatchObject({ status: 413 });
  });

  it("surfaces schema violations as a ZodError", async () => {
    await expect(readJson(post(JSON.stringify({ email: "not-an-email", password: "0123456789" })), credentialsSchema))
      .rejects.toBeInstanceOf(ZodError);
  });
});

describe("json", () => {
  it("sets no-store so authenticated responses are never cached", () => {
    expect(json({ data: null }).headers.get("Cache-Control")).toBe("no-store");
  });

  it("uses the supplied status code", () => {
    expect(json({ data: null }, 201).status).toBe(201);
  });
});

describe("handler", () => {
  const failing = handler(async () => { throw new Error("database exploded: postgres://user:pw@host/db"); });

  it("maps a ZodError to 422 with field-level detail", async () => {
    const response = await handler(async () => { throw new ZodError([{ code: "custom", path: ["email"], message: "Invalid" }]); })(new Request("https://civic.example"));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.fields).toEqual([{ path: "email", message: "Invalid" }]);
  });

  it("maps an ApiError to its own status and code", async () => {
    const response = await handler(async () => { throw new ApiError(403, "CSRF", "A same-origin request is required."); })(new Request("https://civic.example"));
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("CSRF");
  });

  it("returns a generic 500 without leaking internal error text", async () => {
    const response = await failing(new Request("https://civic.example"));
    expect(response.status).toBe(500);
    const raw = await response.text();
    expect(raw).not.toContain("database exploded");
    expect(raw).not.toContain("postgres://");
    expect(raw).not.toContain("pw@");
    expect(JSON.parse(raw).error.message).toBe("Something went wrong. Please try again.");
  });

  it("returns the wrapped response unchanged on success", async () => {
    const response = await handler(async () => json({ data: "ok" }))(new Request("https://civic.example"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: "ok" });
  });
});