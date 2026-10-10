import { handler, json } from "@/lib/http";
import { querySchema } from "@/lib/validations";
import { requireUser } from "@/lib/auth/session";
import { listEvents } from "@/lib/services/events";
import { getFavourites } from "@/lib/services/visitor";

export const GET = handler(async request => {
  const user = await requireUser(request);
  const query = querySchema.pick({ page: true, pageSize: true }).parse(Object.fromEntries(new URL(request.url).searchParams));
  const favourites = await getFavourites(user.id);
  return json(await listEvents(query, user.id, false, favourites.categories));
});
