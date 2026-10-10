/**
 * Only retry transient session-check failures; never retry explicit 401/403.
 * Every 429 respects Retry-After. This module does not grant account access.
 */
export function parseRetryAfterMs(header, now = Date.now()) {
  if (typeof header !== 'string' || !header.trim()) return null;
  const value = header.trim();
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(1000, Math.min(120000, seconds * 1000));
  }
  const date = Date.parse(value);
  if (Number.isFinite(date) && date > now) {
    return Math.max(1000, Math.min(120000, date - now));
  }
  return null;
}

export function immediateSessionRetryDelayMs(status, retry, retryAfter) {
  if (![502, 503, 504].includes(status) || retry >= 1 || parseRetryAfterMs(retryAfter) !== null) {
    return null;
  }
  return 1200 * (retry + 1);
}

export function followUpSessionRetryDelayMs(status, retryAfter) {
  return parseRetryAfterMs(retryAfter) ?? (status === 429 ? 60000 : 20000);
}
