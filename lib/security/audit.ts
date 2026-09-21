import { Timestamp } from "../firestoreRest";

import { getAdminDb } from "../firestoreRest";
import type { AdminRole } from "./domain";

export interface AuditEntryInput {
  actorUid: string;
  actorRole: AdminRole;
  action: string;
  targetType: "user" | "store" | "message" | "report" | "category" | "admin";
  targetId: string;
  metadata?: Record<string, unknown>;
}

export interface AuditEntryRecord extends AuditEntryInput {
  id: string;
  createdAt: string;
}

export async function writeAuditEntry(input: AuditEntryInput): Promise<void> {
  await getAdminDb().collection("admin_audit_logs").add({
    actorUid: input.actorUid,
    actorRole: input.actorRole,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata ?? {},
    createdAt: Timestamp.now(),
  });
}

export async function listAuditEntries(limit = 100): Promise<AuditEntryRecord[]> {
  const safeLimit = Math.min(200, Math.max(1, Math.floor(limit)));
  const snapshot = await getAdminDb()
    .collection("admin_audit_logs")
    .orderBy("createdAt", "desc")
    .limit(safeLimit)
    .get();

  return snapshot.docs.map((document) => {
    const data = document.data();
    const createdAt = data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : new Date(0).toISOString();

    return {
      id: document.id,
      actorUid: String(data.actorUid ?? ""),
      actorRole: data.actorRole === "subadmin" ? "subadmin" : "superadmin",
      action: String(data.action ?? ""),
      targetType: String(data.targetType ?? "user") as AuditEntryRecord["targetType"],
      targetId: String(data.targetId ?? ""),
      metadata:
        data.metadata && typeof data.metadata === "object"
          ? (data.metadata as Record<string, unknown>)
          : {},
      createdAt,
    };
  });
}
