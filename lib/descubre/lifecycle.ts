// Shared browser/server expiry policy. No perpetual adverts.
export const LISTING_DURATIONS_HOURS = [6, 12, 24, 48, 72, 168] as const;
export const DEFAULT_LISTING_HOURS = 48;
const HOUR_MS = 60 * 60 * 1000;

export function listingExpiryMs(record: { createdAt: number; expiresAt: number | null }): number {
  // Older "hasta que se venda" records receive a 48-hour hard expiry.
  return typeof record.expiresAt === "number" && Number.isFinite(record.expiresAt) && record.expiresAt > 0
    ? record.expiresAt
    : record.createdAt + DEFAULT_LISTING_HOURS * HOUR_MS;
}
export function listingDurationLabel(hours: number): string {
  return hours < 24 ? hours + (hours === 1 ? " hora" : " horas")
    : hours % 24 === 0 ? hours / 24 + (hours === 24 ? " día" : " días")
    : hours + " horas";
}
