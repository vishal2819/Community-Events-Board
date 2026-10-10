"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck, Ticket } from "lucide-react";
import { useLogin, useLogout, useSignup, getGetMeQueryKey } from "@workspace/api-client-react";
import { TextField, FormAlert } from "./field";
import { errorMessage, safeNext } from "./civic-lib";

type Mode = "login" | "signup" | "admin";

const COPY: Record<Mode, { title: string; body: string; cta: string }> = {
  login: { title: "Welcome back", body: "Sign in to see your feed, reminders and event cards.", cta: "Sign in" },
  signup: { title: "Join your neighbourhood", body: "Create an account to save favourites and design event cards.", cta: "Create account" },
  admin: { title: "Admin sign in", body: "Manage the board: publish, edit and retire events.", cta: "Enter admin" },
};

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const login = useLogin();
  const signup = useSignup();
  const logout = useLogout();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const pending = login.isPending || signup.isPending || logout.isPending;
  const copy = COPY[mode];

  const finish = (dest: string) => {
    router.replace(dest);
    router.refresh();
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    const errs: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email address.";
    if (password.length < 10 || password.length > 72) errs.password = "Password must be 10 to 72 characters.";
    setErrors(errs);
    if (errs.email || errs.password) return;
    const data = { email: email.trim(), password };
    const opts = {
      onError: (e: unknown) => setFormError(errorMessage(e, "Could not sign you in. Check your details.")),
    };

    if (mode === "signup") {
      signup.mutate({ data }, {
        ...opts,
        onSuccess: (res) => {
          qc.clear();
          qc.setQueryData(getGetMeQueryKey(), { data: res.data.user });
          finish("/onboarding/favourites");
        },
      });
      return;
    }
    login.mutate({ data }, {
      ...opts,
      onSuccess: (res) => {
        if (mode === "admin" && res.data.user.role !== "ADMIN") {
          logout.mutate(undefined, { onSettled: () => qc.clear() });
          setFormError("This account does not have admin access.");
          return;
        }
        qc.clear();
        qc.setQueryData(getGetMeQueryKey(), { data: res.data.user });
        finish(mode === "admin" ? "/admin/events" : safeNext(next, res.data.user.role === "ADMIN" ? "/feed" : "/feed"));
      },
    });
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] grid lg:grid-cols-2">
      <aside className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary via-primary-container to-[#2a1fa8] text-white p-12">
        <div className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-primary-fixed">
          {mode === "admin" ? <ShieldCheck className="size-5" aria-hidden /> : <Ticket className="size-5" aria-hidden />} Civic
        </div>
        <div>
          <p className="text-5xl font-bold tracking-tight leading-[1.05]">Local happenings,<br />curated for you.</p>
          <p className="mt-4 text-primary-fixed max-w-md">Gigs, workshops, supper clubs and Sunday runs across Indian cities. Save the ones you love and make a card to share.</p>
        </div>
        <div className="-rotate-2 w-72 rounded-2xl bg-surface p-5 text-foreground shadow-2xl">
          <p className="text-xs font-semibold text-primary">Sat, 14 Jun, 7:30 pm</p>
          <p className="text-lg font-bold mt-1">Your event card</p>
          <p className="text-xs text-on-surface-variant mt-1">Pick a theme, add up to three stickers.</p>
        </div>
      </aside>

      <div className="flex items-center justify-center px-4 py-10">
        <form onSubmit={submit} noValidate className="w-full max-w-md surface p-6 sm:p-8 flex flex-col gap-5" data-testid={`form-${mode}`}>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{copy.title}</h1>
            <p className="text-sm text-on-surface-variant mt-1">{copy.body}</p>
          </div>
          {formError && <FormAlert message={formError} />}
          <TextField label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} data-testid="input-email" />
          <TextField label="Password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)}
            hint={mode === "signup" ? "At least 10 characters." : undefined} error={errors.password} data-testid="input-password" />
          <button type="submit" disabled={pending} className="btn btn-primary h-11" data-testid="button-submit">
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} {copy.cta}
          </button>
          {mode !== "admin" && (
            <p className="text-sm text-on-surface-variant text-center">
              {mode === "login" ? "New to Civic? " : "Already have an account? "}
              <Link href={mode === "login" ? "/signup" : "/login"} className="font-semibold text-primary hover:underline">
                {mode === "login" ? "Create an account" : "Sign in"}
              </Link>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
