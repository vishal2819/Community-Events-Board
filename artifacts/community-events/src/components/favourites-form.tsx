"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { useGetFavourites, useSaveFavourites, getGetFavouritesQueryKey, getGetFeedQueryKey, type Category } from "@workspace/api-client-react";
import { CATEGORIES } from "./civic-lib";
import { FormAlert } from "./field";
import { errorMessage } from "./civic-lib";
import { cn } from "@/lib/utils";

export function FavouritesForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const fav = useGetFavourites();
  const save = useSaveFavourites();
  const [picked, setPicked] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initial = useRef(false);
  if (fav.data && !initial.current) { initial.current = true; if (picked === null) setPicked(fav.data.categories); }
  const current = picked ?? [];

  const toggle = (c: Category) => setPicked(current.includes(c) ? current.filter((x) => x !== c) : [...current, c]);

  const onSave = () => {
    setError(null);
    save.mutate({ data: { categories: current } }, {
      onSuccess: (res) => {
        qc.setQueryData(getGetFavouritesQueryKey(), res);
        qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
        router.push("/feed");
      },
      onError: (e) => setError(errorMessage(e)),
    });
  };

  return (
    <section className="px-4 md:px-8 pb-12">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        {fav.isError && <FormAlert message="Could not load your saved categories." onRetry={() => fav.refetch()} />}
        {error && <FormAlert message={error} />}
        <div role="group" aria-label="Favourite categories" className="grid sm:grid-cols-2 gap-4">
          {fav.isLoading
            ? CATEGORIES.map((c) => <div key={c.key} className="sk h-28 rounded-xl" />)
            : CATEGORIES.map((c) => {
                const on = current.includes(c.key);
                return (
                  <button key={c.key} type="button" aria-pressed={on} onClick={() => toggle(c.key)} data-testid={`toggle-category-${c.key}`}
                    className={cn("text-left rounded-xl border p-5 transition-all cursor-pointer flex gap-3 items-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      on ? "bg-primary-fixed border-primary shadow-sm" : "bg-white border-surface-highest hover:bg-surface-low")}>
                    <span className={cn("size-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5", on ? "bg-primary border-primary text-white" : "border-outline")}>
                      {on && <Check className="size-4" aria-hidden />}
                    </span>
                    <span>
                      <span className="block font-bold text-lg">{c.label}</span>
                      <span className="block text-sm text-on-surface-variant mt-0.5">{c.blurb}</span>
                    </span>
                  </button>
                );
              })}
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
          <button type="button" className="btn btn-ghost" onClick={() => router.push("/feed")}>Skip for now</button>
          <button type="button" className="btn btn-primary h-11" onClick={onSave} disabled={save.isPending || fav.isLoading} data-testid="button-save-favourites">
            {save.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />} Save {current.length} {current.length === 1 ? "category" : "categories"}
          </button>
        </div>
      </div>
    </section>
  );
}
