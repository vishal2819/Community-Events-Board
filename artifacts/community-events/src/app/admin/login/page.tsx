import { SiteShell } from "@/components/site-shell";
import { AuthForm } from "@/components/auth-form";

export default function AdminLoginPage() {
  return (<SiteShell><AuthForm mode="admin" /></SiteShell>);
}
