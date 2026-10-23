import { FirestoreRestError, getAdminDb, Timestamp } from "@/lib/firestoreRest";
import {
  type ArcoStatus, type ArcoType, privacyRequestDocumentId,
} from "./arco";
import { PrivacyError } from "./auth";

export type ArcoRequestRecord = {
  id: string;
  uid: string;
  type: ArcoType;
  details: string;
  status: ArcoStatus;
  response: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

function asIso(input: unknown): string {
  if (input instanceof Timestamp) return input.toDate().toISOString();
  return typeof input === "string" ? input : "";
}

function fromDocument(id: string, data: Record<string, unknown>): ArcoRequestRecord {
  return {
    id,
    uid: String(data.uid ?? ""),
    type: data.type as ArcoType,
    details: String(data.details ?? ""),
    status: data.status as ArcoStatus,
    response: String(data.response ?? ""),
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
    resolvedAt: data.resolvedAt ? asIso(data.resolvedAt) : null,
  };
}

/** One application per right per UTC day. Creating again is idempotent. */
export async function createArcoRequest(uid: string, email: string, type: ArcoType, details: string) {
  const now = new Date();
  const ref = getAdminDb().collection("arco_requests").doc(privacyRequestDocumentId(uid, type, now));
  try {
    await ref.create({
      uid,
      email,
      type,
      details,
      status: "received",
      response: "",
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      resolvedAt: null,
    });
  } catch (error) {
    if (!(error instanceof FirestoreRestError && [409, 412].includes(error.status))) throw error;
    const earlier = await ref.get();
    if (!earlier.exists || earlier.data()?.uid !== uid)
      throw new PrivacyError(409, "Ya existe una solicitud de este tipo.");
  }
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new PrivacyError(503, "No se pudo confirmar tu solicitud.");
  return fromDocument(snapshot.id, snapshot.data()!);
}

export async function listOwnArcoRequests(uid: string): Promise<ArcoRequestRecord[]> {
  const result = await getAdminDb().collection("arco_requests")
    .where("uid", "==", uid).limit(100).get();
  return result.docs.map(doc => fromDocument(doc.id, doc.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listAllArcoRequests(): Promise<(ArcoRequestRecord & { email: string })[]> {
  const result = await getAdminDb().collection("arco_requests").list(250);
  return result.docs.map(doc => ({
    ...fromDocument(doc.id, doc.data()),
    email: String(doc.data().email ?? ""),
  })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function resolveArcoRequest(id: string, status: ArcoStatus, response: string, actorUid: string) {
  if (!/^[a-zA-Z0-9_-]{1,128}__[0-9]{8}__(?:access|rectification|cancellation|opposition)$/.test(id))
    throw new PrivacyError(400, "Identificador de solicitud inválido.");
  const ref = getAdminDb().collection("arco_requests").doc(id);
  await getAdminDb().runTransaction(async transaction => {
    const current = await transaction.get(ref);
    if (!current.exists) throw new PrivacyError(404, "Solicitud no encontrada.");
    const record = current.data()!;
    if (record.status === "resolved" || record.status === "not_procedent")
      throw new PrivacyError(409, "La solicitud ya tiene respuesta. No se debe sobrescribir su historial.");
    const now = Timestamp.now();
    transaction.update(ref, {
      status,
      response: status === "in_review" ? "" : response,
      updatedAt: now,
      resolvedAt: status === "in_review" ? null : now,
      handledBy: actorUid,
    });
  });
  const updated = await ref.get();
  if (!updated.exists) throw new PrivacyError(503, "No se pudo cargar la respuesta.");
  return fromDocument(updated.id, updated.data()!);
}
