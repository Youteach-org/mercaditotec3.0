import { parseImageUploadPath } from "../store/media";
import type { DecodedIdToken } from "../firebaseAdmin";
import { getAdminDb, Timestamp } from "../firestoreRest";
import { isAdminRole, studentControlEligibility } from "./domain";\nimport { normalizeWhatsappNumber, WhatsappNumberError } from "./whatsapp";

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

export function validateProfileImageUrl(uid: string, value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new AccountProfileError(400, "La URL de la foto no es válida."); }
  const prefix = "/storage/v1/object/public/chat-images/";
  if (url.origin !== "https://wfmokinfcypfpdisussw.supabase.co" || !url.pathname.startsWith(prefix) || url.search || url.hash || url.username || url.password) throw new AccountProfileError(400, "La foto no pertenece al almacenamiento permitido.");
  const path = url.pathname.slice(prefix.length);
  try { parseImageUploadPath(path, uid); } catch { throw new AccountProfileError(403, "La foto no pertenece a tu cuenta."); }
  if (!path.startsWith(`profile-images/${uid}/`)) throw new AccountProfileError(403, "La foto no pertenece a tu cuenta.");
  return url.toString();
}

export function buildOwnProfileUpdate(
  input: unknown,
  now: Date = new Date(),
  uid?: string,
): Record<string, unknown> {
  if (!input || typeof input !== "object") {
    throw new AccountProfileError(400, "Datos de perfil inválidos.");
  }

  const body = input as Record<string, unknown>;
  const update: Record<string, unknown> = {
    updatedAt: Timestamp.fromDate(now),
  };

  if (Object.prototype.hasOwnProperty.call(body, "displayName")) {
    const displayName = String(body.displayName ?? "").trim();
    if (displayName.length < 1 || displayName.length > 60) {
      throw new AccountProfileError(
        400,
        "El nombre visible debe tener entre 1 y 60 caracteres.",
      );
    }
    update.displayName = displayName;
  }

  if (Object.prototype.hasOwnProperty.call(body, "photoURL")) {
    const photoURL = String(body.photoURL ?? "").trim();
    if (photoURL && !uid) {
      throw new AccountProfileError(400, "Falta el usuario para validar la foto.");
    }
    update.photoURL = photoURL ? validateProfileImageUrl(uid!, photoURL) : "";
  }

  if (Object.prototype.hasOwnProperty.call(body, "whatsappNumber")) {
    try {
      update.whatsappNumber = normalizeWhatsappNumber(body.whatsappNumber);
    } catch (error) {
      if (error instanceof WhatsappNumberError) {
        throw new AccountProfileError(400, error.message);
      }
      throw error;
    }
  }

  if (
    !("displayName" in update) &&
    !("photoURL" in update) &&
    !("whatsappNumber" in update)
  ) {
    throw new AccountProfileError(400, "No hay cambios de perfil permitidos.");
  }

  return update;
}

export async function updateOwnProfile(uid: string, input: unknown): Promise<void> {
  const update = buildOwnProfileUpdate(input, new Date(), uid);

  const reference = getAdminDb().collection("users").doc(uid);
  const snapshot = await reference.get();
  if (!snapshot.exists) {
    throw new AccountProfileError(404, "Tu perfil de usuario no está disponible.");
  }

  await reference.update(update);
}
