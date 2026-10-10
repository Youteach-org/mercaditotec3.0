import { Timestamp } from "../firestoreRest";

import { getAdminDb } from "../firestoreRest";
import {
  effectiveAdminRole,
  normalizeStudentTrustStatus,
  type AdminRole,
  type StudentTrustStatus,
} from "./domain";
import { writeAuditEntry } from "./audit";
import { isAdministrativeBlockActive } from "../moderation/domain";

export class AdminUserError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface AdminUserSummary {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  adminRole: AdminRole | null;
  studentStatus: StudentTrustStatus;
  studentEndorsementCount: number;
  isActive: boolean;
  blocked: boolean;
  createdAt: string | null;
  registrationSource: string | null;
  manualActivationStatus: string | null;
}

export function parseAdminTrustChange(input: unknown): "revoked" {
  if (!input || typeof input !== "object") {
    throw new AdminUserError(400, "Acción de confianza inválida.");
  }
  const status = String((input as Record<string, unknown>).status ?? "");
  if (status === "verified") {
    throw new AdminUserError(
      409,
      "La confirmación de alumno se obtiene únicamente con 2 avales.",
    );
  }
  if (status !== "revoked") {
    throw new AdminUserError(400, "Acción de confianza inválida.");
  }
  return status;
}

export function parseAdminRoleChange(input: unknown): "subadmin" | "user" {
  if (!input || typeof input !== "object") {
    throw new AdminUserError(400, "Acción de administrador inválida.");
  }
  const role = String((input as Record<string, unknown>).role ?? "");
  if (role !== "subadmin" && role !== "user") {
    throw new AdminUserError(400, "Acción de administrador inválida.");
  }
  return role;
}

function createdAtIso(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return null;
}

function toSummary(uid: string, data: Record<string, unknown>): AdminUserSummary {
  const endorsementCount = Number(data.studentEndorsementCount ?? 0);
  return {
    uid,
    email: String(data.email ?? ""),
    displayName: String(data.displayName ?? ""),
    role: String(data.role ?? "user"),
    adminRole: effectiveAdminRole(data),
    studentStatus: normalizeStudentTrustStatus(data.studentStatus),
    studentEndorsementCount: Number.isFinite(endorsementCount)
      ? Math.max(0, endorsementCount)
      : 0,
    isActive: data.isActive !== false,
    blocked: isAdministrativeBlockActive(data),
    createdAt: createdAtIso(data.createdAt),
    registrationSource: typeof data.registrationSource === "string" ? data.registrationSource : null,
    manualActivationStatus: typeof data.manualActivationStatus === "string" ? data.manualActivationStatus : null,
  };
}

export async function listUsersForAdmin(): Promise<AdminUserSummary[]> {
  const snapshot = await getAdminDb().collection("users").list(250);
  return snapshot.docs
    .map((document) => toSummary(document.id, document.data()))
    .sort((a, b) =>
      (a.email || a.displayName || a.uid).localeCompare(
        b.email || b.displayName || b.uid,
        "es",
      ),
    );
}

export async function setStudentTrustByAdmin(
  actorUid: string,
  actorRole: AdminRole,
  targetUid: string,
  status: "revoked",
): Promise<AdminUserSummary> {
  const db = getAdminDb();
  const reference = db.collection("users").doc(targetUid);
  const snapshot = await reference.get();
  if (!snapshot.exists) {
    throw new AdminUserError(404, "Usuario no encontrado.");
  }

  const current = snapshot.data() ?? {};
  const previousStatus = normalizeStudentTrustStatus(current.studentStatus);
  const now = Timestamp.now();

  const update: Record<string, unknown> = {
    studentStatus: "revoked",
    studentRevokedAt: now,
    updatedAt: now,
  };

  await reference.update(update);
  await writeAuditEntry({
    actorUid,
    actorRole,
    action: "user.student.revoke",
    targetType: "user",
    targetId: targetUid,
    metadata: { previousStatus, nextStatus: "revoked" },
  });

  return toSummary(targetUid, { ...current, ...update });
}

export async function setUserRoleBySuperadmin(
  actorUid: string,
  targetUid: string,
  role: "subadmin" | "user",
): Promise<AdminUserSummary> {
  if (actorUid === targetUid) {
    throw new AdminUserError(
      409,
      "No puedes modificar tu propio nivel de administración desde este control.",
    );
  }

  const db = getAdminDb();
  const reference = db.collection("users").doc(targetUid);
  const snapshot = await reference.get();
  if (!snapshot.exists) {
    throw new AdminUserError(404, "Usuario no encontrado.");
  }

  const current = snapshot.data() ?? {};
  const previousAdminRole = effectiveAdminRole(current);
  if (previousAdminRole === "superadmin") {
    throw new AdminUserError(
      409,
      "No puedes modificar otra cuenta de superadmin desde este control.",
    );
  }

  if (role === "subadmin" && current.registrationSource === "manual_admin") {
    throw new AdminUserError(409,
      "Una cuenta activada presencialmente no puede ser subadmin sin verificar el correo en Firebase.");
  }

  const now = Timestamp.now();
  await reference.update({ role, updatedAt: now });

  await writeAuditEntry({
    actorUid,
    actorRole: "superadmin",
    action: role === "subadmin" ? "admin.subadmin.assign" : "admin.subadmin.remove",
    targetType: "admin",
    targetId: targetUid,
    metadata: { previousRole: String(current.role ?? "user"), nextRole: role },
  });

  return toSummary(targetUid, { ...current, role, updatedAt: now });
}
