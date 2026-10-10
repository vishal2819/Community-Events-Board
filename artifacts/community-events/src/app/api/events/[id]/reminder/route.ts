import { handler, json } from "@/lib/http";
import { idSchema } from "@/lib/validations";
import { requireUser, assertOrigin } from "@/lib/auth/session";
import { setReminder } from "@/lib/services/visitor";

type Context = { params: Promise<{ id: string }> };
async function mutate(request: Request, context: Context, saved: boolean) {
  return handler(async req => {
    assertOrigin(req);
    const user = await requireUser(req);
    return json(await setReminder(user.id, idSchema.parse((await context.params).id), saved));
  })(request);
}
export const PUT = (request: Request, context: Context) => mutate(request, context, true);
export const DELETE = (request: Request, context: Context) => mutate(request, context, false);
