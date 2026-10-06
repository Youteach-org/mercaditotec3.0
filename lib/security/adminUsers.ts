import { deleteFirebaseAuthUser } from "../firebaseAdmin";
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
  username: string;
  displayName: string;
  role: string;
  adminRole: AdminRole | null;
  studentStatus: StudentTrustStatus;
  studentEndorsementCount: number;
  isActive: boolean;
  blocked: boolean;
  createdAt: string | null;
}

export function parseAdminTrustChange(input: unknown): "verified" | "revoked" {
  if (!input || typeof input !== "object") {
    throw new AdminUserError(400, "Acción de confianza inválida.");
  }
  const status = String((input as Record<string, unknown>).status ?? "");
  if (status !== "verified" && status !== "revoked") {
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
  const email = String(data.email ?? "").trim().toLowerCase();
  const username =
    String(data.nickname ?? "").trim() ||
    String(data.emailLocalPart ?? "").trim().toLowerCase() ||
    email.split("@", 1)[0] ||
    String(data.displayName ?? "").trim();

  return {
    uid,
    email,
    username,
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
  status: "verified" | "revoked",
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

  if (status === "verified" && actorRole !== "superadmin") {
    throw new AdminUserError(
      403,
      "Solo el Superadmin puede aprobar manualmente a un alumno pendiente.",
    );
  }

  if (status === "verified" && previousStatus !== "pending") {
    throw new AdminUserError(
      409,
      "La aprobación manual solo está disponible para alumnos pendientes.",
    );
  }

  const update: Record<string, unknown> =
    status === "verified"
      ? {
          studentStatus: "verified",
          studentVerifiedAt: now,
          studentRevokedAt: null,
          updatedAt: now,
        }
      : {
          studentStatus: "revoked",
          studentRevokedAt: now,
          updatedAt: now,
        };

  await reference.update(update);
  await writeAuditEntry({
    actorUid,
    actorRole,
    action:
      status === "verified"
        ? "user.student.verify-manual"
        : "user.student.revoke",
    targetType: "user",
    targetId: targetUid,
    metadata: {
      previousStatus,
      nextStatus: status,
      endorsementCount: Number(current.studentEndorsementCount ?? 0),
      manualOverride: status === "verified",
    },
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


export async function deleteUserBySuperadmin(
  actorUid: string,
  targetUid: string,
): Promise<{ uid: string; email: string; username: string }> {
  if (actorUid === targetUid) {
    throw new AdminUserError(
      409,
      "No puedes eliminar tu propia cuenta activa.",
    );
  }

  const db = getAdminDb();
  const reference = db.collection("users").doc(targetUid);
  const snapshot = await reference.get();

  if (!snapshot.exists) {
    throw new AdminUserError(404, "Usuario no encontrado.");
  }

  const current = snapshot.data() ?? {};
  if (effectiveAdminRole(current) === "superadmin") {
    throw new AdminUserError(
      409,
      "No se puede eliminar una cuenta Superadmin desde este control.",
    );
  }

  const ownedStores = await db
    .collection("stores")
    .where("ownerUid", "==", targetUid)
    .limit(1)
    .get();

  if (!ownedStores.empty) {
    throw new AdminUserError(
      409,
      "Este usuario todavía tiene una tienda. Elimina o reasigna su tienda antes de borrar la cuenta.",
    );
  }

  const summary = toSummary(targetUid, current);

  try {
    await deleteFirebaseAuthUser(targetUid);
  } catch (error) {
    throw new AdminUserError(
      502,
      error instanceof Error
        ? `Firebase no permitió eliminar la cuenta: ${error.message}`
        : "Firebase no permitió eliminar la cuenta.",
    );
  }

  for (const childCollection of ["endorsements", "trust_counters"]) {
    const childSnapshot = await reference.collection(childCollection).list(500);
    if (!childSnapshot.empty) {
      const batch = db.batch();
      childSnapshot.docs.forEach((document) => batch.delete(document.ref));
      await batch.commit();
    }
  }

  await reference.delete();

  await writeAuditEntry({
    actorUid,
    actorRole: "superadmin",
    action: "user.delete",
    targetType: "user",
    targetId: targetUid,
    metadata: {
      email: summary.email,
      username: summary.username,
      previousRole: summary.role,
      previousStudentStatus: summary.studentStatus,
      endorsementCount: summary.studentEndorsementCount,
    },
  });

  return {
    uid: summary.uid,
    email: summary.email,
    username: summary.username,
  };
}
