"use client";

import Link from "next/link";
import { ArrowLeft, Bell, BellRing, CalendarDays, MapPin, Loader2, SearchX } from "lucide-react";
import { useGetEvent, useGetMe } from "@workspace/api-client-react";
import { CATEGORY_BADGE, categoryLabel, formatPrice, formatWhen, isPast, errorStatus } from "./civic-lib";
import { EventImage } from "./event-card";
import { CardDesigner } from "./card-designer";
import { EmptyState, FormAlert } from "./field";
import { useReminderToggle } from "./use-reminder-toggle";
import { cn } from "@/lib/utils";

export function EventDetail({ id }: { id: string }) {
  const q = useGetEvent(id);
  const me = useGetMe();
  const reminders = useReminderToggle();
  const event = q.data?.data;

  return (
    <div className="px-4 md:px-8 py-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-foreground self-start">
          <ArrowLeft className="size-4" aria-hidden /> All events
        </Link>
        {q.isLoading ? (
          <div aria-busy="true" className="flex flex-col gap-4">
            <div className="sk aspect-[21/9] rounded-2xl" /><div className="sk h-10 w-2/3" /><div className="sk h-24 w-full" />
          </div>
        ) : q.isError || !event ? (
          errorStatus(q.error) === 404 ? (
            <EmptyState icon={<SearchX className="size-8" />} title="That event is gone" body="It may have been removed or never existed.">
              <Link href="/" className="btn btn-primary">Back to discovery</Link>
            </EmptyState>
          ) : <FormAlert message="We could not load this event." onRetry={() => q.refetch()} />
        ) : (
          <>
            <article className="surface overflow-hidden">
              <EventImage event={event} className="aspect-[21/9] max-h-96" />
              <div className="p-5 md:p-8 flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("px-3 py-0.5 rounded-full text-xs font-semibold", CATEGORY_BADGE[event.category])}>{categoryLabel(event.category)}</span>
                  {isPast(event) && <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-surface-high text-on-surface-variant">Ended</span>}
                  {!event.isActive && <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-error-container text-[#93000a]">Inactive</span>}
                </div>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{event.title}</h1>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-on-surface-variant">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 text-primary" aria-hidden /><time dateTime={event.startsAt}>{formatWhen(event.startsAt, true)} IST</time></span>
                  <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-primary" aria-hidden />{event.city}</span>
                  <span className="font-bold text-foreground">{formatPrice(event.price)}</span>
                </div>
                <p className="whitespace-pre-line text-base leading-relaxed max-w-3xl">{event.description}</p>
                <div>
                  {me.data?.data ? (
                    <button type="button" onClick={() => reminders.toggle(event)} disabled={reminders.isPending(event.id)} aria-pressed={reminders.isSet(event)}
                      className={cn("btn", reminders.isSet(event) ? "btn-primary" : "btn-soft")} data-testid="button-reminder-detail">
                      {reminders.isPending(event.id) ? <Loader2 className="size-4 animate-spin" aria-hidden /> : reminders.isSet(event) ? <BellRing className="size-4" aria-hidden /> : <Bell className="size-4" aria-hidden />}
                      {reminders.isSet(event) ? "Reminder on" : "Remind me"}
                    </button>
                  ) : (
                    <Link href={`/login?next=/events/${event.id}`} className="btn btn-soft"><Bell className="size-4" aria-hidden /> Sign in to set a reminder</Link>
                  )}
                </div>
              </div>
            </article>
            {!me.isLoading && <CardDesigner event={event} signedIn={!!me.data?.data} />}
          </>
        )}
      </div>
    </div>
  );
}
