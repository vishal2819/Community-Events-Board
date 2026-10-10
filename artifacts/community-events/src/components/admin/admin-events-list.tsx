"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Power, CalendarX2 } from "lucide-react";
import {
  useListAdminEvents, useUpdateEvent, getListAdminEventsQueryKey, getListEventsQueryKey, getGetEventQueryKey, getGetEventMetaQueryKey, type Event as CivicEvent,
} from "@workspace/api-client-react";
import { toast } from "@/hooks/use-toast";
import { categoryLabel, errorMessage, formatPrice, formatWhen, isPast } from "../civic-lib";
import { EmptyState, FormAlert } from "../field";
import { Pager } from "../event-card";
import { cn } from "@/lib/utils";

export function AdminEventsList() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const q = useListAdminEvents({ page, pageSize: 12 });
  const update = useUpdateEvent();
  const [busy, setBusy] = useState<string | null>(null);

  const flip = (e: CivicEvent) => {
    setBusy(e.id);
    update.mutate({ id: e.id, data: { isActive: !e.isActive, updatedAt: e.updatedAt } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAdminEventsQueryKey() });
        qc.invalidateQueries({ queryKey: getListEventsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetEventMetaQueryKey() });
        qc.invalidateQueries({ queryKey: getGetEventQueryKey(e.id) });
      },
      onError: (err) => toast({ variant: "destructive", title: "Could not update event", description: errorMessage(err) }),
      onSettled: () => setBusy(null),
    });
  };

  return (
    <section className="px-4 md:px-8 pb-12">
      <div className="max-w-7xl mx-auto flex flex-col gap-5">
        <div className="flex justify-end">
          <Link href="/admin/events/new" className="btn btn-primary" data-testid="link-new-event"><Plus className="size-4" aria-hidden /> New event</Link>
        </div>
        {q.isLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="sk h-16" />)}</div>
        ) : q.isError ? (
          <FormAlert message="Could not load events." onRetry={() => q.refetch()} />
        ) : q.data && q.data.data.length > 0 ? (
          <>
            <div className="surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="bg-surface-low text-left text-xs uppercase tracking-wide text-on-surface-variant">
                    <tr><th className="p-3">Event</th><th className="p-3">When (IST)</th><th className="p-3">Price</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-surface-highest/70">
                    {q.data.data.map((e) => (
                      <tr key={e.id} data-testid={`row-event-${e.id}`} className="hover:bg-surface-low/50">
                        <td className="p-3">
                          <Link href={`/events/${e.id}`} className="font-semibold hover:text-primary">{e.title}</Link>
                          <div className="text-xs text-on-surface-variant">{categoryLabel(e.category)} / {e.city}</div>
                        </td>
                        <td className="p-3 whitespace-nowrap">{formatWhen(e.startsAt)}</td>
                        <td className="p-3">{formatPrice(e.price)}</td>
                        <td className="p-3">
                          <div className="flex gap-1.5 flex-wrap">
                            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", e.isActive ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-error-container text-[#93000a]")}>{e.isActive ? "Active" : "Inactive"}</span>
                            {isPast(e) && <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-surface-high text-on-surface-variant">Past</span>}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <button type="button" className="btn btn-soft btn-sm" disabled={busy === e.id} onClick={() => flip(e)} aria-label={`${e.isActive ? "Deactivate" : "Activate"} ${e.title}`}>
                              <Power className="size-3.5" aria-hidden /> {e.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <Link href={`/admin/events/${e.id}/edit`} className="btn btn-primary btn-sm" aria-label={`Edit ${e.title}`}><Pencil className="size-3.5" aria-hidden /> Edit</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <Pager page={q.data.pagination.page} totalPages={q.data.pagination.totalPages} onPage={setPage} label={`${q.data.pagination.total} events including inactive and past`} />
          </>
        ) : (
          <EmptyState icon={<CalendarX2 className="size-8" />} title="No events yet" body="Publish the first event to start the board.">
            <Link href="/admin/events/new" className="btn btn-primary">Create event</Link>
          </EmptyState>
        )}
      </div>
    </section>
  );
}
