import { Timestamp, getAdminDb } from "../firestoreRest";
import { requireActiveCategory } from "../store/categoryRepository";

export class ListingError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export type ListingStatus = "screening" | "approved" | "blocked" | "needs_changes" | "sold";
export interface ListingInput {
  title: string;
  description: string;
  categoryId: string;
  imageUrl: string;
  priceType: "fixed" | "negotiable" | "ask";
  priceAmount: number | null;
  location: string;
  durationHours: 0 | 6 | 12 | 24 | 48;
}
export interface ListingRecord extends ListingInput {
  id: string;
  ownerUid: string;
  sellerName: string;
  status: ListingStatus;
  createdAt: number;
  expiresAt: number | null;
  screenedAt: number | null;
  screeningReason: string | null;
}
const SOURCE_ORIGIN = "https://wfmokinfcypfpdisussw.supabase.co";
const IMAGE_PATH = "/storage/v1/object/public/chat-images/";

export function parseListingInput(raw: unknown, ownerUid: string): ListingInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ListingError(400, "Publicación inválida.");
  const data = raw as Record<string, unknown>;
  const required = (key: string, max: number) => {
    const text = typeof data[key] === "string" ? (data[key] as string).trim() : "";
    if (!text || text.length > max) throw new ListingError(400, `El campo ${key} es obligatorio y no puede superar ${max} caracteres.`);
    return text;
  };
  const title = required("title", 100);
  const description = required("description", 750);
  const categoryId = required("categoryId", 160);
  const location = required("location", 120);
  const imageUrl = required("imageUrl", 600);
  const priceType = data.priceType;
  if (priceType !== "fixed" && priceType !== "negotiable" && priceType !== "ask") throw new ListingError(400, "Tipo de precio inválido.");
  const amount = data.priceAmount;
  if (priceType !== "ask" && (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000)) {
    throw new ListingError(400, "El precio debe ser mayor que cero y menor que un millón.");
  }
  const durationHours = data.durationHours;
  if (![0, 6, 12, 24, 48].includes(Number(durationHours))) throw new ListingError(400, "Duración inválida.");
  try {
    const url = new URL(imageUrl);
    if (url.origin !== SOURCE_ORIGIN || url.search || url.hash || !url.pathname.startsWith(IMAGE_PATH)) throw new Error("origin");
    const path = decodeURIComponent(url.pathname.slice(IMAGE_PATH.length));
    const segments = path.split("/");
    if (segments.length !== 3 || segments[0] !== "discover-listings" || segments[1] !== ownerUid
      || !/^[A-Za-z0-9_-]{8,160}\.(png|jpg|jpeg|webp)$/.test(segments[2])) throw new Error("owner");
  } catch {
    throw new ListingError(400, "La fotografía debe pertenecer a tu publicación.");
  }
  return { title, description, categoryId, location, imageUrl, priceType, priceAmount: priceType === "ask" ? null : Math.round((amount as number) * 100) / 100, durationHours: Number(durationHours) as ListingInput["durationHours"] };
}

function toRecord(id: string, data: Record<string, unknown>): ListingRecord {
  return {
    id,
    ownerUid: String(data.ownerUid ?? ""),
    sellerName: String(data.sellerName ?? "Usuario"),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    categoryId: String(data.categoryId ?? ""),
    imageUrl: String(data.imageUrl ?? ""),
    priceType: data.priceType === "ask" || data.priceType === "negotiable" ? data.priceType : "fixed",
    priceAmount: typeof data.priceAmount === "number" ? data.priceAmount : null,
    location: String(data.location ?? ""),
    durationHours: [0,6,12,24,48].includes(Number(data.durationHours)) ? Number(data.durationHours) as ListingInput["durationHours"] : 0,
    status: ["screening","approved","blocked","needs_changes","sold"].includes(String(data.status)) ? data.status as ListingStatus : "blocked",
    createdAt: Number(data.createdAt ?? 0),
    expiresAt: typeof data.expiresAt === "number" ? data.expiresAt : null,
    screenedAt: typeof data.screenedAt === "number" ? data.screenedAt : null,
    screeningReason: typeof data.screeningReason === "string" ? data.screeningReason : null,
  };
}

