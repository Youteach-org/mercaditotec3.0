import type { DecodedIdToken } from "../firebaseAdmin";
import { getAdminDb, Timestamp } from "../firestoreRest";
import { isAdminRole, studentControlEligibility } from "./domain";

const INSTITUTIONAL_DOMAIN = "@morelia.tecnm.mx";

export class AccountProfileError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export interface InstitutionalIdentity {
  email: string;
  localPart: string;
  controlNumber?: string;
  entryYear?: number;
}

function tokenEmail(claims: DecodedIdToken): string {
  const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  if (!email) throw new AccountProfileError(403, "La cuenta no tiene un correo institucional válido.");
  return email;
}

export function institutionalIdentity(
  emailInput: string,
  options: { requireStudentControl: boolean; now?: Date },
): InstitutionalIdentity {
  const email = emailInput.trim().toLowerCase();
  if (!email.endsWith(INSTITUTIONAL_DOMAIN) || email === INSTITUTIONAL_DOMAIN) {
    throw new AccountProfileError(403, "Debes usar un correo institucional @morelia.tecnm.mx.");
  }

  const localPart = email.slice(0, -INSTITUTIONAL_DOMAIN.length);
  if (!options.requireStudentControl) return { email, localPart };

  const eligibility = studentControlEligibility(localPart, options.now ?? new Date());
  if (!eligibility.allowed) throw new AccountProfileError(403, eligibility.reason);

  return {
    email,
    localPart,
    controlNumber: eligibility.controlNumber,
    entryYear: eligibility.entryYear,
  };
}

function newStudentProfile(identity: InstitutionalIdentity, emailVerified: boolean, now: Date) {
  const stamp = Timestamp.fromDate(now);
  return {
    email: identity.email,
    emailLocalPart: identity.localPart,
    emailVerified,
    displayName: identity.localPart,
    photoURL: "",
    plan: "free",
    role: "user",
    isActive: true,
    blocked: false,
    studentStatus: "pending",
    studentEndorsementCount: 0,
    studentVerifiedAt: null,
    studentRevokedAt: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export async function bootstrapAccountProfile(
  claims: DecodedIdToken,
  now: Date = new Date(),
): Promise<void> {
  const identity = institutionalIdentity(tokenEmail(claims), {
    requireStudentControl: true,
    now,
  });
  const reference = getAdminDb().collection("users").doc(claims.uid);
  const snapshot = await reference.get();

  if (!snapshot.exists) {
    await reference.set(newStudentProfile(identity, claims.email_verified === true, now));
    return;
  }

  await reference.update({
    email: identity.email,
    emailLocalPart: identity.localPart,
    updatedAt: Timestamp.fromDate(now),
  });
}

export async function syncVerifiedAccountProfile(
  claims: DecodedIdToken,
  now: Date = new Date(),
): Promise<void> {
  if (claims.email_verified !== true) {
    throw new AccountProfileError(403, "Debes verificar tu correo institucional antes de entrar.");
  }

  const email = tokenEmail(claims);
  const reference = getAdminDb().collection("users").doc(claims.uid);
  const snapshot = await reference.get();
  const existing = snapshot.data();

  const identity = institutionalIdentity(email, {
    requireStudentControl: !isAdminRole(existing),
    now,
  });

  if (!snapshot.exists) {
    await reference.set(newStudentProfile(identity, true, now));
    return;
  }

  await reference.update({
    email: identity.email,
    emailLocalPart: identity.localPart,
    emailVerified: true,
    updatedAt: Timestamp.fromDate(now),
  });
}
