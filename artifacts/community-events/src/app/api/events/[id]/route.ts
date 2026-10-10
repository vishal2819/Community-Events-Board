import { handler, json } from "@/lib/http";
import { idSchema } from "@/lib/validations";
import { optionalUser } from "@/lib/auth/session";
import { getEvent } from "@/lib/services/events";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handler(async req => {
    const id = idSchema.parse((await context.params).id);
    const user = await optionalUser(req);
    return json(await getEvent(id, false, user?.role === "USER" ? user.id : undefined));
  })(request);
}
