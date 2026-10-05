import { createHash } from "node:crypto";
export function reactionMigrationPlan(records) {
  const groups = new Map();
  for (const record of records) {
    const { messageId, userId, emoji } = record.data;
    if (typeof messageId !== "string" || typeof userId !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(messageId) || !/^[A-Za-z0-9_-]{1,160}$/.test(userId) || !["👍", "❤️", "😂", "😮", "😢", "🔥"].includes(emoji)) continue;
    const id = createHash("sha256").update(JSON.stringify([userId, messageId])).digest("hex");
    const group = groups.get(id) ?? { id, records: [], latest: record };
    group.records.push(record);
    if (Number(record.data.createdAt ?? 0) > Number(group.latest.data.createdAt ?? 0)) group.latest = record;
    groups.set(id, group);
  }
  return [...groups.values()].map(group => ({ id: group.id, data: { messageId: group.latest.data.messageId, userId: group.latest.data.userId, emoji: group.latest.data.emoji, createdAt: Number(group.latest.data.createdAt) || Date.now() }, deleteIds: group.records.map(r=>r.id).filter(id=>id!==group.id) }));
}
