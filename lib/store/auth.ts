import type { DecodedIdToken } from "firebase-admin/auth";

import {
  getAdminAuth,
  getAdminDb,
} from "../firebaseAdmin";

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

export function isAdminProfile(
  profile: unknown,
): boolean {
  if (!profile || typeof profile !== "object") {
    return false;
  }

  const data = profile as Record<string, unknown>;

  const role = String(
    data.role ??
      data.userRole ??
      data.type ??
      data.accountType ??
      "",
  )
    .trim()
    .toLowerCase();

  return (
    role === "admin" ||
    role === "administrator" ||
    data.isAdmin === true ||
    data.admin === true
  );
}

export async function requireFirebaseUser(
  request: Request,
): Promise<AuthenticatedUser> {
  const authorization =
    request.headers.get("authorization") ?? "";

  if (!authorization.startsWith("Bearer ")) {
    throw new ApiAuthError(
      401,
      "Debes iniciar sesión.",
    );
  }

  const token = authorization
    .slice("Bearer ".length)
    .trim();

  if (!token) {
    throw new ApiAuthError(
      401,
      "Debes iniciar sesión.",
    );
  }

  try {
    const claims =
      await getAdminAuth().verifyIdToken(
        token,
        true,
      );

    return {
      uid: claims.uid,
      claims,
    };
  } catch {
    throw new ApiAuthError(
      401,
      "La sesión no es válida o ha expirado.",
    );
  }
}

export async function requireAdmin(
  request: Request,
): Promise<AuthenticatedUser> {
  const user =
    await requireFirebaseUser(request);

  if (isAdminProfile(user.claims)) {
    return user;
  }

  const profileSnapshot =
    await getAdminDb()
      .collection("users")
      .doc(user.uid)
      .get();

  if (
    !isAdminProfile(
      profileSnapshot.data(),
    )
  ) {
    throw new ApiAuthError(
      403,
      "No tienes permisos de administrador.",
    );
  }

  return user;
}
