import { beforeEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { signToken, verifyToken, SESSION_SECONDS } from "@/lib/auth/jwt";

const SECRET = "test-secret-that-is-at-least-32-bytes-long!!";
const VISITOR = { id: "3f1b7a52-9d3e-4a51-8f7c-1b2d3e4f5a6b", email: "visitor@example.com", role: "USER" } as const;

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
});

interface Claims {
  sub?: string;
  email?: string;
  role?: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
}

function decode(token: string): Claims {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) as Claims;
}

describe("signToken and verifyToken", () => {
  it("round-trips a visitor identity", async () => {
    await expect(verifyToken(await signToken(VISITOR))).resolves.toEqual(VISITOR);
  });

  it("round-trips an admin identity", async () => {
    const admin = { id: "admin", email: "admin@example.com", role: "ADMIN" } as const;
    await expect(verifyToken(await signToken(admin))).resolves.toEqual(admin);
  });

  it("never returns a password hash or any secret", async () => {
    const identity = await verifyToken(await signToken(VISITOR));
    expect(Object.keys(identity).sort()).toEqual(["email", "id", "role"]);
  });

  it("sets the documented session lifetime", async () => {
    const payload = decode(await signToken(VISITOR));
    expect(payload.exp! - payload.iat!).toBe(SESSION_SECONDS);
  });

  it("pins the algorithm, issuer and audience in the header and payload", async () => {
    const token = await signToken(VISITOR);
    const header = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString()) as Record<string, unknown>;
    expect(header.alg).toBe("HS256");
    expect(header.typ).toBe("JWT");
    const payload = decode(token);
    expect(payload.iss).toBe("civic-community-events");
    expect(payload.aud).toBe("civic-clients");
  });
});

describe("verifyToken rejection paths", () => {
  it("rejects a token signed with a different secret", async () => {
    const foreign = await new SignJWT({ email: VISITOR.email, role: VISITOR.role })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(VISITOR.id)
      .setIssuer("civic-community-events")
      .setAudience("civic-clients")
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 60)
      .sign(new TextEncoder().encode("a-completely-different-secret-of-32b"));
    await expect(verifyToken(foreign)).rejects.toThrow();
  });

  it("rejects a tampered payload", async () => {
    const token = await signToken(VISITOR);
    const [header, payload, signature] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString()) as Record<string, unknown>;
    decoded.role = "ADMIN";
    const forged = Buffer.from(JSON.stringify(decoded)).toString("base64url");
    await expect(verifyToken(`${header}.${forged}.${signature}`)).rejects.toThrow();
  });

  it("rejects an unsigned token claiming alg none", async () => {
    // Constructed by hand: jose refuses to sign with "none", but an attacker
    // can still send one, so the verifier must not honour it.
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const header = encode({ alg: "none", typ: "JWT" });
    const payload = encode({
      sub: VISITOR.id,
      email: VISITOR.email,
      role: "USER",
      iss: "civic-community-events",
      aud: "civic-clients",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    await expect(verifyToken(`${header}.${payload}.`)).rejects.toThrow();
  });

  it("rejects an HS512 token, proving the algorithm is pinned to HS256", async () => {
    const foreign = await new SignJWT({ email: VISITOR.email, role: VISITOR.role })
      .setProtectedHeader({ alg: "HS512", typ: "JWT" })
      .setSubject(VISITOR.id)
      .setIssuer("civic-community-events")
      .setAudience("civic-clients")
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 60)
      .sign(new TextEncoder().encode(SECRET));
    await expect(verifyToken(foreign)).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const expired = await signToken(VISITOR, -60);
    await expect(verifyToken(expired)).rejects.toThrow();
  });

  it("rejects a token missing the role claim", async () => {
    const token = await new SignJWT({ email: VISITOR.email })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(VISITOR.id)
      .setIssuer("civic-community-events")
      .setAudience("civic-clients")
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 60)
      .sign(new TextEncoder().encode(SECRET));
    await expect(verifyToken(token)).rejects.toThrow();
  });

  it("rejects a user token whose subject is not a UUID", async () => {
    const token = await signToken({ ...VISITOR, id: "not-a-uuid" });
    await expect(verifyToken(token)).rejects.toThrow();
  });

  it("rejects an admin token whose subject is not the admin marker", async () => {
    const token = await signToken({ ...VISITOR, role: "ADMIN" });
    await expect(verifyToken(token)).rejects.toThrow();
  });
});

describe("secret configuration", () => {
  it("refuses to sign with a secret shorter than 32 bytes", () => {
    process.env.JWT_SECRET = "too-short";
    // signToken throws synchronously, so this is not an awaited rejection.
    expect(() => signToken(VISITOR)).toThrow(/32/);
  });

  it("refuses to sign when no secret is configured", () => {
    delete process.env.JWT_SECRET;
    expect(() => signToken(VISITOR)).toThrow(/JWT_SECRET/);
  });

  it("refuses to verify when the secret is too short", async () => {
    const token = await signToken(VISITOR);
    process.env.JWT_SECRET = "short";
    await expect(verifyToken(token)).rejects.toThrow(/32/);
  });
});