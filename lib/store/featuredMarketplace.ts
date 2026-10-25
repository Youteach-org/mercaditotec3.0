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

/** Deterministic pseudo-random generator; each client chooses a fresh visit seed. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function isDemo(store: FeaturedStore): boolean {
  return store.id.startsWith("demo-") || "demoCategory" in store;
}

/**
 * Fair order across ALL published stores, not just the first six.
 *
 * - Published stores use a full seeded Fisher-Yates shuffle, preventing the
 *   repository's alphabetical/source order from deciding who stays below six.
 * - Ke-Rollos! and YouTeach (only when actually public) take distinct,
 *   randomized slots somewhere in the first NINE published positions.
 * - Samples follow genuine published stores, as before.
 * - The selected order stays stable while browsing/searching/paginating;
 *   the marketplace page chooses a new seed when the visitor opens Tiendas.
 *
 * A fixed seed is useful for deterministic tests and same-visit rerenders.
 */
export function orderMarketplaceFeatured<T extends FeaturedStore>(
  stores: readonly T[],
  date: Date = new Date(),
  visitSeed = 0,
): T[] {
  if (!stores.length) return [];

  const day = mexicoCityDay(date);
  const random = seededRandom(stableHash(`${day}:${visitSeed}`));
  const published = shuffled(stores.filter((store) => !isDemo(store)), random);
  const demos = shuffled(stores.filter(isDemo), random);
  if (!published.length) return demos;

  const reserved: T[] = [];
  const reservedIds = new Set<string>();
  for (const brand of PRIORITY_BRANDS) {
    const match = published.find((store) =>
      !reservedIds.has(store.id) && featuredPriorityBrand(store) === brand
    );
    if (match) {
      reserved.push(match);
      reservedIds.add(match.id);
    }
  }

  const ordinary = published.filter((store) => !reservedIds.has(store.id));
  const firstNineSlots = shuffled(
    Array.from({ length: Math.min(9, published.length) }, (_, index) => index),
    random,
  );
  const placements = new Map<number, T>(
    reserved.map((store, index) => [firstNineSlots[index], store]),
  );

  let ordinaryIndex = 0;
  const orderedPublished = Array.from({ length: published.length }, (_, index) =>
    placements.get(index) ?? ordinary[ordinaryIndex++]
  );
  return [...orderedPublished, ...demos];
}
