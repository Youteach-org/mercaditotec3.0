// Counts belong to the chat message that already has a live subscription.
// Legacy messages keep their old reaction stream until the 48-hour retention ends.
export const CHAT_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const;

export type ChatReactionCounts = Record<string, number>;

export function isSummarizedMessage(message: { reactionSummaryVersion?: unknown }): boolean {
  return message.reactionSummaryVersion === 1;
}

export function readReactionCounts(value: unknown): ChatReactionCounts {
  const data = value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const counts: ChatReactionCounts = {};
  for (const emoji of CHAT_REACTION_EMOJIS) {
    const count = data[emoji];
    counts[emoji] = typeof count === "number" && Number.isSafeInteger(count) && count >= 0
      ? count : 0;
  }
  return counts;
}

/** Called inside the same Firestore transaction that writes the user's reaction. */
export function nextReactionCounts(
  rawCounts: unknown,
  previousEmoji: unknown,
  requestedEmoji: string,
): ChatReactionCounts {
  if (!CHAT_REACTION_EMOJIS.some(emoji => emoji === requestedEmoji)) {
    throw new Error("Unsupported chat reaction");
  }
  const result = readReactionCounts(rawCounts);
  const previous = typeof previousEmoji === "string" &&
    CHAT_REACTION_EMOJIS.some(emoji => emoji === previousEmoji) ? previousEmoji : null;
  if (previous) result[previous] = Math.max(0, result[previous] - 1);
  if (previous !== requestedEmoji) result[requestedEmoji] += 1;
  return result;
}
