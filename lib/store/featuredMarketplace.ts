import type { PublicStoreSummary } from "./publicMarketplace";

// Reserved featured-placement rules. These rules exist before YouTeach is
// published, but never bypass a store's review/active status.
const PRIORITY_BRANDS = ["ke-rollos", "youteach"] as const;
type FeaturedStore = Pick<PublicStoreSummary, "id" | "name" | "slug">;

function normalizeBrand(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .replace(/[^a-z0-9]/g, "");
}

export function featuredPriorityBrand(store: FeaturedStore): typeof PRIORITY_BRANDS[number] | null {
  const name = normalizeBrand(store.name);
  const slug = normalizeBrand(store.slug);

  // Ke-Rollos! is currently published with slug "k-rollos".
  if (["kerollos", "krollos"].some((value) => name.startsWith(value) || slug.startsWith(value))) {
    return "ke-rollos";
  }
  // Reserve the rule for YouTeach immediately, even before it is finished.
  if (name.startsWith("youteach") || slug.startsWith("youteach")) {
    return "youteach";
  }
  return null;
}

function mexicoCityDay(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Math.floor(Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day)) / 86_400_000);
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function isDemo(store: FeaturedStore): boolean {
  return store.id.startsWith("demo-") || "demoCategory" in store;
}

/**
 * Returns all matched stores, with exactly the first six as the featured
 * positions when at least six are available. Published Ke-Rollos and
 * YouTeach always occupy one of these six. Remaining real stores outrank
 * samples; unfeatured stores remain available in the same listing.
 *
 * Order is randomized deterministically per local day (Mexico City), not
 * on every render/refetch, so customers do not see cards jump around.
 */
export function orderMarketplaceFeatured<T extends FeaturedStore>(
  stores: readonly T[],
  date: Date = new Date(),
): T[] {
  if (!stores.length) return [];
  const day = mexicoCityDay(date);
  const used = new Set<string>();
  const reserved: T[] = [];

  for (const brand of PRIORITY_BRANDS) {
    const match = stores.find((store) =>
      !isDemo(store) && !used.has(store.id) && featuredPriorityBrand(store) === brand
    );
    if (match) {
      used.add(match.id);
      reserved.push(match);
    }
  }

  const available = stores.filter((store) => !used.has(store.id));
  const byDailyRank = (a: T, b: T) =>
    stableHash(`${day}:${a.id}`) - stableHash(`${day}:${b.id}`) ||
    a.id.localeCompare(b.id);

  const candidates = [
    ...available.filter((store) => !isDemo(store)).sort(byDailyRank),
    ...available.filter(isDemo).sort(byDailyRank),
  ];
  const chosen = [...reserved, ...candidates].slice(0, 6);
  // Change their positions daily while keeping reserved shops inside six.
  const featured = [...chosen].sort((a, b) =>
    stableHash(`featured:${day}:${a.id}`) -
      stableHash(`featured:${day}:${b.id}`) ||
    a.id.localeCompare(b.id)
  );
  const featuredIds = new Set(featured.map((store) => store.id));

  return [...featured, ...stores.filter((store) => !featuredIds.has(store.id))];
}
