import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

export type SafeUser = { id: string; email: string; role: "USER" | "ADMIN" };
export const SESSION_SECONDS = 60 * 60 * 8;
const ISSUER = "civic-community-events";
const AUDIENCE = "civic-clients";
function key() {
  const secret = process.env.JWT_SECRET ??
    (process.env.NODE_ENV === "development" ? process.env.SESSION_SECRET : undefined);
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 random bytes");
  }
  return new TextEncoder().encode(secret);
}
const claims = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["USER", "ADMIN"]),
});
export function signToken(user: SafeUser, expires = SESSION_SECONDS) {
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id).setIssuer(ISSUER).setAudience(AUDIENCE)
    .setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1000) + expires).sign(key());
}
export async function verifyToken(token: string): Promise<SafeUser> {
  const { payload, protectedHeader } = await jwtVerify(token, key(), {
    algorithms: ["HS256"], issuer: ISSUER, audience: AUDIENCE,
    requiredClaims: ["sub", "email", "role", "iat", "exp"],
  });
  if (protectedHeader.typ !== "JWT") throw new Error("Invalid token type");
  const parsed = claims.parse(payload);
  if (parsed.role === "USER" && !z.string().uuid().safeParse(parsed.sub).success) throw new Error("Invalid subject");
  if (parsed.role === "ADMIN" && parsed.sub !== "admin") throw new Error("Invalid admin subject");
  return { id: parsed.sub, email: parsed.email, role: parsed.role };
}
