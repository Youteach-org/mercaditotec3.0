import {
  FIREBASE_WEB_API_KEY,
  getAdminAccessToken,
  getFirebaseProjectId,
} from "../firebaseAdmin";
import { getAdminDb, Timestamp } from "../firestoreRest";
import { AccountProfileError, institutionalIdentity } from "./accountProfile";
import { AdminUserError } from "./adminUsers";
import { isAdminRole } from "./domain";

const EXPIRY_MS = 48 * 60 * 60 * 1000;
const LEASE_MS = 2 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export interface ManualRegistration {
  email: string;
  localPart: string;
  displayName: string;
}

export function parseManualRegistration(input: unknown): ManualRegistration {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AdminUserError(400, "Datos de alta inválidos.");
  }
  const data = input as Record<string, unknown>;
  if (Object.keys(data).some(key => !["email", "displayName", "identityChecked"].includes(key))) {
    throw new AdminUserError(400, "No se permiten campos de permisos o verificación.");
  }
  if (data.identityChecked !== true) {
    throw new AdminUserError(400, "Confirma que comprobaste personalmente la identidad.");
  }
  if (typeof data.email !== "string" || typeof data.displayName !== "string") {
    throw new AdminUserError(400, "Indica nombre y correo institucional.");
  }

  let identity;
  try {
    identity = institutionalIdentity(data.email, { requireStudentControl: true });
  } catch (error) {
    if (error instanceof AccountProfileError) {
      throw new AdminUserError(400, error.message);
    }
    throw error;
  }

  const displayName = data.displayName.trim().replace(/\s+/g, " ");
  if (displayName.length < 2 || displayName.length > 60 ||
      /[\u0000-\u001f\u007f]/.test(displayName)) {
    throw new AdminUserError(400, "El nombre debe tener entre 2 y 60 caracteres.");
  }
  return { email: identity.email, localPart: identity.localPart, displayName };
}

async function adminAuthRequest(suffix: string, input: Record<string, unknown>): Promise<Response> {
  const projectId = encodeURIComponent(getFirebaseProjectId());
  return fetch(
    "https://identitytoolkit.googleapis.com/v1/projects/" + projectId +
    "/accounts" + suffix + "?key=" + encodeURIComponent(FIREBASE_WEB_API_KEY),
    {
      method: "POST",
      headers: {
        authorization: "Bearer " + await getAdminAccessToken(),
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
}

async function createFirebaseUser(data: ManualRegistration): Promise<string> {
  const password = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte =>
    byte.toString(16).padStart(2, "0")).join("");
  const response = await adminAuthRequest("", {
    email: data.email, password, displayName: data.displayName,
    emailVerified: false, disabled: false,
  });
  const result = await response.json().catch(() => ({})) as {
    localId?: string; error?: { message?: string };
  };
  if (!response.ok) {
    if (result.error?.message?.includes("EMAIL_EXISTS")) {
      throw new AdminUserError(409, "El correo ya está registrado. No se modificó la cuenta.");
    }
    throw new AdminUserError(502, "Firebase no pudo crear la cuenta.");
  }
  if (!result.localId || !/^[A-Za-z0-9_-]{1,128}$/.test(result.localId)) {
    throw new AdminUserError(502, "Firebase devolvió un identificador inválido.");
  }
  return result.localId;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, "0")).join("");
}

