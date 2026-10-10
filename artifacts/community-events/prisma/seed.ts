import { PrismaClient, Category, Prisma } from "@prisma/client";

const db = new PrismaClient();
// Stable identifiers make reruns idempotent; dates are relative to execution.
const examples: { title: string; category: Category; city: string; days: number; price: string; description: string; image: string; active?: boolean }[] = [
  { title: "Rooftop Jazz & Soul", category: "MUSIC", city: "Bengaluru", days: 2, price: "850", description: "An intimate evening of live jazz, warm lights and city views. Meet local musicians and discover a new favourite sound.", image: "photo-1511192336575-5a79af67a629" },
  { title: "The Art of Slow Pottery", category: "WORKSHOP", city: "Bengaluru", days: 3, price: "1200", description: "Get your hands into clay in this beginner-friendly pottery workshop. All materials and firing are included.", image: "photo-1565193298595-6c8ba9e2f1b9" },
  { title: "Sunday at the Farmers' Market", category: "FOOD", city: "Bengaluru", days: 4, price: "0", description: "Fresh produce, small-batch coffee and neighbourhood makers. Spend a slow Sunday supporting local growers.", image: "photo-1488459716781-31db52582fe9" },
  { title: "Coimbatore Acoustic Night", category: "MUSIC", city: "Coimbatore", days: 5, price: "450", description: "A night of unplugged indie songs at a community courtyard, featuring local Coimbatore artists.", image: "photo-1516280440614-37939bbacd81" },
  { title: "Little Explorers' Nature Club", category: "KIDS", city: "Bengaluru", days: 6, price: "250", description: "A playful guided nature walk for children and their parents. Discover plants, birds and stories in the park.", image: "photo-1503454537195-1dcabb73ffb9" },
  { title: "Sunrise Community Run", category: "SPORTS", city: "Chennai", days: 7, price: "0", description: "A friendly five-kilometre run for all abilities followed by stretches and breakfast with your neighbours.", image: "photo-1552674605-db6ffd4facb5" },
  { title: "Coffee, Craft & Conversation", category: "WORKSHOP", city: "Coimbatore", days: 8, price: "600", description: "Learn mindful paper crafts over freshly brewed coffee. No previous experience is needed for this creative workshop.", image: "photo-1455390582262-044cdead277a" },
  { title: "A Taste of Tamil Nadu", category: "FOOD", city: "Coimbatore", days: 9, price: "750", description: "Local cooks share regional recipes and stories over a communal tasting menu celebrating Tamil cuisine.", image: "photo-1504674900247-0877df9cc836" },
  { title: "Courtyard Indie Sessions", category: "MUSIC", city: "Chennai", days: 10, price: "500", description: "Fresh independent music in an open courtyard. Enjoy three local acts and meet the artists after the show.", image: "photo-1501612780327-45045538702b" },
  { title: "Weekend Badminton Social", category: "SPORTS", city: "Bengaluru", days: 11, price: "350", description: "Friendly doubles games for beginners and regular players. Bring your racket or borrow one at the venue.", image: "photo-1622279457486-62dcc4a431d6" },
  { title: "Storytime Under the Trees", category: "KIDS", city: "Coimbatore", days: 12, price: "0", description: "Interactive storytelling, picture books and gentle outdoor games for curious young readers and their families.", image: "photo-1503676260728-1c00da094a0b" },
  { title: "Urban Sketching Walk", category: "WORKSHOP", city: "Chennai", days: 13, price: "400", description: "Explore the city with a sketchbook and learn to notice everyday architecture. A local illustrator guides the group.", image: "photo-1513364776144-60967b0f800f" },
  { title: "The Neighbourhood Supper Club", category: "FOOD", city: "Bengaluru", days: 14, price: "950", description: "Share a seasonal dinner with new friends at one long table. A welcoming evening of local food and conversation.", image: "photo-1511795409834-ef04bbd61622" },
  { title: "Family Cycling Morning", category: "SPORTS", city: "Coimbatore", days: 15, price: "100", description: "A gentle guided cycle along quiet streets with stops for water and stories. Helmets are required for everyone.", image: "photo-1517649763962-0c623066013b" },
  { title: "Puppet Theatre for Little Ones", category: "KIDS", city: "Chennai", days: 16, price: "200", description: "A colourful puppet show followed by a make-your-own puppet activity for children aged four to ten.", image: "photo-1516627145497-ae6968895b74" },
  { title: "Coimbatore Music Night — Archive", category: "MUSIC", city: "Coimbatore", days: -5, price: "350", description: "A previous local music night kept as an archival example. This past event must not appear in public discovery.", image: "photo-1470229722913-7c0e2dbbafd3" },
  { title: "Coimbatore Secret Music Night", category: "MUSIC", city: "Coimbatore", days: 20, price: "800", description: "An inactive planning record for a future music night. Administrators can manage it but visitors cannot see it.", image: "photo-1514525253161-7a46d19cd819", active: false },
  { title: "Past Inactive Craft Morning", category: "WORKSHOP", city: "Chennai", days: -10, price: "450", description: "A historical inactive workshop demonstrating both status and date filtering in the public event API.", image: "photo-1452860606245-08befc0ff44b", active: false },
];

async function seed() {
  const base = new Date();
  // India evening (18:30 IST) = 13:00 UTC.
  base.setUTCHours(13, 0, 0, 0);
  for (const [index, item] of examples.entries()) {
    const startsAt = new Date(base); startsAt.setUTCDate(startsAt.getUTCDate() + item.days);
    const data = { title: item.title, category: item.category, city: item.city, startsAt, price: new Prisma.Decimal(item.price), description: item.description, imageUrl: `https://images.unsplash.com/${item.image}?auto=format&fit=crop&w=1000&q=85`, isActive: item.active ?? true };
    await db.event.upsert({ where: { id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}` }, update: {}, create: { id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, ...data } });
  }
  process.stdout.write(`Seed ensured ${examples.length} events. Existing records are not overwritten.\n`);
}
seed().catch(() => { process.stderr.write("Seed failed; check database configuration.\n"); process.exitCode = 1; }).finally(() => db.$disconnect());
