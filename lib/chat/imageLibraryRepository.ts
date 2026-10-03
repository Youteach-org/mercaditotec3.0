import { Timestamp, type DocumentData } from "../firestoreRest";
import { getAdminDb } from "../firestoreRest";

const COLLECTION = "chat_image_library";
const SUPABASE_ORIGIN = "https://wfmokinfcypfpdisussw.supabase.co";
const PUBLIC_PREFIX = "/storage/v1/object/public/chat-images/";

export interface SharedChatImageRecord {
  id: string;
  url: string;
  storagePath: string;
  ownerUid: string;
  sha256: string;
  source: "chat";
  shared: true;
  createdAt: number;
}

function normalizeSha256(value: unknown): string {
  const sha256 = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-f0-9]{64}$/.test(sha256)) {
    throw new Error("Hash de imagen inválido.");
  }
  return sha256;
}

function normalizeStorageUrl(value: unknown, ownerUid: string): {
  url: string;
  storagePath: string;
} {
  if (typeof value !== "string") throw new Error("URL de imagen inválida.");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("URL de imagen inválida.");
  }

  if (url.origin !== SUPABASE_ORIGIN || !url.pathname.startsWith(PUBLIC_PREFIX)) {
    throw new Error("La imagen no pertenece al Storage de Mercadito.");
  }

  const storagePath = decodeURIComponent(url.pathname.slice(PUBLIC_PREFIX.length));
  if (!storagePath.startsWith(`chat/${ownerUid}/shared/`)) {
    throw new Error("La imagen compartida no pertenece al usuario.");
  }

  return { url: url.toString(), storagePath };
}

function toRecord(id: string, data: DocumentData): SharedChatImageRecord {
  const createdAt =
    data.createdAt instanceof Timestamp
      ? data.createdAt.toMillis()
      : Number(data.createdAt ?? 0);

  return {
    id,
    url: String(data.url ?? ""),
    storagePath: String(data.storagePath ?? ""),
    ownerUid: String(data.ownerUid ?? ""),
    sha256: String(data.sha256 ?? id),
    source: "chat",
    shared: true,
    createdAt: Number.isFinite(createdAt) ? createdAt : 0,
  };
}

export async function findSharedChatImage(
  shaInput: unknown,
): Promise<SharedChatImageRecord | null> {
  const sha256 = normalizeSha256(shaInput);
  const snapshot = await getAdminDb().collection(COLLECTION).doc(sha256).get();
  if (!snapshot.exists) return null;
  return toRecord(snapshot.id, snapshot.data()!);
}

export async function listSharedChatImages(
  limitCount = 250,
): Promise<SharedChatImageRecord[]> {
  const snapshot = await getAdminDb()
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(Math.min(250, Math.max(1, Math.floor(limitCount))))
    .get();

  return snapshot.docs.map((document) =>
    toRecord(document.id, document.data()),
  );
}

export async function saveSharedChatImage(
  ownerUid: string,
  input: unknown,
): Promise<SharedChatImageRecord> {
  if (!input || typeof input !== "object") {
    throw new Error("Datos de imagen inválidos.");
  }

  const data = input as Record<string, unknown>;
  const sha256 = normalizeSha256(data.sha256);
  const normalized = normalizeStorageUrl(data.url, ownerUid);
  const db = getAdminDb();
  const reference = db.collection(COLLECTION).doc(sha256);
  let result: SharedChatImageRecord | null = null;

  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(reference);

    if (existing.exists) {
      result = toRecord(existing.id, existing.data()!);
      return;
    }

    const createdAt = Timestamp.now();
    const record = {
      url: normalized.url,
      storagePath: normalized.storagePath,
      ownerUid,
      sha256,
      source: "chat" as const,
      shared: true as const,
      createdAt,
    };

    transaction.set(reference, record);
    result = {
      id: sha256,
      ...record,
      createdAt: createdAt.toMillis(),
    };
  });

  if (!result) throw new Error("No se pudo guardar la imagen compartida.");
  return result;
}
