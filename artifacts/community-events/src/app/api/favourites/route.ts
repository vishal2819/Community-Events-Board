import { handler, json, readJson } from "@/lib/http";
import { favouritesSchema } from "@/lib/validations";
import { requireUser, assertOrigin } from "@/lib/auth/session";
import { getFavourites, saveFavourites } from "@/lib/services/visitor";

export const GET = handler(async request => {
  const user = await requireUser(request);
  return json(await getFavourites(user.id));
});
export const PUT = handler(async request => {
  assertOrigin(request);
  const user = await requireUser(request);
  const input = await readJson(request, favouritesSchema);
  return json(await saveFavourites(user.id, input.categories));
});
