import "server-only";
import { Prisma, type Event } from "@prisma/client";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { querySchema, eventInputSchema, eventUpdateSchema } from "@/lib/validations";
import type { z } from "zod";

export type EventQuery = z.infer<typeof querySchema>;
export function publicWhere(query: EventQuery, now: Date, categories?: Prisma.EnumCategoryFilter["in"]): Prisma.EventWhereInput {
  return {
    isActive: true, startsAt: { gt: now },
    ...(query.category ? { category: query.category } : categories ? { category: { in: categories } } : {}),
    ...(query.city ? { city: { equals: query.city, mode: "insensitive" } } : {}),
    ...(query.search ? { OR: [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
      { city: { contains: query.search, mode: "insensitive" } },
    ] } : {}),
  };
}
export function eventDto(event: Event, hasReminder = false) {
  return {
    id: event.id, title: event.title, category: event.category, city: event.city,
    startsAt: event.startsAt.toISOString(), price: event.price.toFixed(2),
    description: event.description, imageUrl: event.imageUrl, isActive: event.isActive,
    createdAt: event.createdAt.toISOString(), updatedAt: event.updatedAt.toISOString(), hasReminder,
  };
}
export async function listEvents(query: EventQuery, userId?: string, admin = false, categories?: Prisma.EnumCategoryFilter["in"]) {
  const where = admin ? {} : publicWhere(query, new Date(), categories);
  const [events, total] = await db.$transaction([
    db.event.findMany({ where, orderBy: [{ startsAt: "asc" }, { id: "asc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    db.event.count({ where }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  const reminders = userId ? await db.eventReminder.findMany({ where: { userId, eventId: { in: events.map(event => event.id) } }, select: { eventId: true } }) : [];
  const saved = new Set(reminders.map(reminder => reminder.eventId));
  return { data: events.map(event => eventDto(event, saved.has(event.id))), pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } };
}
export async function eligibleEvent(id: string) {
  const event = await db.event.findFirst({ where: { id, isActive: true, startsAt: { gt: new Date() } } });
  if (!event) throw new ApiError(404, "NOT_FOUND", "This event is unavailable.");
  return event;
}
export async function getEvent(id: string, admin = false, userId?: string) {
  const event = admin ? await db.event.findUnique({ where: { id } }) : await eligibleEvent(id);
  if (!event) throw new ApiError(404, "NOT_FOUND", "Event not found.");
  const reminder = userId ? await db.eventReminder.findUnique({ where: { userId_eventId: { userId, eventId: id } } }) : null;
  return { data: eventDto(event, !!reminder) };
}
export async function createEvent(input: z.infer<typeof eventInputSchema>) {
  const { isActive = true, startsAt, price, ...rest } = input;
  return { data: eventDto(await db.event.create({ data: { ...rest, isActive, startsAt: new Date(startsAt), price: new Prisma.Decimal(price) } })) };
}
export async function updateEvent(id: string, input: z.infer<typeof eventUpdateSchema>) {
  const { updatedAt, startsAt, price, ...fields } = input;
  const data: Prisma.EventUpdateManyMutationInput = {
    ...fields, ...(startsAt ? { startsAt: new Date(startsAt) } : {}),
    ...(price !== undefined ? { price: new Prisma.Decimal(price) } : {}),
  };
  return db.$transaction(async tx => {
    const result = await tx.event.updateMany({ where: { id, ...(updatedAt ? { updatedAt: new Date(updatedAt) } : {}) }, data });
    if (!result.count) {
      if (!await tx.event.findUnique({ where: { id }, select: { id: true } })) throw new ApiError(404, "NOT_FOUND", "Event not found.");
      throw new ApiError(409, "STALE_EVENT", "This event changed. Reload before editing.");
    }
    const event = await tx.event.findUniqueOrThrow({ where: { id } });
    return { data: eventDto(event) };
  });
}
export async function eventMeta() {
  const where: Prisma.EventWhereInput = { isActive: true, startsAt: { gt: new Date() } };
  const [cities, categories, total] = await db.$transaction([
    db.event.findMany({ where, distinct: ["city"], select: { city: true }, orderBy: { city: "asc" } }),
    db.event.groupBy({ by: ["category"], where, _count: true, orderBy: { category: "asc" } }),
    db.event.count({ where }),
  ]);
  return { data: { cities: cities.map(item => item.city), categories: categories.map(item => ({ category: item.category, count: item._count })), total } };
}
