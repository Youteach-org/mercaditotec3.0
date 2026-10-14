export const STORE_RATING_CHOICES = [
  { value: 1, emoji: "😡", label: "Mala experiencia" },
  { value: 2, emoji: "😕", label: "Podría mejorar" },
  { value: 3, emoji: "🙂", label: "Está bien" },
  { value: 4, emoji: "😊", label: "Muy buena" },
  { value: 5, emoji: "😍", label: "¡Me encantó!" },
] as const;

export type StoreRatingValue = 1 | 2 | 3 | 4 | 5;

export interface StoreRatingStats {
  count: number;
  total: number;
  distribution: number[];
}

export const EMPTY_STORE_RATING_STATS: StoreRatingStats = {
  count: 0,
  total: 0,
  distribution: [0, 0, 0, 0, 0],
};

export class StoreRatingError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function parseStoreRatingValue(value: unknown): StoreRatingValue {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    throw new StoreRatingError(400, "Selecciona una de las cinco reacciones.");
  }
  return value as StoreRatingValue;
}

export function readStoreRatingStats(value: unknown): StoreRatingStats {
  if (!value || typeof value !== "object") return { ...EMPTY_STORE_RATING_STATS, distribution: [0, 0, 0, 0, 0] };
  const record = value as Partial<StoreRatingStats>;
  const distribution = Array.isArray(record.distribution) ? record.distribution : [];
  if (
    distribution.length !== 5 ||
    distribution.some((n) => !Number.isSafeInteger(n) || n < 0) ||
    !Number.isSafeInteger(record.count) ||
    !Number.isSafeInteger(record.total) ||
    record.count !== distribution.reduce((a, b) => a + b, 0) ||
    record.total !== distribution.reduce((sum, n, i) => sum + n * (i + 1), 0)
  ) {
    return { count: 0, total: 0, distribution: [0, 0, 0, 0, 0] };
  }
  return { count: record.count!, total: record.total!, distribution: [...distribution] };
}

export function updateStoreRatingStats(
  existing: StoreRatingStats,
  previous: StoreRatingValue | null,
  next: StoreRatingValue,
): StoreRatingStats {
  if (previous === next) return existing;
  const distribution = [...existing.distribution];
  if (previous !== null) {
    if (distribution[previous - 1] <= 0) {
      throw new StoreRatingError(409, "Las valoraciones están desactualizadas. Inténtalo nuevamente.");
    }
    distribution[previous - 1] -= 1;
  }
  distribution[next - 1] += 1;
  return {
    count: existing.count + (previous === null ? 1 : 0),
    total: existing.total + next - (previous ?? 0),
    distribution,
  };
}

export function publicStoreRatingStats(stats: StoreRatingStats) {
  return {
    ratingAverage: stats.count > 0 ? Math.round((stats.total / stats.count) * 10) / 10 : null,
    ratingCount: stats.count,
    ratingDistribution: [...stats.distribution],
  };
}

export function dominantStoreRating(stats: { ratingDistribution: number[]; ratingCount: number }): StoreRatingValue | null {
  if (!stats.ratingCount) return null;
  let dominant = 5;
  for (let index = 4; index >= 0; index -= 1) {
    if (stats.ratingDistribution[index] > stats.ratingDistribution[dominant - 1]) dominant = index + 1;
  }
  return dominant as StoreRatingValue;
}
