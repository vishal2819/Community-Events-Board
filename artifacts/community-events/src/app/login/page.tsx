import { SiteShell } from "@/components/site-shell";
import { AuthForm } from "@/components/auth-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (<SiteShell><AuthForm mode="login" next={next} /></SiteShell>);
}