function secureEqual(a: string, b: string): boolean {
  if (a.length !== 64 || b.length !== 64) return false;
  let diff = 0;
  for (let i = 0; i < 64; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function makeCode(uid: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const secret = btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const code = uid + "." + secret;
  return { code, hash: await sha256(code) };
}

export async function createManualUser(actorUid: string, data: ManualRegistration) {
  const uid = await createFirebaseUser(data);
  const db = getAdminDb();
  const generated = await makeCode(uid);
  const expiresAt = Timestamp.fromMillis(Date.now() + EXPIRY_MS);
  const now = Timestamp.now();

  const batch = db.batch();
  batch.create(db.collection("users").doc(uid), {
    email: data.email,
    emailLocalPart: data.localPart,
    emailVerified: false,
    displayName: data.displayName,
    photoURL: "",
    plan: "free",
    role: "user",
    isActive: true,
    blocked: false,
    studentStatus: "pending",
    studentEndorsementCount: 0,
    studentVerifiedAt: null,
    studentRevokedAt: null,
    registrationSource: "manual_admin",
    createdByAdminUid: actorUid,
    manualIdentityVerifiedBy: "",
    manualIdentityVerifiedAt: null,
    manualActivationStatus: "pending",
    manualActivationCodeHash: generated.hash,
    manualActivationExpiresAt: expiresAt,
    manualActivationAttempts: 0,
    createdAt: now,
    updatedAt: now,
  });
  batch.create(db.collection("admin_audit_logs").doc(), {
    actorUid,
    actorRole: "superadmin",
    action: "user.manual.create",
    targetType: "user",
    targetId: uid,
    metadata: { email: data.email, identityCheckedInPerson: true },
    createdAt: now,
  });

  try {
    await batch.commit();
  } catch (error) {
    try {
      const rollback = await adminAuthRequest(":delete", { localId: uid });
      if (!rollback.ok) console.error("MANUAL_USER_AUTH_ROLLBACK_FAILED", rollback.status);
    } catch (rollbackError) {
      console.error("MANUAL_USER_AUTH_ROLLBACK_FAILED", rollbackError);
    }
    console.error("MANUAL_USER_DB_CREATE_FAILED", error);
    throw new AdminUserError(502, "No se pudo guardar el perfil. Revisa antes de reintentar.");
  }

  return { user: { uid, email: data.email, displayName: data.displayName },
    activationCode: generated.code, activationExpiresAt: expiresAt.toDate().toISOString() };
}

export async function renewManualActivationCode(actorUid: string, uid: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) {
    throw new AdminUserError(400, "Identificador inválido.");
  }
  const db = getAdminDb();
  const ref = db.collection("users").doc(uid);
  const generated = await makeCode(uid);
  const expiresAt = Timestamp.fromMillis(Date.now() + EXPIRY_MS);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data || data.registrationSource !== "manual_admin" ||
        isAdminRole(data) || data.isActive === false) {
      throw new AdminUserError(409, "Esta cuenta no admite generar otro código.");
    }
    tx.update(ref, {
      manualActivationCodeHash: generated.hash,
      manualActivationExpiresAt: expiresAt,
      manualActivationAttempts: 0,
      manualActivationStatus: "pending",
      manualIdentityVerifiedAt: null,
      manualIdentityVerifiedBy: "",
      manualActivationLeaseUntil: null,
      updatedAt: Timestamp.now(),
    });
    tx.create(db.collection("admin_audit_logs").doc(), {
      actorUid,
      actorRole: "superadmin",
      action: "user.manual.reissue",
      targetType: "user",
      targetId: uid,
      metadata: { email: data.email },
      createdAt: Timestamp.now(),
    });
  });
  return { activationCode: generated.code, activationExpiresAt: expiresAt.toDate().toISOString() };
}

export interface ActivationInput { email: string; code: string; password: string }

export function parseActivationInput(input: unknown): ActivationInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AdminUserError(400, "Datos de activación inválidos.");
  }
  const obj = input as Record<string, unknown>;
  if (Object.keys(obj).some(key => !["email", "code", "password"].includes(key))) {
    throw new AdminUserError(400, "Datos de activación inválidos.");
  }
  if (typeof obj.email !== "string" || typeof obj.code !== "string" ||
      typeof obj.password !== "string") {
    throw new AdminUserError(400, "Indica correo, código y contraseña.");
  }
  const email = obj.email.trim().toLowerCase();
  const code = obj.code.trim();
  const password = obj.password;
  if (!/^[a-z]+\d{8}@morelia\.tecnm\.mx$/.test(email) || email.length > 128 ||
      !/^([A-Za-z0-9_-]{1,128})\.([A-Za-z0-9_-]{43})$/.test(code)) {
    throw new AdminUserError(400, "Código de activación inválido.");
  }
  if (password.length < 10 || password.length > 128 ||
      !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new AdminUserError(400, "La contraseña debe tener de 10 a 128 caracteres e incluir letras y números.");
  }
  return { email, code, password };
}

