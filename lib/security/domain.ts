export type AdminRole = "superadmin" | "subadmin";
export type StudentTrustStatus = "pending" | "verified" | "revoked";

export const ENDORSEMENTS_REQUIRED = 2;
export const MAX_ENDORSEMENTS_PER_PERIOD = 5;

export function effectiveAdminRole(profile: unknown): AdminRole | null {
  if (!profile || typeof profile !== "object") return null;

  const data = profile as Record<string, unknown>;
  const role = String(
    data.role ?? data.userRole ?? data.type ?? data.accountType ?? "",
  )
    .trim()
    .toLowerCase();

  if (role === "subadmin") return "subadmin";

  if (
    role === "superadmin" ||
    role === "admin" ||
    role === "administrator" ||
    data.isAdmin === true ||
    data.admin === true
  ) {
    return "superadmin";
  }

  return null;
}

export function isAdminRole(profile: unknown): boolean {
  return effectiveAdminRole(profile) !== null;
}

export function isSuperadminRole(profile: unknown): boolean {
  return effectiveAdminRole(profile) === "superadmin";
}

export function normalizeStudentTrustStatus(value: unknown): StudentTrustStatus {
  return value === "verified" || value === "revoked" ? value : "pending";
}

export function trustPeriodId(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const period = date.getUTCMonth() < 6 ? 1 : 2;
  return `${year}-${period}`;
}

export interface EndorsementEligibilityInput {
  endorserUid: string;
  targetUid: string;
  endorserStatus: StudentTrustStatus;
  targetStatus: StudentTrustStatus;
  alreadyEndorsed: boolean;
  endorsementsGivenThisPeriod: number;
}

export type EndorsementEligibility =
  | { allowed: true }
  | { allowed: false; reason: string };

export function canEndorseStudent(
  input: EndorsementEligibilityInput,
): EndorsementEligibility {
  if (input.endorserUid === input.targetUid) {
    return { allowed: false, reason: "No puedes avalarte a ti mismo." };
  }

  if (input.endorserStatus !== "verified") {
    return {
      allowed: false,
      reason: "Solo un alumno confirmado puede avalar a otro alumno.",
    };
  }

  if (input.targetStatus === "verified") {
    return { allowed: false, reason: "Este alumno ya está confirmado." };
  }

  if (input.targetStatus === "revoked") {
    return {
      allowed: false,
      reason: "Esta cuenta requiere revisión administrativa antes de poder confirmarse.",
    };
  }

  if (input.alreadyEndorsed) {
    return { allowed: false, reason: "Ya avalaste a este alumno." };
  }

  if (input.endorsementsGivenThisPeriod >= MAX_ENDORSEMENTS_PER_PERIOD) {
    return {
      allowed: false,
      reason: "Ya utilizaste tus 5 avales disponibles en este periodo.",
    };
  }

  return { allowed: true };
}
