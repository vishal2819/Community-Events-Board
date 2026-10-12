"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, X, UserRound } from "lucide-react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const LOGO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBXroeTkPxy6k2SsBH4edILl-iitMoZ3L5RLUhEuqE4EWEND1ABnL0OHm1F1DpvBplxGx7ZYhPpOIKawduahB0XALQhQCo-h8ah3tFX8Vf9uWtdkaEWa3HxrmP9wMCYohKPSkeOhEuqjdsRW_D_rvg58QpzM0LT9HwGQVGdLL01LagPvLSF3crloMIZ-k1rnOXGUV0Ay_IFFSpnEpJXPU36VbySsbfvlR4V83vMkHPLotd8v6sq7g0c";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const me = useGetMe();
  const logout = useLogout();
  const user = me.data?.data ?? null;

  const items = [
    { label: "Discover", href: "/" },
    ...(user ? [{ label: "My Feed", href: "/feed" }, { label: "Favourites", href: "/onboarding/favourites" }] : []),
    ...(user?.role === "ADMIN" ? [{ label: "Admin", href: "/admin/events" }] : []),
  ];
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href) ?? false);

  const signOut = () =>
    logout.mutate(undefined, {
      onSettled: () => {
        qc.clear();
        setOpen(false);
        router.replace("/");
        router.refresh();
      },
    });

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-md border-b border-surface-highest/60 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 min-w-0" aria-label="Civic Community Events home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" src={LOGO} className="h-8 w-auto object-contain" />
          <span className="font-semibold text-lg tracking-tight truncate hidden min-[400px]:inline">Community Events</span>
          <span className="px-1.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold uppercase tracking-wider">Civic</span>
        </Link>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-6">
          {items.map((i) => (
            <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}
              className={cn("text-sm py-1 relative font-medium transition-colors", active(i.href) ? "text-foreground font-semibold" : "text-on-surface-variant hover:text-foreground")}>
              {i.label}
              {active(i.href) && <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {me.isLoading ? (
            <div className="sk h-9 w-24 rounded-lg" aria-hidden />
          ) : user ? (
            <>
              <span className="hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-lg bg-surface-container text-xs font-semibold" title={user.email}>
                <span className="size-2 rounded-full bg-tertiary" />
                <span className="max-w-[120px] truncate">{user.email.split("@")[0]}</span>
              </span>
              <button type="button" onClick={signOut} disabled={logout.isPending} className="btn btn-soft btn-sm hidden md:inline-flex" data-testid="button-logout">
                <LogOut className="size-3.5" aria-hidden /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-soft btn-sm" data-testid="link-login">Sign in</Link>
              <Link href="/signup" className="btn btn-primary btn-sm hidden sm:inline-flex" data-testid="link-signup">Join</Link>
            </>
          )}
          <button type="button" className="md:hidden btn btn-ghost size-10 px-0" aria-expanded={open} aria-controls="mobile-nav" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="md:hidden bg-surface border-t border-surface-highest px-4 py-4 space-y-1 shadow-xl">
          {items.map((i) => (
            <Link key={i.href} href={i.href} onClick={() => setOpen(false)}
              className={cn("block px-3 py-2.5 rounded-lg text-sm font-medium", active(i.href) ? "bg-primary-fixed text-on-primary-fixed font-semibold" : "text-on-surface-variant hover:bg-surface-container")}>
              {i.label}
            </Link>
          ))}
          {user ? (
            <button type="button" onClick={signOut} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container flex items-center gap-2 cursor-pointer">
              <UserRound className="size-4" aria-hidden /> Sign out ({user.email})
            </button>
          ) : (
            <Link href="/signup" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-primary">Create an account</Link>
          )}
        </div>
      )}
    </header>
  );
}
