import type { DecodedIdToken } from "../firebaseAdmin";

import {
  effectiveAdminRole,
  isAdminRole,
  isSuperadminRole,
  studentAccessEligibility,
} from "../security/domain";
import { isAdministrativeBlockActive } from "../moderation/domain";
import { getAdminAuth } from "../firebaseAdmin";
import { FirestoreRestError, getAdminDb } from "../firestoreRest";
import { consumeMutationBudget, MutationLimitError } from "../security/rateLimit";

export class ApiAuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface AuthenticatedUser {
  uid: string;
  claims: DecodedIdToken;
  /** Server-read profile, never trust role claims when the record is missing. */
  profile?: Record<string, unknown>;
}

export function isAdminProfile(profile: unknown): boolean {
  return isAdminRole(profile);
}

// Deduplicate overlapping reads for the same account within one Worker.
// Entries are deleted as soon as the read finishes: do not cache revocations,
// role changes, moderation blocks, or an account that was subsequently deleted.
const inFlightProfiles = new Map<string, Promise<Record<string, unknown> | undefined>>();

async function loadProfile(uid: string): Promise<Record<string, unknown> | undefined> {
  let pending = inFlightProfiles.get(uid);
  if (!pending) {
    pending = getAdminDb().collection("users").doc(uid).get()
      .then(snapshot => snapshot.data() as Record<string, unknown> | undefined)
      .finally(() => { inFlightProfiles.delete(uid); });
    inFlightProfiles.set(uid, pending);
  }
  return pending;
}

export function assertUserMayMutate(
  profile: Record<string, unknown> | undefined,
  now = new Date(),
): void {
  if (profile?.isActive === false) {
    throw new ApiAuthError(403, "Tu cuenta está desactivada.");
  }
  if (profile && isAdministrativeBlockActive(profile, now)) {
    throw new ApiAuthError(
      403,
      "Tu cuenta está bloqueada temporalmente para realizar esta acción.",
    );
  }
}

export function assertStudentMayEnter(
  profile: Record<string, unknown> | undefined,
  claims: Record<string, unknown>,
  now = new Date(),
): void {
  // A Firebase ID token by itself never establishes an eligible student.
  // In particular, no legacy "admin" custom claim can replace a profile.
  if (!profile) {
    throw new ApiAuthError(403, "Tu cuenta no está habilitada para entrar al Mercadito.");
  }
  const email =
    typeof claims.email === "string"
      ? claims.email
      : "";
  // Authorization trusts Firebase Authentication, never a mutable Firestore mirror.
  const emailVerified = claims.email_verified === true;

  const eligibility = studentAccessEligibility({
    email,
    emailVerified,
    profile,
    now,
  });

  if (!eligibility.allowed) {
    throw new ApiAuthError(403, eligibility.reason);
  }
}

export async function requireFirebaseUser(
  request: Request,
): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.startsWith("Bearer ")) {
    throw new ApiAuthError(401, "Debes iniciar sesión.");
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    throw new ApiAuthError(401, "Debes iniciar sesión.");
  }

  try {
    const claims = await getAdminAuth().verifyIdToken(token, true);
    const profile = await loadProfile(claims.uid);
    // Firebase Authentication alone is NOT Mercadito authorization.
    // A direct Firebase signup, an incomplete bootstrap, or a deleted
    // profile must never gain access via token claims alone.
    if (!profile) {
      throw new ApiAuthError(403, "Tu cuenta no está habilitada para entrar al Mercadito.");
    }
    if (profile.isActive === false) {
      throw new ApiAuthError(403, "Tu cuenta está desactivada.");
    }
    assertStudentMayEnter(
      profile,
      claims as unknown as Record<string, unknown>,
    );
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      assertUserMayMutate(profile);
      await consumeMutationBudget(claims.uid);
    }
    return { uid: claims.uid, claims, profile };
  } catch (error) {
    if (error instanceof MutationLimitError) throw new ApiAuthError(429, error.message);
    if (error instanceof Error && (
      error.name === "FirebaseAuthUnavailableError" ||
      error.name === "GoogleOAuthUnavailableError"
    )) {
      console.error("AUTH_IDENTITY_PROVIDER_UNAVAILABLE");
      throw new ApiAuthError(503, "Firebase no puede verificar el acceso temporalmente. Inténtalo de nuevo.");
    }
    if (error instanceof ApiAuthError) throw error;
    if (error instanceof FirestoreRestError && (error.status === 403 || error.status === 429 || error.status >= 500)) {
      // Database saturation must not be presented as an expired login.
      console.error("AUTH_PROFILE_DATA_UNAVAILABLE", error.status);
      throw new ApiAuthError(503, "El servicio de datos está temporalmente saturado. Inténtalo más tarde.");
    }
    throw new ApiAuthError(
      401,
      "La sesión no es válida o ha expirado.",
    );
  }
}

export async function requireUnblockedUser(
  request: Request,
): Promise<AuthenticatedUser> {
  const user = await requireFirebaseUser(request);
  assertUserMayMutate(user.profile);
  return user;
}

export async function requireAdmin(
  request: Request,
): Promise<AuthenticatedUser> {
  const user = await requireFirebaseUser(request);
  const profile = user.profile;
  // Fail closed: a missing Firestore record cannot grant privilege from
  // stale Firebase custom claims or local browser state.
  if (!profile || !isAdminRole(profile)) {
    throw new ApiAuthError(403, "No tienes permisos de administrador.");
  }
  assertUserMayMutate(profile);
  return user;
}

export async function requireSuperadmin(
  request: Request,
): Promise<AuthenticatedUser> {
  const user = await requireFirebaseUser(request);
  const profile = user.profile;
  if (!profile || !isSuperadminRole(profile)) {
    throw new ApiAuthError(403, "Solo el superadmin puede realizar esta acción.");
  }
  assertUserMayMutate(profile);
  return user;
}

export async function getAuthenticatedAdminRole(
  user: AuthenticatedUser,
) {
  return effectiveAdminRole(user.profile);
}
