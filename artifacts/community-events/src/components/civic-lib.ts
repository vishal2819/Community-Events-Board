import type { Category, Event as CivicEvent } from "@workspace/api-client-react";

export const CATEGORIES: { key: Category; label: string; blurb: string }[] = [
  { key: "MUSIC", label: "Music", blurb: "Gigs, ragas, open-mic nights and small-room sets." },
  { key: "WORKSHOP", label: "Workshop", blurb: "Hands-on evenings: clay, block print, code, craft." },
  { key: "FOOD", label: "Food", blurb: "Supper clubs, chai walks, tasting tables." },
  { key: "SPORTS", label: "Sports", blurb: "Runs, turf games, rides and weekend leagues." },
  { key: "KIDS", label: "Kids", blurb: "Story hours and play sessions for little ones." },
];

export const categoryLabel = (c: Category) => CATEGORIES.find((x) => x.key === c)?.label ?? c;

export const CATEGORY_BADGE: Record<Category, string> = {
  MUSIC: "bg-primary-fixed text-on-primary-fixed",
  WORKSHOP: "bg-secondary-container text-on-secondary-container",
  FOOD: "bg-surface-high text-on-surface-variant",
  SPORTS: "bg-tertiary-fixed text-on-tertiary-fixed",
  KIDS: "bg-error-container text-[#93000a]",
};

export function formatPrice(price: string): string {
  const n = Number(price);
  if (!Number.isFinite(n) || n === 0) return "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatWhen(iso: string, long = false): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: long ? "long" : "short",
    day: "numeric",
    month: long ? "long" : "short",
    year: long ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export const isPast = (e: Pick<CivicEvent, "startsAt">) => new Date(e.startsAt).getTime() < Date.now();

const IST_MS = 5.5 * 3600 * 1000;
/** ISO UTC -> value for datetime-local, in Asia/Kolkata */
export function toIstInput(iso: string): string {
  return new Date(new Date(iso).getTime() + IST_MS).toISOString().slice(0, 16);
}
/** datetime-local value (Asia/Kolkata) -> ISO UTC */
export function fromIstInput(v: string): string | null {
  const d = new Date(`${v}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again."): string {
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export function errorStatus(e: unknown): number | undefined {
  const s = (e as { status?: unknown } | null)?.status;
  return typeof s === "number" ? s : undefined;
}

export function safeNext(next: string | undefined, fallback: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
