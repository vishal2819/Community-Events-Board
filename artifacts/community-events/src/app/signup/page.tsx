import { SiteShell } from "@/components/site-shell";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (<SiteShell><AuthForm mode="signup" /></SiteShell>);
}
