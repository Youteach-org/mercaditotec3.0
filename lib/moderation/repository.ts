import { createHash } from "node:crypto";

import {
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Transaction,
} from "firebase-admin/firestore";

import { getAdminDb } from "../firebaseAdmin";
import type { AdminRole } from "../security/domain";
import {
  assertActionAllowed,
  assertModerationState,
  assertReportTransition,
  isAdministrativeBlockActive,
  type ModerationAction,
  type ReportInput,
  type ReportStatus,
  type ReportTargetType,
  type ResolutionInput,
} from "./domain";
import {
  sanitizeAdminReporter,
  sanitizeAdminTarget,
  type AdminReportFilters,
} from "./http";

export class ModerationRepositoryError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly currentState?: ReportRecord,
  ) {
    super(message);
  }
}

export interface TargetSnapshot {
  id: string;
  type: ReportTargetType;
  identity: string;
  ownerUid?: string;
  authorUid?: string;
  text?: string;
  createdAt?: number | null;
}

export interface ReportRecord {
  id: string;
  reporterUid: string;
  targetType: ReportTargetType;
  targetId: string;
  reasonCode: string;
  details: string;
  status: ReportStatus;
  assignedAdminUid: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolutionAction: ModerationAction | null;
  resolutionNote: string | null;
  targetSnapshot: TargetSnapshot;
  openKeyId: string;
}

export interface GeneralChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: "buyer" | "seller";
  senderPlan: "free" | "premium";
  senderPhotoURL: string;
  messageType: "template" | "custom" | "image";
  imageUrls: string[];
  createdAt: number;
  hidden: boolean;
}

export interface ReportDetail extends ReportRecord {
  reporter: Record<string, unknown> | null;
  currentTarget: Record<string, unknown> | null;
  previousReports: ReportRecord[];
  auditEvents: Array<Record<string, unknown>>;
  chatContext: GeneralChatMessage[];
}

function timestampIso(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return null;
}

function targetReference(
  targetType: ReportTargetType,
  targetId: string,
): DocumentReference {
  const collection = targetType === "user"
    ? "users"
    : targetType === "store"
      ? "stores"
      : "messages";
  return getAdminDb().collection(collection).doc(targetId);
}

function immutableTargetSnapshot(
  targetType: ReportTargetType,
  targetId: string,
  data: DocumentData,
): TargetSnapshot {
  if (targetType === "message") {
    return {
      id: targetId,
      type: targetType,
      identity: String(data.senderName ?? "Usuario"),
      authorUid: String(data.senderId ?? ""),
      text: String(data.text ?? "").slice(0, 500),
      createdAt: Number(data.createdAt ?? 0) || null,
    };
  }
  if (targetType === "store") {
    return {
      id: targetId,
      type: targetType,
      identity: String(data.name ?? "Tienda"),
      ownerUid: String(data.ownerUid ?? ""),
    };
  }
  return {
    id: targetId,
    type: targetType,
    identity: String(data.displayName ?? data.nickname ?? data.email ?? "Usuario"),
  };
}

function toReportRecord(id: string, data: DocumentData): ReportRecord {
  return {
    id,
    reporterUid: String(data.reporterUid ?? ""),
    targetType: data.targetType as ReportTargetType,
    targetId: String(data.targetId ?? ""),
    reasonCode: String(data.reasonCode ?? ""),
    details: String(data.details ?? ""),
    status: data.status as ReportStatus,
    assignedAdminUid: typeof data.assignedAdminUid === "string"
      ? data.assignedAdminUid
      : null,
    createdAt: timestampIso(data.createdAt) ?? new Date(0).toISOString(),
    updatedAt: timestampIso(data.updatedAt) ?? new Date(0).toISOString(),
    resolvedAt: timestampIso(data.resolvedAt),
    resolutionAction: typeof data.resolutionAction === "string"
      ? data.resolutionAction as ModerationAction
      : null,
    resolutionNote: typeof data.resolutionNote === "string"
      ? data.resolutionNote
      : null,
    targetSnapshot: data.targetSnapshot as TargetSnapshot,
    openKeyId: String(data.openKeyId ?? ""),
  };
}

