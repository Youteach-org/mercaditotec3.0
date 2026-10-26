import { getAdminDb } from "../firestoreRest";
import { markPublicMarketplaceChanged } from "../store/publicMarketplaceRevision";
import { requireActiveCategory } from "../store/categoryRepository";
import { getStoreForOwner, StoreRepositoryError } from "../store/repository";
import { DEFAULT_LISTING_HOURS, LISTING_DURATIONS_HOURS, listingExpiryMs } from "./lifecycle";
import { publisherWhatsappUrl } from "./contact";

export class ListingError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export type ListingStatus = "screening" | "manual_review" | "approved" | "blocked" | "needs_changes" | "sold";

export interface ListingInput {
  title: string;
  description: string;
  categoryId: string;
  imageUrl: string;
  priceType: "fixed" | "negotiable" | "ask";
  priceAmount: number | null;
  location: string;
  durationHours: (typeof LISTING_DURATIONS_HOURS)[number];
  linkedStoreId: string | null;
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
  linkedStoreName: string | null;
  linkedStoreSlug: string | null;
  linkedStoreLogoUrl: string | null;
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
  if (!LISTING_DURATIONS_HOURS.includes(durationHours as ListingInput["durationHours"])) throw new ListingError(400, "El anuncio debe tener una duración entre 6 horas y 7 días.");
  const linkedStoreId = data.linkedStoreId === null || data.linkedStoreId === undefined || data.linkedStoreId === "" ? null : data.linkedStoreId;
  if (linkedStoreId !== null && (typeof linkedStoreId !== "string" || !/^[A-Za-z0-9_-]{8,160}$/.test(linkedStoreId))) throw new ListingError(400, "Selecciona una tienda válida.");
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
  return { title, description, categoryId, location, imageUrl, priceType, priceAmount: priceType === "ask" ? null : Math.round((amount as number) * 100) / 100, durationHours: durationHours as ListingInput["durationHours"], linkedStoreId: linkedStoreId as string | null };
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
    durationHours: LISTING_DURATIONS_HOURS.includes(data.durationHours as ListingInput["durationHours"])
      ? data.durationHours as ListingInput["durationHours"] : DEFAULT_LISTING_HOURS,
    linkedStoreId: typeof data.linkedStoreId === "string" ? data.linkedStoreId : null,
    status: ["screening","manual_review","approved","blocked","needs_changes","sold"].includes(String(data.status)) ? data.status as ListingStatus : "blocked",
    createdAt: Number(data.createdAt ?? 0),
    expiresAt: typeof data.expiresAt === "number" ? data.expiresAt : null,
    screenedAt: typeof data.screenedAt === "number" ? data.screenedAt : null,
    screeningReason: typeof data.screeningReason === "string" ? data.screeningReason : null,
    linkedStoreName: typeof data.linkedStoreName === "string" ? data.linkedStoreName : null,
    linkedStoreSlug: typeof data.linkedStoreSlug === "string" ? data.linkedStoreSlug : null,
    linkedStoreLogoUrl: typeof data.linkedStoreLogoUrl === "string" ? data.linkedStoreLogoUrl : null,
  };
}

export function isVisibleListing(record: ListingRecord, now = Date.now()): boolean {
  return record.status === "approved"
    && listingExpiryMs(record) > now
    && Boolean(record.imageUrl) && Boolean(record.ownerUid);
}

