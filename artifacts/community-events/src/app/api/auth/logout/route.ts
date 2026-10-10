import { handler, json } from "@/lib/http";
import { assertOrigin, COOKIE_NAME } from "@/lib/auth/session";

export const POST = handler(async request => {
  assertOrigin(request);
  const response = json({ data: { message: "Signed out." } });
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
});
