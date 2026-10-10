"use client";

import Link from "next/link";
import { Bell, BellRing, CalendarDays, MapPin, Ticket } from "lucide-react";
import type { Event as CivicEvent } from "@workspace/api-client-react";
import { CATEGORY_BADGE, categoryLabel, formatPrice, formatWhen, isPast } from "./civic-lib";
import type { ReminderController } from "./use-reminder-toggle";
import { cn } from "@/lib/utils";

export function EventImage({ event, className }: { event: CivicEvent; className?: string }) {
  return (
    <div className={cn("relative w-full overflow-hidden bg-surface-container", className)}>
      {event.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.imageUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="size-full flex items-center justify-center bg-gradient-to-br from-primary-fixed via-surface-container to-tertiary-fixed text-primary/60">
          <Ticket className="size-10" aria-hidden />
        </div>
      )}
    </div>
  );
}

export function EventCard({ event, reminders }: { event: CivicEvent; reminders: ReminderController }) {
  const on = reminders.isSet(event);
  const busy = reminders.isPending(event.id);
  const free = formatPrice(event.price) === "Free";
  return (
    <article data-testid={`card-event-${event.id}`} className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-surface-highest/70">
      <div className="relative">
        <Link href={`/events/${event.id}`} tabIndex={-1} aria-hidden>
          <EventImage event={event} className="aspect-[16/10]" />
        </Link>
        <span className={cn("absolute top-3 left-3 px-3 py-0.5 rounded-full text-xs font-semibold shadow-sm", CATEGORY_BADGE[event.category])}>
          {categoryLabel(event.category)}
        </span>
        <button
          type="button"
          onClick={() => reminders.toggle(event)}
          disabled={busy}
          aria-pressed={on}
          aria-label={`${on ? "Remove reminder for" : "Remind me about"} ${event.title}`}
          data-testid={`button-reminder-${event.id}`}
          className={cn(
            "absolute top-3 right-3 size-10 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            on ? "bg-primary text-white" : "bg-white/90 text-foreground hover:text-primary",
          )}
        >
          {on ? <BellRing className="size-[18px]" aria-hidden /> : <Bell className="size-[18px]" aria-hidden />}
        </button>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
          <CalendarDays className="size-4" aria-hidden />
          <time dateTime={event.startsAt}>{formatWhen(event.startsAt)}</time>
          {isPast(event) && <span className="ml-1 rounded-full bg-surface-high px-2 py-0.5 text-on-surface-variant">Ended</span>}
        </div>
        <h3 className="text-lg font-bold tracking-tight line-clamp-2 mt-0.5">
          <Link href={`/events/${event.id}`} className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline">
            {event.title}
          </Link>
        </h3>
        <p className="flex items-center gap-1 text-xs text-on-surface-variant">
          <MapPin className="size-4 text-outline" aria-hidden /> {event.city}
        </p>
      </div>
      <div className="bg-surface-low/70 border-t border-surface-highest/60 px-4 py-3 flex items-center justify-between">
        <span className={cn("text-base font-bold", free && "text-tertiary")}>{formatPrice(event.price)}</span>
        <Link href={`/events/${event.id}`} className="btn btn-soft btn-sm">
          Details & card
        </Link>
      </div>
    </article>
  );
}

export function EventGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading events">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-white rounded-xl overflow-hidden border border-surface-highest">
          <div className="sk aspect-[16/10] rounded-none" />
          <div className="p-4 flex flex-col gap-3">
            <div className="sk h-4 w-1/3" />
            <div className="sk h-6 w-3/4" />
            <div className="sk h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Pager({ page, totalPages, onPage, label }: { page: number; totalPages: number; onPage: (p: number) => void; label: string }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-low p-4 rounded-xl border border-surface-highest/60">
      <span className="text-xs text-on-surface-variant">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-soft btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <span className="text-xs font-semibold px-2" aria-current="page">
          Page {page} of {totalPages}
        </span>
        <button type="button" className="btn btn-soft btn-sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </nav>
  );
}
