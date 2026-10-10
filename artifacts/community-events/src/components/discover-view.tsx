"use client";

import { useEffect, useRef, useState } from "react";
import { Search, MapPin, X, CalendarX2, RotateCcw } from "lucide-react";
import { useListEvents, useGetEventMeta, type Category, type ListEventsParams } from "@workspace/api-client-react";
import { CATEGORIES } from "./civic-lib";
import { EventCard, EventGridSkeleton, Pager } from "./event-card";
import { EmptyState, FormAlert } from "./field";
import { useReminderToggle } from "./use-reminder-toggle";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 9;

export function DiscoverView() {
  const [category, setCategory] = useState<Category | "">("");
  const [city, setCity] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reminders = useReminderToggle();

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onSearch = (v: string) => {
    setSearchInput(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSearch(v.trim()); setPage(1); }, 350);
  };

  const params: ListEventsParams = { page, pageSize: PAGE_SIZE };
  if (category) params.category = category;
  if (city) params.city = city;
  if (search) params.search = search;

  const meta = useGetEventMeta();
  const list = useListEvents(params);
  const counts = new Map(meta.data?.data.categories.map((c) => [c.category, c.count]));
  const cities = meta.data?.data.cities ?? [];
  const filtered = !!(category || city || search);

  const reset = () => { setCategory(""); setCity(""); setSearchInput(""); setSearch(""); setPage(1); };
  const pick = (c: Category | "") => { setCategory(c); setPage(1); };

  return (
    <section className="px-4 md:px-8 pb-12">
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-surface-highest/80 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="size-5 absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" aria-hidden />
            <input type="search" aria-label="Search events" value={searchInput} onChange={(e) => onSearch(e.target.value)}
              placeholder="Search events by title, venue or description" className="field-input h-10 pl-10 pr-10" data-testid="input-search" />
            {searchInput && (
              <button type="button" aria-label="Clear search" onClick={() => { onSearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-foreground cursor-pointer">
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="relative lg:w-60">
            <MapPin className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" aria-hidden />
            <select aria-label="City" value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }} className="field-input h-10 pl-9" data-testid="select-city">
              <option value="">All cities</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div role="group" aria-label="Category" className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {[{ key: "" as const, label: "All", count: meta.data?.data.total }, ...CATEGORIES.map((c) => ({ key: c.key, label: c.label, count: counts.get(c.key) }))].map((c) => (
              <button key={c.key} type="button" aria-pressed={category === c.key} onClick={() => pick(c.key)}
                className={cn("chip shadow-sm", category === c.key ? "bg-primary text-white border-primary" : "bg-surface-low text-on-surface-variant border-surface-highest/60 hover:bg-surface-container hover:text-foreground")}>
                {c.label}{c.count !== undefined ? ` (${c.count})` : ""}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between md:justify-end gap-4 text-sm text-on-surface-variant" aria-live="polite">
            {list.data && <span><strong className="text-foreground">{list.data.pagination.total}</strong> events</span>}
            {filtered && (
              <button type="button" onClick={reset} className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer">
                <RotateCcw className="size-3.5" aria-hidden /> Reset filters
              </button>
            )}
          </div>
        </div>

        {list.isLoading ? (
          <EventGridSkeleton />
        ) : list.isError ? (
          <FormAlert message="We could not load events right now." onRetry={() => list.refetch()} />
        ) : list.data && list.data.data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {list.data.data.map((e) => <EventCard key={e.id} event={e} reminders={reminders} />)}
            </div>
            <Pager page={list.data.pagination.page} totalPages={list.data.pagination.totalPages} onPage={setPage}
              label={`${list.data.pagination.total} results, ${PAGE_SIZE} per page`} />
          </>
        ) : (
          <EmptyState icon={<CalendarX2 className="size-8" />} title="No events match that" body="Try a wider search, a different category, or clear your filters.">
            {filtered && <button type="button" onClick={reset} className="btn btn-primary">Clear all filters</button>}
          </EmptyState>
        )}
      </div>
    </section>
  );
}
