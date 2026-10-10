import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "./site-header";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] btn btn-primary">Skip to content</a>
      <SiteHeader />
      <main id="main" className="flex-1 pt-16">{children}</main>
      <footer className="w-full bg-surface-low border-t border-surface-highest/60 mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-6">
            <Link href="/" className="hover:text-foreground">Discover</Link>
            <Link href="/feed" className="hover:text-foreground">My Feed</Link>
            <Link href="/admin/login" className="hover:text-foreground">Admin</Link>
          </nav>
          <p>Civic Community Events. Times shown in IST.</p>
        </div>
      </footer>
    </div>
  );
}

export function PageHead({ eyebrow, title, body, children }: { eyebrow?: string; title: string; body?: string; children?: ReactNode }) {
  return (
    <section className="px-4 md:px-8 pt-8 pb-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-3xl">
          {eyebrow && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-[#4a4643] shadow-sm">
              <span className="size-2 rounded-full bg-tertiary animate-pulse" />
              <span className="text-xs font-semibold tracking-wide">{eyebrow}</span>
            </div>
          )}
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mt-2">{title}</h1>
          {body && <p className="text-base md:text-lg text-on-surface-variant max-w-2xl mt-2">{body}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