export function openReportKey(
  reporterUid: string,
  input: Pick<ReportInput, "targetType" | "targetId" | "reasonCode">,
): string {
  return createHash("sha256")
    .update([reporterUid, input.targetType, input.targetId, input.reasonCode].join("\u0000"))
    .digest("hex");
}

export async function createReport(
  reporterUid: string,
  input: ReportInput,
): Promise<ReportRecord> {
  const db = getAdminDb();
  const reportReference = db.collection("reports").doc();
  const keyId = openReportKey(reporterUid, input);
  const keyReference = db.collection("open_report_keys").doc(keyId);
  const reportedReference = targetReference(input.targetType, input.targetId);

  await db.runTransaction(async (transaction) => {
    const [keySnapshot, targetSnapshot] = await Promise.all([
      transaction.get(keyReference),
      transaction.get(reportedReference),
    ]);
    if (keySnapshot.exists) {
      throw new ModerationRepositoryError(409, "Ya enviaste un reporte abierto con este motivo.");
    }
    if (!targetSnapshot.exists) {
      throw new ModerationRepositoryError(404, "El contenido que intentas reportar ya no está disponible.");
    }

    const now = Timestamp.now();
    const record = {
      reporterUid,
      ...input,
      status: "open" as const,
      assignedAdminUid: null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      resolutionAction: null,
      resolutionNote: null,
      targetSnapshot: immutableTargetSnapshot(
        input.targetType,
        input.targetId,
        targetSnapshot.data()!,
      ),
      openKeyId: keyId,
    };
    transaction.create(reportReference, record);
    transaction.create(keyReference, {
      reportId: reportReference.id,
      reporterUid,
      targetType: input.targetType,
      targetId: input.targetId,
      reasonCode: input.reasonCode,
      createdAt: now,
    });
  });

  const created = await reportReference.get();
  return toReportRecord(created.id, created.data()!);
}

function passesFilters(report: ReportRecord, filters: AdminReportFilters): boolean {
  if (filters.status && report.status !== filters.status) return false;
  if (filters.targetType && report.targetType !== filters.targetType) return false;
  if (filters.reasonCode && report.reasonCode !== filters.reasonCode) return false;
  if (filters.from && Date.parse(report.createdAt) < Date.parse(filters.from)) return false;
  if (filters.to && Date.parse(report.createdAt) > Date.parse(filters.to)) return false;
  if (filters.search) {
    const haystack = [
      report.id,
      report.targetId,
      report.targetSnapshot?.identity ?? "",
    ].join(" ").toLocaleLowerCase("es-MX");
    if (!haystack.includes(filters.search.toLocaleLowerCase("es-MX"))) return false;
  }
  return true;
}

export async function listReportsForAdmin(
  filters: AdminReportFilters,
): Promise<ReportRecord[]> {
  const snapshot = await getAdminDb().collection("reports").limit(250).get();
  return snapshot.docs
    .map((document) => toReportRecord(document.id, document.data()))
    .filter((report) => passesFilters(report, filters))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function startReportReview(
  reportId: string,
  actorUid: string,
  actorRole: AdminRole,
): Promise<ReportRecord> {
  const db = getAdminDb();
  const reference = db.collection("reports").doc(reportId);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new ModerationRepositoryError(404, "Reporte no encontrado.");
    const report = toReportRecord(snapshot.id, snapshot.data()!);
    if (report.status !== "open") return;
    const now = Timestamp.now();
    transaction.update(reference, {
      status: "in_review",
      assignedAdminUid: actorUid,
      updatedAt: now,
    });
    transaction.create(db.collection("admin_audit_logs").doc(), {
      actorUid,
      actorRole,
      action: "report.review.start",
      targetType: "report",
      targetId: reportId,
      metadata: { reportId },
      createdAt: now,
    });
  });
  const updated = await reference.get();
  return toReportRecord(updated.id, updated.data()!);
}

