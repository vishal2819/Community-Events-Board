import { handler, json } from "@/lib/http";
import { querySchema } from "@/lib/validations";
import { optionalUser } from "@/lib/auth/session";
import { listEvents } from "@/lib/services/events";

export const GET = handler(async request => {
  const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const user = await optionalUser(request);
  return json(await listEvents(query, user?.role === "USER" ? user.id : undefined));
});
