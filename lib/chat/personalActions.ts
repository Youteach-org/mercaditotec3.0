import { createHash } from "node:crypto";
import { getAdminDb } from "../firestoreRest";
import { ApiAuthError } from "../store/auth";
import { parseImageUploadPath } from "../store/media";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const object = (input: unknown): Record<string, unknown> => {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ApiAuthError(400, "Solicitud inválida.");
  return input as Record<string, unknown>;
};
export async function toggleMessageReaction(uid: string, input: unknown) {
  const data = object(input);
  const { messageId, emoji } = data;
  if (typeof messageId !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(messageId) || typeof emoji !== "string" || !["👍", "❤️", "😂", "😮", "😢", "🔥"].includes(emoji)) throw new ApiAuthError(400, "Reacción inválida.");
  const db = getAdminDb();
  const reference = db.collection("message_reactions").doc(digest(JSON.stringify([uid, messageId])));
  await db.runTransaction(async (transaction) => {
    const message = await transaction.get(db.collection("messages").doc(messageId));
    const previous = await transaction.get(reference);
    const content = message.data();
    if (!message.exists || content?.hidden === true || (typeof content?.expiresAt === "number" && content.expiresAt <= Date.now())) throw new ApiAuthError(404, "Mensaje no disponible.");
    const current = previous.data();
    if (current?.emoji === emoji) transaction.delete(reference);
    else transaction.set(reference, { messageId, userId: uid, emoji, createdAt: Date.now() });
  });
}
export async function savePersonalImage(uid: string, input: unknown) {
  const data = object(input);
  if (typeof data.url !== "string" || data.url.length > 2048) throw new ApiAuthError(400, "URL de imagen inválida.");
  let url: URL;
  try { url = new URL(data.url); } catch { throw new ApiAuthError(400, "URL de imagen inválida."); }
  const prefix = "/storage/v1/object/public/chat-images/";
  if (url.origin !== "https://wfmokinfcypfpdisussw.supabase.co" || !url.pathname.startsWith(prefix) || url.search || url.hash || url.username || url.password) throw new ApiAuthError(400, "URL de imagen inválida.");
  const path = url.pathname.slice(prefix.length);
  const ownerUid = path.split("/")[1];
  try { parseImageUploadPath(path, ownerUid); } catch { throw new ApiAuthError(400, "Ruta de imagen inválida."); }
  // Personal references are chat uploads, never arbitrary objects or store paths.
  if (!path.startsWith("chat/")) throw new ApiAuthError(400, "Imagen no disponible para el chat.");
  const sha256 = typeof data.sha256 === "string" && /^[a-f0-9]{64}$/.test(data.sha256) ? data.sha256 : "";
  const db = getAdminDb();
  let shared = false;
  if (ownerUid !== uid) {
    if (!sha256) throw new ApiAuthError(403, "La imagen no está compartida.");
    const library = (await db.collection("chat_image_library").doc(sha256).get()).data();
    if (!library || library.url !== url.toString() || library.ownerUid !== ownerUid || !path.startsWith(`chat/${ownerUid}/shared/`)) throw new ApiAuthError(403, "La imagen no está compartida.");
    shared = true;
  } else shared = path.startsWith(`chat/${uid}/shared/`);
  const reference = db.collection("users").doc(uid).collection("images").doc(digest(url.toString()));
  await db.runTransaction(async (transaction) => {
    if ((await transaction.get(reference)).exists) return;
    transaction.set(reference, { url: url.toString(), createdAt: Date.now(), source: ownerUid !== uid ? "shared" : shared ? "chat" : "product", shared, sha256, originalOwnerUid: ownerUid });
  });
}
