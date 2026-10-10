import { requirePageUser } from "@/lib/auth/page";
import { SiteShell, PageHead } from "@/components/site-shell";
import { FeedView } from "@/components/feed-view";

export default async function FeedPage() {
  const user = await requirePageUser();
  return (
    <SiteShell>
      <PageHead eyebrow={user.email} title="Your feed" body="Events matched to your favourite categories, plus the ones you asked to be reminded about." />
      <FeedView />
    </SiteShell>
  );
}
