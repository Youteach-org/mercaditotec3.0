import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getAdminDb } from "@/lib/firestoreRest";
import { consumeMutationBudget } from "@/lib/security/rateLimit";

/**
 * Privacy rights are not conditional on store approval or active status.
 * Verify the Firebase ID token and ensure its UID belongs to an existing user.
 * Never accept a UID, email or role from the request body.
 */
export async function requirePrivacyIdentity(request: Request, mutation = false) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new PrivacyError(401, "Inicia sesión para solicitar tus datos.");
  let claims: Awaited<ReturnType<ReturnType<typeof getAdminAuth>["verifyIdToken"]>>;
  try {
    claims = await getAdminAuth().verifyIdToken(token, true);
  } catch {
    throw new PrivacyError(401, "La sesión no es válida o ha vencido.");
  }
  const uid = claims.uid;
  const profile = await getAdminDb().collection("users").doc(uid).get();
  // The identity still exists in Firebase but its Mercadito profile could
  // already be gone, e.g. during a delayed account deletion.
  if (mutation) await consumeMutationBudget(uid);
  return {
    uid,
    email: typeof claims.email === "string" ? claims.email : "",
    profile: profile.data() ?? {},
  };
}

export class PrivacyError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export function privacyApiFailure(error: unknown) {
  if (error instanceof PrivacyError) return { status: error.status, message: error.message };
  if (error instanceof Error && error.name === "MutationLimitError")
    return { status: 429, message: "Demasiadas solicitudes. Vuelve a intentarlo más tarde." };
  console.error("ARCO_REQUEST_SERVICE_UNAVAILABLE", error instanceof Error ? error.name : "Unknown");
  return { status: 503, message: "El servicio de privacidad no está disponible temporalmente." };
}