export async function activateManually(data: ActivationInput): Promise<void> {
  const uid = data.code.slice(0, data.code.indexOf("."));
  const db = getAdminDb();
  const ref = db.collection("users").doc(uid);
  const hash = await sha256(data.code);
  const leaseId = crypto.randomUUID();
  const genericError = "Código incorrecto, vencido o agotado. Solicita uno nuevo al administrador.";

  const reservation = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const profile = snap.data();
    if (!profile || profile.registrationSource !== "manual_admin" ||
        profile.email !== data.email || isAdminRole(profile) ||
        profile.manualActivationStatus === "activated" ||
        profile.isActive === false) return false;

    const expiry = profile.manualActivationExpiresAt;
    const validExpiry = expiry instanceof Timestamp && expiry.toMillis() > Date.now();
    const attempts = Number(profile.manualActivationAttempts ?? 0);
    if (!validExpiry || !Number.isInteger(attempts) || attempts >= MAX_ATTEMPTS) return false;

    if (profile.manualActivationStatus === "activating") {
      const activeLease = profile.manualActivationLeaseUntil;
      if (activeLease instanceof Timestamp && activeLease.toMillis() > Date.now()) return false;
    }
    if (!secureEqual(String(profile.manualActivationCodeHash ?? ""), hash)) {
      tx.update(ref, { manualActivationAttempts: attempts + 1, updatedAt: Timestamp.now() });
      return false;
    }

    tx.update(ref, {
      manualActivationStatus: "activating",
      manualActivationLeaseId: leaseId,
      manualActivationLeaseUntil: Timestamp.fromMillis(Date.now() + LEASE_MS),
      updatedAt: Timestamp.now(),
    });
    return true;
  });

  if (!reservation) throw new AdminUserError(403, genericError);

  let updated = false;
  try {
    const response = await adminAuthRequest(":update", {
      localId: uid, password: data.password,
    });
    if (!response.ok) {
      console.error("MANUAL_ACTIVATION_FIREBASE_UPDATE_FAILED", response.status);
      throw new AdminUserError(502, "No se pudo configurar la contraseña. Vuelve a intentar.");
    }
    updated = true;
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const p = snap.data();
      if (!p || p.manualActivationStatus !== "activating" ||
          p.manualActivationLeaseId !== leaseId) {
        throw new AdminUserError(409, "La activación cambió durante el proceso.");
      }
      tx.update(ref, {
        manualActivationStatus: "activated",
        manualActivationCodeHash: "",
        manualActivationAttempts: MAX_ATTEMPTS,
        manualActivationExpiresAt: null,
        manualActivationLeaseId: null,
        manualActivationLeaseUntil: null,
        manualIdentityVerifiedAt: Timestamp.now(),
        manualIdentityVerifiedBy: String(p.createdByAdminUid ?? ""),
        updatedAt: Timestamp.now(),
      });
      tx.create(db.collection("admin_audit_logs").doc(), {
        actorUid: String(p.createdByAdminUid ?? ""),
        actorRole: "superadmin",
        action: "user.manual.activated",
        targetType: "user",
        targetId: uid,
        metadata: { activationMethod: "in_person_one_time_code" },
        createdAt: Timestamp.now(),
      });
    });
  } catch (error) {
    if (!updated) {
      try {
        await db.runTransaction(async tx => {
          const snap = await tx.get(ref);
          if (snap.data()?.manualActivationLeaseId === leaseId) {
            tx.update(ref, { manualActivationStatus: "pending", manualActivationLeaseUntil: null,
              manualActivationLeaseId: null, updatedAt: Timestamp.now() });
          }
        });
      } catch (rollbackError) { console.error("MANUAL_ACTIVATION_UNLOCK_FAILED", rollbackError); }
    }
    throw error;
  }
}
