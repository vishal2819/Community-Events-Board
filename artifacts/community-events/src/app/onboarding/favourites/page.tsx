import { requirePageUser } from "@/lib/auth/page";
import { SiteShell, PageHead } from "@/components/site-shell";
import { FavouritesForm } from "@/components/favourites-form";

export default async function FavouritesPage() {
  await requirePageUser();
  return (
    <SiteShell>
      <PageHead eyebrow="Step 2 of 2" title="What do you like going out for?" body="Pick up to five categories. Your feed leans toward them." />
      <FavouritesForm />
    </SiteShell>
  );
}
