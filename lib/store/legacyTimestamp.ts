import { Timestamp } from "../firestoreRest";

export function coerceRecordTimestamp(
  value: unknown,
  fallback: Timestamp = Timestamp.fromMillis(0),
): Timestamp {
  if (value instanceof Timestamp) return value;
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return Timestamp.fromDate(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Timestamp.fromMillis(value);
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) {
      return Timestamp.fromDate(parsed);
    }
  }
  return fallback;
}
