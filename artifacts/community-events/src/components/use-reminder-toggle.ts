"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSaveReminder,
  useRemoveReminder,
  getGetRemindersQueryKey,
  getGetFeedQueryKey,
  getListEventsQueryKey,
  getGetEventQueryKey,
  type Event as CivicEvent,
} from "@workspace/api-client-react";
import { toast } from "@/hooks/use-toast";
import { errorMessage, errorStatus } from "./civic-lib";

/** Optimistic per-event reminder toggling with rollback and server reconciliation. */
export function useReminderToggle() {
  const qc = useQueryClient();
  const save = useSaveReminder();
  const remove = useRemoveReminder();
  const saveRef = useRef(save.mutateAsync);
  const removeRef = useRef(remove.mutateAsync);

  useEffect(() => {
    saveRef.current = save.mutateAsync;
  }, [save.mutateAsync]);

  useEffect(() => {
    removeRef.current = remove.mutateAsync;
  }, [remove.mutateAsync]);

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const inflight = useRef<Set<string>>(new Set());

  const isSet = useCallback((e: Pick<CivicEvent, "id" | "hasReminder">) => overrides[e.id] ?? e.hasReminder, [overrides]);
  const isPending = useCallback((id: string) => !!pending[id], [pending]);

  const drop = (id: string) =>
    setOverrides((o) => {
      const { [id]: _removed, ...rest } = o;
      void _removed;
      return rest;
    });

  const toggle = useCallback(
    async (e: Pick<CivicEvent, "id" | "hasReminder" | "title">) => {
      const id = e.id;
      if (inflight.current.has(id)) return;
      inflight.current.add(id);
      const next = !(overrides[id] ?? e.hasReminder);
      setOverrides((o) => ({ ...o, [id]: next }));
      setPending((p) => ({ ...p, [id]: true }));
      try {
        const res = next ? await saveRef.current({ id }) : await removeRef.current({ id });
        setOverrides((o) => ({ ...o, [id]: res.hasReminder }));
        await Promise.all([
          qc.invalidateQueries({ queryKey: getGetRemindersQueryKey() }),
          qc.invalidateQueries({ queryKey: getGetFeedQueryKey() }),
          qc.invalidateQueries({ queryKey: getListEventsQueryKey() }),
          qc.invalidateQueries({ queryKey: getGetEventQueryKey(id) }),
        ]);
        drop(id);
      } catch (err) {
        drop(id);
        toast({
          variant: "destructive",
          title: errorStatus(err) === 401 ? "Sign in to set reminders" : "Reminder not updated",
          description: errorStatus(err) === 401 ? "Reminders belong to your account." : errorMessage(err),
        });
      } finally {
        inflight.current.delete(id);
        setPending((p) => {
          const { [id]: _r, ...rest } = p;
          void _r;
          return rest;
        });
      }
    },
    [overrides, qc],
  );

  return { isSet, isPending, toggle };
}

export type ReminderController = ReturnType<typeof useReminderToggle>;
