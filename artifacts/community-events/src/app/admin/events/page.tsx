import { requirePageAdmin } from "@/lib/auth/page";
import { SiteShell, PageHead } from "@/components/site-shell";
import { AdminEventsList } from "@/components/admin/admin-events-list";

export default async function AdminEventsPage() {
  await requirePageAdmin();
  return (
    <SiteShell>
      <PageHead eyebrow="Admin" title="Events" body="Every event on the board, including inactive and past ones." />
      <AdminEventsList />
    </SiteShell>
  );
}
