import "server-only";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { SafeUser } from "@/lib/auth/jwt";

// Equal-cost comparison on missing accounts, never a usable login credential.
const dummyHash = hashPassword("not-a-login-" + "x".repeat(30));
export async function authenticate(email: string, password: string): Promise<SafeUser> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (adminEmail && adminHash && email === adminEmail) {
    if (!/^\$2[aby]\$(?:1[2-9]|2\d|3[01])\$/.test(adminHash)) throw new ApiError(503, "ADMIN_CONFIG", "Administrator login is not configured correctly.");
    if (await verifyPassword(password, adminHash)) return { id: "admin", email, role: "ADMIN" };
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }
  const user = await db.user.findUnique({ where: { email } });
  const valid = await verifyPassword(password, user?.passwordHash ?? await dummyHash);
  if (!valid || !user) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  return { id: user.id, email: user.email, role: "USER" };
}
export async function register(email: string, password: string): Promise<SafeUser> {
  if (email === process.env.ADMIN_EMAIL?.trim().toLowerCase()) throw new ApiError(409, "SIGNUP_UNAVAILABLE", "Unable to create an account. Try signing in.");
  const user = await db.user.create({ data: { email, passwordHash: await hashPassword(password) }, select: { id: true, email: true } });
  return { ...user, role: "USER" };
}
