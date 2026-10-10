"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

export function ErrorPanel({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4">
      <div className="surface max-w-md w-full p-8 text-center flex flex-col items-center gap-3" role="alert">
        <div className="size-14 rounded-full bg-error-container text-error flex items-center justify-center"><TriangleAlert className="size-7" aria-hidden /></div>
        <h1 className="text-2xl font-bold tracking-tight">Something slipped</h1>
        <p className="text-sm text-on-surface-variant">This page failed to load. Try again, or head back to the board.</p>
        <div className="flex gap-3 mt-2">
          <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
          <Link href="/" className="btn btn-soft">Discover</Link>
        </div>
      </div>
    </div>
  );
}
