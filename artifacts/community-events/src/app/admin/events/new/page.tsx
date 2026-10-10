import { requirePageAdmin } from "@/lib/auth/page";
import { SiteShell, PageHead } from "@/components/site-shell";
import { EventForm } from "@/components/admin/event-form";

export default async function NewEventPage() {
  await requirePageAdmin();
  return (
    <SiteShell>
      <PageHead eyebrow="Admin" title="New event" />
      <section className="px-4 md:px-8 pb-12"><div className="max-w-7xl mx-auto"><EventForm /></div></section>
    </SiteShell>
  );
}