export async function createListingForScreening(uid: string, profile: Record<string, unknown> | undefined, raw: unknown) {
  const input = parseListingInput(raw, uid);
  if (!publisherWhatsappUrl(profile)) throw new ListingError(400, "Registra tu WhatsApp en tu perfil para poder publicar.");
  await requireActiveCategory(input.categoryId);
  let linkedStore: { id: string; name: string; slug: string; logoUrl: string | null } | null = null;
  if (input.linkedStoreId) {
    try {
      const store = await getStoreForOwner(uid, input.linkedStoreId);
      if (store.status !== "active" || !store.slug) throw new ListingError(409, "Tu tienda debe estar aprobada y activa para vincularla.");
      linkedStore = { id: store.id, name: store.name, slug: store.slug, logoUrl: store.logoUrl };
    } catch (error) {
      if (error instanceof StoreRepositoryError) throw new ListingError(404, "La tienda seleccionada no te pertenece.");
      throw error;
    }
  }
  const db = getAdminDb();
  // One user's items are bounded; no global scan and no composite index.
  const existing = await db.collection("discover_listings").where("ownerUid", "==", uid).limit(30).get();
  const active = existing.docs.filter((doc) => {
    const data = doc.data();
    const expiresAt = listingExpiryMs({
      createdAt: Number(data.createdAt ?? 0),
      expiresAt: typeof data.expiresAt === "number" ? data.expiresAt : null,
    });
    return String(data.status) === "manual_review" || (["approved", "screening"].includes(String(data.status)) && expiresAt > Date.now());
  });
  if (active.length >= 3) throw new ListingError(409, "Puedes tener como máximo tres anuncios activos o en revisión.");
  const now = Date.now();
  const reference = db.collection("discover_listings").doc();
  const nickname = String(profile?.nickname ?? profile?.displayName ?? "Usuario").trim().slice(0, 70) || "Usuario";
  const record: ListingRecord = {
    ...input, id: reference.id, ownerUid: uid, sellerName: nickname,
    status: "screening", createdAt: now,
    expiresAt: now + input.durationHours * 60 * 60 * 1000,
    screenedAt: null, screeningReason: null,
    linkedStoreName: linkedStore?.name ?? null,
    linkedStoreSlug: linkedStore?.slug ?? null,
    linkedStoreLogoUrl: linkedStore?.logoUrl ?? null,
  };
  const { id: _id, ...saved } = record;
  await reference.set(saved);
  return record;
}

export async function finishAutomaticScreening(id: string, decision: "approved" | "blocked" | "needs_changes" | "manual_review", reason: string) {
  const ref = getAdminDb().collection("discover_listings").doc(id);
  const existing = await ref.get();
  if (!existing.exists || existing.data()?.status !== "screening") throw new ListingError(409, "El anuncio ya no admite esta revisión.");
  await ref.update({
    status: decision,
    // Manual-review listings have no active sales countdown until approved.
    expiresAt: decision === "manual_review" ? null : existing.data()?.expiresAt ?? null,
    screenedAt: Date.now(),
    screeningReason: decision === "approved" ? null : reason.slice(0, 180),
    screeningModel: "@cf/google/gemma-4-26b-a4b-it",
    screeningVersion: 1,
  });
  if (decision === "approved") await markPublicMarketplaceChanged();
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
  await markPublicMarketplaceChanged();
}

export async function listManualReviewListings(): Promise<ListingRecord[]> {
  // A status-specific, bounded query; no listing scans or background polling.
  const snapshot = await getAdminDb().collection("discover_listings")
    .where("status", "==", "manual_review").limit(100).get();
  return snapshot.docs.map(doc => toRecord(doc.id, doc.data()))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function decideManualReview(
  id: string,
  decision: "approved" | "blocked",
  reviewerUid: string,
  reason: string,
): Promise<ListingRecord> {
  if (!/^[A-Za-z0-9_-]{8,160}$/.test(id)) throw new ListingError(400, "Anuncio inválido.");
  const cleanReason = reason.trim().slice(0, 180);
  if (decision === "blocked" && !cleanReason) throw new ListingError(400, "Indica por qué se rechazó el anuncio.");
  const db = getAdminDb();
  const ref = db.collection("discover_listings").doc(id);
  const now = Date.now();
  let updated: ListingRecord | null = null;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ListingError(404, "Anuncio no encontrado.");
    const previous = toRecord(snap.id, snap.data()!);
    if (previous.status !== "manual_review") {
      throw new ListingError(409, "Este anuncio ya fue revisado o no requiere revisión manual.");
    }
    const expiresAt = decision === "approved"
      ? now + previous.durationHours * 60 * 60 * 1000
      : null;
    tx.update(ref, {
      status: decision,
      screenedAt: now,
      expiresAt,
      screeningReason: decision === "approved" ? null : cleanReason,
      screeningMethod: "manual",
      screenedBy: reviewerUid,
      updatedAt: now,
    });
    updated = { ...previous, status: decision, screenedAt: now, expiresAt,
      screeningReason: decision === "approved" ? null : cleanReason };
  });
  if (!updated) throw new ListingError(503, "No se pudo registrar la revisión.");
  if (decision === "approved") await markPublicMarketplaceChanged();
  return updated;
}