function generalMessage(id: string, data: DocumentData): GeneralChatMessage {
  return {
    id,
    text: String(data.text ?? ""),
    senderId: String(data.senderId ?? ""),
    senderName: String(data.senderName ?? "Usuario"),
    senderRole: data.senderRole === "seller" ? "seller" : "buyer",
    senderPlan: data.senderPlan === "premium" ? "premium" : "free",
    senderPhotoURL: String(data.senderPhotoURL ?? ""),
    messageType: data.messageType === "image"
      ? "image"
      : data.messageType === "template"
        ? "template"
        : "custom",
    imageUrls: Array.isArray(data.imageUrls)
      ? data.imageUrls.filter((url): url is string => typeof url === "string")
      : [],
    createdAt: Number(data.createdAt ?? 0),
    hidden: data.hidden === true,
  };
}

async function loadGeneralChatContext(
  messageId: string,
): Promise<GeneralChatMessage[]> {
  const db = getAdminDb();
  const reference = db.collection("messages").doc(messageId);
  const target = await reference.get();
  if (!target.exists) return [];
  const createdAt = Number(target.data()?.createdAt ?? 0);
  const [before, after] = await Promise.all([
    db.collection("messages")
      .where("createdAt", "<", createdAt)
      .orderBy("createdAt", "desc")
      .limit(5)
      .get(),
    db.collection("messages")
      .where("createdAt", ">", createdAt)
      .orderBy("createdAt", "asc")
      .limit(5)
      .get(),
  ]);
  return [
    ...before.docs.reverse().map((document) => generalMessage(document.id, document.data())),
    generalMessage(target.id, target.data()!),
    ...after.docs.map((document) => generalMessage(document.id, document.data())),
  ];
}

export async function getReportForAdmin(
  reportId: string,
  actor?: { uid: string; role: AdminRole },
): Promise<ReportDetail> {
  if (actor) await startReportReview(reportId, actor.uid, actor.role);
  const db = getAdminDb();
  const reference = db.collection("reports").doc(reportId);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new ModerationRepositoryError(404, "Reporte no encontrado.");
  const report = toReportRecord(snapshot.id, snapshot.data()!);

  const [reporter, target, reportHistory, auditHistory, chatContext] = await Promise.all([
    db.collection("users").doc(report.reporterUid).get(),
    targetReference(report.targetType, report.targetId).get(),
    db.collection("reports").limit(250).get(),
    db.collection("admin_audit_logs").orderBy("createdAt", "desc").limit(250).get(),
    report.targetType === "message"
      ? loadGeneralChatContext(report.targetId)
      : Promise.resolve([]),
  ]);

  return {
    ...report,
    reporter: reporter.exists
      ? sanitizeAdminReporter(reporter.id, reporter.data()!)
      : null,
    currentTarget: target.exists
      ? sanitizeAdminTarget(report.targetType, target.id, target.data()!)
      : null,
    previousReports: reportHistory.docs
      .map((document) => toReportRecord(document.id, document.data()))
      .filter((item) => item.id !== report.id && item.targetType === report.targetType && item.targetId === report.targetId),
    auditEvents: auditHistory.docs
      .filter((document) => {
        const data = document.data();
        return String(data.targetId ?? "") === report.targetId ||
          String(data.metadata?.reportId ?? "") === report.id;
      })
      .map((document) => ({
        id: document.id,
        ...document.data(),
        createdAt: timestampIso(document.data().createdAt),
      })),
    chatContext,
  };
}

function auditAction(action: ModerationAction): string {
  const actions: Record<ModerationAction, string> = {
    dismiss: "report.dismiss",
    message_hide: "message.hide",
    message_restore: "message.restore",
    user_block: "user.block",
    user_unblock: "user.unblock",
    trust_revoke: "user.student.revoke",
    trust_restore: "user.student.verify",
    store_request_changes: "store.changes_required",
    store_suspend: "store.suspend",
    store_reactivate: "store.reactivate",
  };
  return actions[action];
}

