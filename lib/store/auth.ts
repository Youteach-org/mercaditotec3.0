import type { DecodedIdToken } from "firebase-admin/auth";

import {
  effectiveAdminRole,
  isAdminRole,
  isSuperadminRole,
} from "../security/domain";
import { isAdministrativeBlockActive } from "../moderation/domain";
import { getAdminAuth } from "../firebaseAdmin";
import { getAdminDb } from "../firestoreRest";

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
}

export function isAdminProfile(profile: unknown): boolean {
  return isAdminRole(profile);
}

async function loadProfile(uid: string) {
  const profileSnapshot = await getAdminDb()
    .collection("users")
    .doc(uid)
    .get();

  return profileSnapshot.data();
}

export function assertUserMayMutate(
  profile: Record<string, unknown> | undefined,
  now = new Date(),
): void {
  if (profile && isAdministrativeBlockActive(profile, now)) {
    throw new ApiAuthError(
      403,
      "Tu cuenta está bloqueada temporalmente para realizar esta acción.",
    );
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
    return { uid: claims.uid, claims };
  } catch {
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
  assertUserMayMutate(await loadProfile(user.uid));
  return user;
}

export async function requireAdmin(
  request: Request,
): Promise<AuthenticatedUser> {
  const user = await requireFirebaseUser(request);
  const profile = await loadProfile(user.uid);

  if (profile) {
    if (!isAdminRole(profile)) {
      throw new ApiAuthError(403, "No tienes permisos de administrador.");
    }
    return user;
  }

  if (!isAdminRole(user.claims)) {
    throw new ApiAuthError(403, "No tienes permisos de administrador.");
  }

  return user;
}

export async function requireSuperadmin(
  request: Request,
): Promise<AuthenticatedUser> {
  const user = await requireFirebaseUser(request);
  const profile = await loadProfile(user.uid);

  if (profile) {
    if (!isSuperadminRole(profile)) {
      throw new ApiAuthError(403, "Solo el superadmin puede realizar esta acción.");
    }
    return user;
  }

  if (!isSuperadminRole(user.claims)) {
    throw new ApiAuthError(403, "Solo el superadmin puede realizar esta acción.");
  }

  return user;
}

export async function getAuthenticatedAdminRole(
  user: AuthenticatedUser,
) {
  const profile = await loadProfile(user.uid);
  if (profile) return effectiveAdminRole(profile);

  return effectiveAdminRole(user.claims);
}