export function isVisibleListing(record: ListingRecord, now = Date.now()): boolean {
  return record.status === "approved"
    && (record.expiresAt === null || record.expiresAt > now)
    && Boolean(record.imageUrl) && Boolean(record.ownerUid);
}

export async function createListingForScreening(uid: string, profile: Record<string, unknown> | undefined, raw: unknown) {
  const input = parseListingInput(raw, uid);
  await requireActiveCategory(input.categoryId);
  const db = getAdminDb();
  // One user's items are bounded; no global scan and no composite index.
  const existing = await db.collection("discover_listings").where("ownerUid", "==", uid).limit(30).get();
  const active = existing.docs.filter((doc) => {
    const data = doc.data();
    return ["approved", "screening"].includes(String(data.status)) &&
      (typeof data.expiresAt !== "number" || data.expiresAt > Date.now());
  });
  if (active.length >= 3) throw new ListingError(409, "Puedes tener como máximo tres anuncios activos o en revisión.");
  const now = Date.now();
  const reference = db.collection("discover_listings").doc();
  const nickname = String(profile?.nickname ?? profile?.displayName ?? "Usuario").trim().slice(0, 70) || "Usuario";
  const record: ListingRecord = {
    ...input, id: reference.id, ownerUid: uid, sellerName: nickname,
    status: "screening", createdAt: now,
    expiresAt: input.durationHours ? now + input.durationHours * 60 * 60 * 1000 : null,
    screenedAt: null, screeningReason: null,
  };
  const { id: _id, ...saved } = record;
  await reference.set(saved);
  return record;
}

export async function finishAutomaticScreening(id: string, decision: "approved" | "blocked" | "needs_changes", reason: string) {
  const ref = getAdminDb().collection("discover_listings").doc(id);
  const existing = await ref.get();
  if (!existing.exists || existing.data()?.status !== "screening") throw new ListingError(409, "El anuncio ya no admite esta revisión.");
  await ref.update({
    status: decision,
    screenedAt: Date.now(),
    screeningReason: decision === "approved" ? null : reason.slice(0, 180),
    screeningModel: "cloudflare/clef-omni",
    screeningVersion: 1,
  });
  return decision;
}

export async function listApprovedListings(max = 72): Promise<ListingRecord[]> {
  const snapshot = await getAdminDb().collection("discover_listings")
    .where("status", "==", "approved").limit(Math.min(100, Math.max(1, max))).get();
  return snapshot.docs.map(doc => toRecord(doc.id, doc.data()))
    .filter(item => isVisibleListing(item))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, max);
}

export async function getListing(id: string, requesterUid: string): Promise<ListingRecord> {
  const snap = await getAdminDb().collection("discover_listings").doc(id).get();
  if (!snap.exists) throw new ListingError(404, "Anuncio no encontrado.");
  const item = toRecord(snap.id, snap.data()!);
  if (!isVisibleListing(item) && item.ownerUid !== requesterUid) throw new ListingError(404, "Anuncio no encontrado.");
  return item;
}

export async function listOwnListings(uid: string): Promise<ListingRecord[]> {
  const snapshot = await getAdminDb().collection("discover_listings").where("ownerUid", "==", uid).limit(30).get();
  return snapshot.docs.map(doc => toRecord(doc.id, doc.data())).filter(item => item.ownerUid === uid)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function markListingSold(uid: string, id: string): Promise<void> {
  const record = await getListing(id, uid);
  if (record.ownerUid !== uid) throw new ListingError(404, "Anuncio no encontrado.");
  if (record.status !== "approved") throw new ListingError(409, "Solo puedes marcar vendidos los anuncios visibles.");
  await getAdminDb().collection("discover_listings").doc(id).update({ status: "sold", updatedAt: Date.now() });
}
