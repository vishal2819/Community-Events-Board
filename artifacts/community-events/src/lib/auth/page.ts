import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, identityFromToken } from "./session";
import type { SafeUser } from "./jwt";

async function pageIdentity(): Promise<SafeUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { return await identityFromToken(token); } catch { return null; }
}
export async function requirePageUser() {
  const user = await pageIdentity();
  if (!user) redirect("/login");
  if (user.role !== "USER") redirect("/admin/events");
  return user;
}
export async function requirePageAdmin() {
  const user = await pageIdentity();
  if (!user || user.role !== "ADMIN") redirect("/admin/login");
  return user;
}
