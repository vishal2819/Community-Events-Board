import { requirePageAdmin } from "@/lib/auth/page";
import { SiteShell, PageHead } from "@/components/site-shell";
import { AdminEventEditor } from "@/components/admin/admin-event-editor";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAdmin();
  const { id } = await params;
  return (
    <SiteShell>
      <PageHead eyebrow="Admin" title="Edit event" />
      <AdminEventEditor id={id} />
    </SiteShell>
  );
}