async function readActionTarget(
  transaction: Transaction,
  report: ReportRecord,
  action: ModerationAction,
) {
  const reportedReference = targetReference(report.targetType, report.targetId);
  const reportedSnapshot = await transaction.get(reportedReference);
  if (!reportedSnapshot.exists) {
    throw new ModerationRepositoryError(404, "El objetivo reportado ya no existe.");
  }
  let actionReference = reportedReference;
  let actionSnapshot = reportedSnapshot;
  if (
    report.targetType === "message" &&
    ["user_block", "user_unblock", "trust_revoke", "trust_restore"].includes(action)
  ) {
    const authorUid = String(reportedSnapshot.data()?.senderId ?? "");
    if (!authorUid) throw new ModerationRepositoryError(409, "El mensaje no tiene un autor válido.");
    actionReference = getAdminDb().collection("users").doc(authorUid);
    actionSnapshot = await transaction.get(actionReference);
    if (!actionSnapshot.exists) {
      throw new ModerationRepositoryError(404, "El autor del mensaje ya no existe.");
    }
  }
  return { actionReference, actionSnapshot, reportedSnapshot };
}

function applyAction(
  transaction: Transaction,
  reference: DocumentReference,
  current: DocumentData,
  action: ModerationAction,
  input: ResolutionInput,
  actorUid: string,
  now: Timestamp,
) {
  if (action === "dismiss") return;
  if (action === "message_hide") {
    transaction.update(reference, {
      hidden: true,
      hiddenAt: now,
      hiddenBy: actorUid,
      updatedAt: now,
    });
  } else if (action === "message_restore") {
    transaction.update(reference, {
      hidden: false,
      hiddenAt: null,
      hiddenBy: null,
      updatedAt: now,
    });
  } else if (action === "user_block") {
    const until = Timestamp.fromDate(new Date(input.blockedUntil!));
    if (until.toMillis() <= now.toMillis()) {
      throw new ModerationRepositoryError(400, "La fecha de desbloqueo debe estar en el futuro.");
    }
    transaction.update(reference, {
      blocked: true,
      blockedUntil: until,
      blockedReason: input.reason,
      blockedBy: actorUid,
      updatedAt: now,
    });
  } else if (action === "user_unblock") {
    transaction.update(reference, {
      blocked: false,
      blockedUntil: null,
      blockedReason: null,
      blockedBy: null,
      updatedAt: now,
    });
  } else if (action === "trust_revoke" || action === "trust_restore") {
    const verified = action === "trust_restore";
    transaction.update(reference, {
      studentStatus: verified ? "verified" : "revoked",
      studentVerifiedAt: verified ? now : current.studentVerifiedAt ?? null,
      studentRevokedAt: verified ? null : now,
      updatedAt: now,
    });
  } else if (action === "store_request_changes") {
    transaction.update(reference, {
      status: "changes_required",
      reviewMessage: input.reason,
      updatedAt: now,
    });
  } else if (action === "store_suspend") {
    transaction.update(reference, {
      status: "suspended",
      suspensionReason: input.reason,
      suspendedAt: now,
      updatedAt: now,
    });
  } else if (action === "store_reactivate") {
    transaction.update(reference, {
      status: "active",
      suspensionReason: null,
      updatedAt: now,
    });
  }
}

