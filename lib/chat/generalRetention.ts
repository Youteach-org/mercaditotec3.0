export const GENERAL_CHAT_RETENTION_MS = 48 * 60 * 60 * 1000;

// Resets the visible general chat when this release reaches production.
export const GENERAL_CHAT_RESET_AT = 1791308160000;

export function generalChatCutoff(now = Date.now()): number {
  return Math.max(GENERAL_CHAT_RESET_AT, now - GENERAL_CHAT_RETENTION_MS);
}

export function isGeneralChatMessageCurrent(
  createdAt: number,
  now = Date.now(),
): boolean {
  return Number.isFinite(createdAt) && createdAt >= generalChatCutoff(now);
}
