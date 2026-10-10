import { handler, json, readJson } from "@/lib/http";
import { credentialsSchema } from "@/lib/validations";
import { assertOrigin, COOKIE_NAME } from "@/lib/auth/session";
import { limitAuth } from "@/lib/auth/rate-limit";
import { signToken, SESSION_SECONDS } from "@/lib/auth/jwt";
import { register } from "@/lib/services/auth";

export const POST = handler(async request => {
  assertOrigin(request);
  const input = await readJson(request, credentialsSchema);
  limitAuth(request, input.email);
  const user = await register(input.email, input.password);
  const token = await signToken(user);
  const response = json({ data: { user, token } }, 201);
  response.cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS });
  return response;
});
