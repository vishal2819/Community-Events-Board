"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw, Save, Check } from "lucide-react";
import { useGetCardDesign, useSaveCardDesign, getGetCardDesignQueryKey, type Event as CivicEvent, type Sticker, type Theme } from "@workspace/api-client-react";
import { FormAlert } from "./field";
import { StickerGlyph, STICKERS, THEMES } from "./stickers";
import { categoryLabel, errorMessage, formatPrice, formatWhen } from "./civic-lib";
import { cn } from "@/lib/utils";

const SLOTS = [
  "top-3 right-3 rotate-12 size-14",
  "bottom-16 right-6 -rotate-6 size-12",
  "top-1/2 right-24 rotate-[18deg] size-10",
];

export function CardPreview({ event, theme, stickers }: { event: CivicEvent; theme: Theme; stickers: Sticker[] }) {
  const t = THEMES.find((x) => x.key === theme) ?? THEMES[0];
  return (
    <div data-testid="card-preview" data-theme-key={theme} className="relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] w-full max-w-sm mx-auto rounded-3xl p-6 flex flex-col justify-between overflow-hidden shadow-xl transition-colors duration-300"
      style={{ background: t.card, color: t.ink }}>
      <div className="absolute inset-3 rounded-2xl border border-dashed opacity-30 pointer-events-none" style={{ borderColor: t.ink }} />
      <p className="relative text-xs font-semibold uppercase tracking-widest" style={{ color: t.accent }}>{categoryLabel(event.category)} / Civic</p>
      <div className="relative pr-10">
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight line-clamp-4">{event.title}</h3>
        <p className="mt-3 text-sm opacity-80">{formatWhen(event.startsAt, true)}</p>
        <p className="text-sm opacity-80">{event.city}</p>
      </div>
      <p className="relative text-lg font-bold">{formatPrice(event.price)}</p>
      {stickers.map((s, i) => (
        <div key={s} className={cn("absolute drop-shadow-md", SLOTS[i])}>
          <StickerGlyph name={s} className="size-full" />
        </div>
      ))}
    </div>
  );
}

export function CardDesigner({ event, signedIn }: { event: CivicEvent; signedIn: boolean }) {
  const qc = useQueryClient();
  const q = useGetCardDesign(event.id, { query: { enabled: signedIn, queryKey: getGetCardDesignQueryKey(event.id) } });
  const save = useSaveCardDesign();
  const [theme, setTheme] = useState<Theme>("warm-atelier");
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [saved, setSaved] = useState<{ theme: Theme; stickers: Sticker[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const initFor = useRef<string | null>(null);

  if (q.data && initFor.current !== event.id) {
    initFor.current = event.id;
    setTheme(q.data.theme);
    setStickers(q.data.stickers);
    setSaved({ theme: q.data.theme, stickers: q.data.stickers });
  }

  if (!signedIn) {
    return (
      <div className="surface p-6 flex flex-col gap-3">
        <h2 className="text-xl font-bold">Make your event card</h2>
        <p className="text-sm text-on-surface-variant">Sign in to design a personal card for this event and save it.</p>
        <Link href={`/login?next=/events/${event.id}`} className="btn btn-primary self-start">Sign in to design</Link>
      </div>
    );
  }

  const dirty = !saved || saved.theme !== theme || saved.stickers.join() !== stickers.join();
  const toggleSticker = (s: Sticker) => {
    setJustSaved(false);
    setStickers((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : cur.length >= 3 ? cur : [...cur, s]));
  };

  const onSave = () => {
    setError(null);
    save.mutate({ id: event.id, data: { theme, stickers } }, {
      onSuccess: (res) => {
        qc.setQueryData(getGetCardDesignQueryKey(event.id), res);
        setSaved({ theme: res.theme, stickers: res.stickers });
        setJustSaved(true);
      },
      onError: (e) => setError(errorMessage(e, "Could not save your card.")),
    });
  };
  const revert = () => {
    if (!saved) { setTheme("warm-atelier"); setStickers([]); } else { setTheme(saved.theme); setStickers(saved.stickers); }
    setJustSaved(false); setError(null);
  };

  return (
    <section aria-labelledby="designer-h" className="surface p-5 md:p-8">
      <h2 id="designer-h" className="text-2xl font-bold tracking-tight">Your event card</h2>
      <p className="text-sm text-on-surface-variant mt-1">Pick a theme and up to three stickers. The preview updates live.</p>
      {q.isError && <div className="mt-4"><FormAlert message="Could not load your saved design." onRetry={() => q.refetch()} /></div>}
      <div className="mt-6 grid lg:grid-cols-2 gap-8 items-start">
        {q.isLoading ? <div className="sk aspect-[4/5] w-full max-w-sm mx-auto rounded-3xl" /> : <CardPreview event={event} theme={theme} stickers={stickers} />}
        <div className="flex flex-col gap-6">
          <fieldset>
            <legend className="text-sm font-semibold mb-2">Theme</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button key={t.key} type="button" aria-pressed={theme === t.key} onClick={() => { setTheme(t.key); setJustSaved(false); }} data-testid={`theme-${t.key}`}
                  className={cn("rounded-xl border p-3 text-left text-sm font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", theme === t.key ? "border-primary ring-2 ring-primary/30" : "border-surface-highest hover:bg-surface-low")}>
                  <span className="block h-8 rounded-md mb-2 border" style={{ background: t.card, borderColor: t.accent }} />
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold mb-2">Stickers <span className="font-normal text-on-surface-variant">({stickers.length}/3)</span></legend>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {STICKERS.map((s) => {
                const on = stickers.includes(s.key);
                const full = !on && stickers.length >= 3;
                return (
                  <button key={s.key} type="button" aria-pressed={on} disabled={full} onClick={() => toggleSticker(s.key)} data-testid={`sticker-${s.key}`}
                    className={cn("rounded-xl border p-2 flex flex-col items-center gap-1 text-xs font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", on ? "border-primary bg-primary-fixed" : "border-surface-highest hover:bg-surface-low")}>
                    <StickerGlyph name={s.key} className="size-10" />
                    {s.label}
                  </button>
                );
              })}
            </div>
            {stickers.length >= 3 && <p className="text-xs text-on-surface-variant mt-2">Three is the limit. Remove one to swap.</p>}
          </fieldset>
          {error && <FormAlert message={error} />}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary" onClick={onSave} disabled={save.isPending || q.isLoading || !dirty} data-testid="button-save-card">
              {save.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />} Save card
            </button>
            <button type="button" className="btn btn-soft" onClick={revert} disabled={!dirty || save.isPending} data-testid="button-revert-card">
              <RotateCcw className="size-4" aria-hidden /> {saved ? "Revert to saved" : "Reset"}
            </button>
            <span role="status" className="text-sm text-tertiary font-semibold inline-flex items-center gap-1">
              {justSaved && !dirty && (<><Check className="size-4" aria-hidden /> Saved</>)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
