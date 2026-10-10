import "server-only";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { verifyToken, type SafeUser } from "./jwt";

export const COOKIE_NAME = "civic_session";
export function assertAdmin(user: SafeUser | null): asserts user is SafeUser {
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in.");
  if (user.role !== "ADMIN") throw new ApiError(403, "FORBIDDEN", "Administrator access required.");
}
export function assertVisitor(user: SafeUser | null): asserts user is SafeUser {
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in.");
  if (user.role !== "USER") throw new ApiError(403, "FORBIDDEN", "Sign in with a visitor account.");
}
export function cookieToken(header: string | null) {
  return header?.split(";").map(value => value.trim()).find(value => value.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
}
export async function identityFromToken(token: string): Promise<SafeUser> {
  let identity: SafeUser;
  try { identity = await verifyToken(token); }
  catch { throw new ApiError(401, "INVALID_SESSION", "Your session expired. Please sign in again."); }
  if (identity.role === "ADMIN") {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!email || !process.env.ADMIN_PASSWORD_HASH || identity.email !== email) throw new ApiError(401, "INVALID_SESSION", "Please sign in again.");
  } else {
    const user = await db.user.findUnique({ where: { id: identity.id }, select: { id: true, email: true } });
    if (!user || user.email !== identity.email) throw new ApiError(401, "INVALID_SESSION", "Please sign in again.");
  }
  return identity;
}
export async function optionalUser(request: Request): Promise<SafeUser | null> {
  // An explicit bearer credential takes precedence; invalid bearer never falls back to cookies.
  const authorization = request.headers.get("authorization");
  if (authorization !== null) {
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match?.[1]) throw new ApiError(401, "INVALID_SESSION", "Invalid bearer token.");
    return identityFromToken(match[1]);
  }
  const token = cookieToken(request.headers.get("cookie"));
  return token ? identityFromToken(token) : null;
}
export async function requireUser(request: Request) {
  const user = await optionalUser(request); assertVisitor(user); return user;
}
export async function requireAdmin(request: Request) {
  const user = await optionalUser(request); assertAdmin(user); return user;
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const bearer = request.headers.get("authorization") !== null;
  if (!origin) {
    if (!bearer && cookieToken(request.headers.get("cookie"))) throw new ApiError(403, "CSRF", "A same-origin request is required.");
    return; // Non-browser API clients without ambient cookies may omit Origin.
  }
  let supplied: URL;
  try { supplied = new URL(origin); } catch { throw new ApiError(403, "CSRF", "Invalid request origin."); }
  const allowedHost = request.headers.get("host") ?? new URL(request.url).host;
  if (supplied.host !== allowedHost || !["https:", "http:"].includes(supplied.protocol)) {
    throw new ApiError(403, "CSRF", "A same-origin request is required.");
  }
}
