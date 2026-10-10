"use client";

import { useGetAdminEvent, getGetAdminEventQueryKey } from "@workspace/api-client-react";
import { EventForm } from "./event-form";
import { FormAlert } from "../field";

export function AdminEventEditor({ id }: { id: string }) {
  const q = useGetAdminEvent(id, { query: { enabled: !!id, queryKey: getGetAdminEventQueryKey(id) } });
  return (
    <section className="px-4 md:px-8 pb-12">
      <div className="max-w-7xl mx-auto">
        {q.isLoading ? (
          <div className="sk h-96 max-w-4xl" aria-busy="true" />
        ) : q.isError || !q.data ? (
          <FormAlert message="Could not load this event." onRetry={() => q.refetch()} />
        ) : (
          <EventForm event={q.data.data} />
        )}
      </div>
    </section>
  );
}
