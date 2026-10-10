import "server-only";
import { Prisma, type Category } from "@prisma/client";
import { db } from "@/lib/db";
import { eligibleEvent, eventDto } from "./events";
import { cardDesignSchema } from "@/lib/validations";
import type { z } from "zod";

export async function getFavourites(userId: string) {
  const favourites = await db.favouriteCategory.findMany({ where: { userId }, orderBy: { category: "asc" } });
  return { categories: favourites.map(item => item.category) };
}
export async function saveFavourites(userId: string, categories: Category[]) {
  await db.$transaction([
    db.favouriteCategory.deleteMany({ where: { userId } }),
    db.favouriteCategory.createMany({ data: categories.map(category => ({ userId, category })), skipDuplicates: true }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return { categories };
}
export async function getReminders(userId: string) {
  const reminders = await db.eventReminder.findMany({
    where: { userId, event: { isActive: true, startsAt: { gt: new Date() } } },
    include: { event: true }, orderBy: [{ event: { startsAt: "asc" } }, { eventId: "asc" }],
  });
  return { data: reminders.map(item => eventDto(item.event, true)) };
}
export async function setReminder(userId: string, eventId: string, saved: boolean) {
  if (saved) {
    await eligibleEvent(eventId);
    await db.eventReminder.upsert({ where: { userId_eventId: { userId, eventId } }, create: { userId, eventId }, update: {} });
  } else {
    // Removing even an archived event reminder is deliberately idempotent.
    await db.eventReminder.deleteMany({ where: { userId, eventId } });
  }
  return { eventId, hasReminder: saved };
}
export async function getDesign(userId: string, eventId: string) {
  await eligibleEvent(eventId);
  const design = await db.eventCardDesign.findUnique({ where: { userId_eventId: { userId, eventId } } });
  return { eventId, theme: design?.theme ?? "warm-atelier", stickers: design?.stickers ?? [], updatedAt: design?.updatedAt.toISOString() ?? null };
}
export async function saveDesign(userId: string, eventId: string, input: z.infer<typeof cardDesignSchema>) {
  await eligibleEvent(eventId);
  const design = await db.eventCardDesign.upsert({ where: { userId_eventId: { userId, eventId } }, create: { userId, eventId, ...input }, update: input });
  return { eventId, theme: design.theme, stickers: design.stickers, updatedAt: design.updatedAt.toISOString() };
}
