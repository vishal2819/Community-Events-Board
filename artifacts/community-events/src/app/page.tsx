import { SiteShell, PageHead } from "@/components/site-shell";
import { DiscoverView } from "@/components/discover-view";

export default function HomePage() {
  return (
    <SiteShell>
      <PageHead eyebrow="Live across Indian cities" title="Local happenings, curated for you." body="Explore upcoming gigs, workshops, supper clubs and neighbourhood meetups, then make a card for the ones you are going to." />
      <DiscoverView />
    </SiteShell>
  );
}
