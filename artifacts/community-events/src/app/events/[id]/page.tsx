import { SiteShell } from "@/components/site-shell";
import { EventDetail } from "@/components/event-detail";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (<SiteShell><EventDetail id={id} /></SiteShell>);
}
