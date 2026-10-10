"use client";

import { useState } from "react";
import Link from "next/link";
import { BellRing, Sparkles } from "lucide-react";
import { useGetFeed, useGetReminders } from "@workspace/api-client-react";
import { EventCard, EventGridSkeleton, Pager } from "./event-card";
import { EmptyState, FormAlert } from "./field";
import { useReminderToggle } from "./use-reminder-toggle";
import { cn } from "@/lib/utils";

export function FeedView() {
  const [tab, setTab] = useState<"feed" | "reminders">("feed");
  const [page, setPage] = useState(1);
  const reminders = useReminderToggle();
  const feed = useGetFeed({ page, pageSize: 9 });
  const rem = useGetReminders();

  const tabs = [
    { key: "feed" as const, label: "For you", icon: Sparkles },
    { key: "reminders" as const, label: `Reminders${rem.data ? ` (${rem.data.data.length})` : ""}`, icon: BellRing },
  ];

  return (
    <section className="px-4 md:px-8 pb-12">
      <div className="max-w-7xl mx-auto flex flex-col gap-5">
        <div role="tablist" aria-label="Feed views" className="inline-flex self-start p-1 rounded-xl bg-surface-container border border-surface-highest">
          {tabs.map((t) => (
            <button key={t.key} role="tab" type="button" aria-selected={tab === t.key} onClick={() => setTab(t.key)} data-testid={`tab-${t.key}`}
              className={cn("px-4 h-9 rounded-lg text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors", tab === t.key ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-foreground")}>
              <t.icon className="size-4" aria-hidden /> {t.label}
            </button>
          ))}
        </div>

        {tab === "feed" ? (
          feed.isLoading ? <EventGridSkeleton /> :
          feed.isError ? <FormAlert message="We could not load your feed." onRetry={() => feed.refetch()} /> :
          feed.data && feed.data.data.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {feed.data.data.map((e) => <EventCard key={e.id} event={e} reminders={reminders} />)}
              </div>
              <Pager page={feed.data.pagination.page} totalPages={feed.data.pagination.totalPages} onPage={setPage} label={`${feed.data.pagination.total} picked for you`} />
            </>
          ) : (
            <EmptyState icon={<Sparkles className="size-8" />} title="Nothing here yet" body="Choose your favourite categories and we will fill this feed with events you will like.">
              <Link href="/onboarding/favourites" className="btn btn-primary">Choose favourites</Link>
              <Link href="/" className="btn btn-soft">Browse everything</Link>
            </EmptyState>
          )
        ) : rem.isLoading ? <EventGridSkeleton count={3} /> :
          rem.isError ? <FormAlert message="We could not load your reminders." onRetry={() => rem.refetch()} /> :
          rem.data && rem.data.data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rem.data.data.map((e) => <EventCard key={e.id} event={e} reminders={reminders} />)}
            </div>
          ) : (
            <EmptyState icon={<BellRing className="size-8" />} title="No reminders set" body="Tap the bell on any event and it will wait for you here.">
              <Link href="/" className="btn btn-primary">Discover events</Link>
            </EmptyState>
          )}
      </div>
    </section>
  );
}