export async function resolveReport(
  actor: { uid: string; role: AdminRole },
  reportId: string,
  input: ResolutionInput,
): Promise<ReportDetail> {
  const db = getAdminDb();
  const reportReference = db.collection("reports").doc(reportId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reportReference);
    if (!snapshot.exists) throw new ModerationRepositoryError(404, "Reporte no encontrado.");
    const report = toReportRecord(snapshot.id, snapshot.data()!);
    try {
      assertReportTransition(report.status, input.action === "dismiss" ? "dismissed" : "resolved");
      assertActionAllowed(report.targetType, input.action);
    } catch (error) {
      throw new ModerationRepositoryError(
        409,
        error instanceof Error ? error.message : "El reporte ya fue resuelto.",
        report,
      );
    }

    const actionTarget = await readActionTarget(transaction, report, input.action);
    const now = Timestamp.now();
    try {
      assertModerationState(
        report.targetType,
        input.action,
        actionTarget.actionSnapshot.data()!,
        now.toDate(),
      );
    } catch (error) {
      throw new ModerationRepositoryError(
        409,
        error instanceof Error ? error.message : "La acción no es válida en el estado actual.",
        report,
      );
    }
    applyAction(
      transaction,
      actionTarget.actionReference,
      actionTarget.actionSnapshot.data()!,
      input.action,
      input,
      actor.uid,
      now,
    );

    const status: ReportStatus = input.action === "dismiss" ? "dismissed" : "resolved";
    transaction.update(reportReference, {
      status,
      assignedAdminUid: report.assignedAdminUid ?? actor.uid,
      updatedAt: now,
      resolvedAt: now,
      resolutionAction: input.action,
      resolutionNote: input.reason,
    });
    if (report.openKeyId) {
      transaction.delete(db.collection("open_report_keys").doc(report.openKeyId));
    }
    transaction.create(db.collection("admin_audit_logs").doc(), {
      actorUid: actor.uid,
      actorRole: actor.role,
      action: auditAction(input.action),
      targetType: input.action === "dismiss" ? "report" : report.targetType,
      targetId: input.action === "dismiss" ? report.id : actionTarget.actionReference.id,
      metadata: {
        reportId: report.id,
        reason: input.reason,
        resolutionAction: input.action,
        previousState: actionTarget.actionSnapshot.data(),
      },
      createdAt: now,
    });
  });

  return getReportForAdmin(reportId);
}

export async function listReportedMessages(
  filters: AdminReportFilters,
): Promise<Array<{ report: ReportRecord; context: GeneralChatMessage[] }>> {
  const reports = (await listReportsForAdmin({ ...filters, targetType: "message" }))
    .filter((report) => report.status === "open" || report.status === "in_review");
  return Promise.all(reports.map(async (report) => ({
    report,
    context: await loadGeneralChatContext(report.targetId),
  })));
}

export async function createGeneralChatMessage(
  actorUid: string,
  input: unknown,
): Promise<GeneralChatMessage> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ModerationRepositoryError(400, "El mensaje no contiene datos válidos.");
  }
  const value = input as Record<string, unknown>;
  const text = typeof value.text === "string" ? value.text.trim() : "";
  const imageUrls = Array.isArray(value.imageUrls)
    ? value.imageUrls.filter((url): url is string => typeof url === "string" && /^https:\/\//.test(url)).slice(0, 4)
    : [];
  if (!text && imageUrls.length === 0) {
    throw new ModerationRepositoryError(400, "El mensaje está vacío.");
  }
  if (text.length > 1000) {
    throw new ModerationRepositoryError(400, "El mensaje no puede exceder 1000 caracteres.");
  }

  const db = getAdminDb();
  const profile = await db.collection("users").doc(actorUid).get();
  if (!profile.exists) throw new ModerationRepositoryError(404, "Usuario no encontrado.");
  const user = profile.data()!;
  if (isAdministrativeBlockActive(user)) {
    throw new ModerationRepositoryError(403, "Tu cuenta está bloqueada temporalmente para realizar esta acción.");
  }
  const now = Date.now();
  const reference = db.collection("messages").doc();
  const record = {
    text,
    senderId: actorUid,
    senderName: String(user.nickname ?? user.displayName ?? "Usuario"),
    senderPhotoURL: String(user.photoURL ?? ""),
    senderRole: value.senderRole === "seller" ? "seller" as const : "buyer" as const,
    senderPlan: user.plan === "premium" ? "premium" as const : "free" as const,
    createdAt: now,
    expiresAt: now + 48 * 60 * 60 * 1000,
    messageType: imageUrls.length
      ? "image" as const
      : value.messageType === "template"
        ? "template" as const
        : "custom" as const,
    imageUrls,
    replyTo: value.replyTo && typeof value.replyTo === "object"
      ? {
          id: String((value.replyTo as Record<string, unknown>).id ?? "").slice(0, 160),
          senderName: String((value.replyTo as Record<string, unknown>).senderName ?? "").slice(0, 80),
          text: String((value.replyTo as Record<string, unknown>).text ?? "").slice(0, 160),
        }
      : null,
    hidden: false,
  };
  await reference.create(record);
  return generalMessage(reference.id, record);
}
