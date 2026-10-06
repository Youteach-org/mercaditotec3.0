import { createHash } from "node:crypto";

import { Timestamp, getAdminDb } from "../firestoreRest";

export class DirectChatError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface DirectChatSession {
  chatId: string;
  target: {
    uid: string;
    username: string;
    displayName: string;
  };
}

export interface DirectChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: number;
}

function cleanUid(value: string): string {
  const uid = value.trim();
  if (!uid || uid.length > 128 || /[\/\\?#%\u0000-\u001f\u007f]/.test(uid)) {
    throw new DirectChatError(400, "Usuario de chat inválido.");
  }
  return uid;
}

export function directChatId(uidA: string, uidB: string): string {
  const participants = [cleanUid(uidA), cleanUid(uidB)].sort();
  return createHash("sha256")
    .update(participants.join("\u0000"))
    .digest("hex")
    .slice(0, 48);
}

function usernameFor(data: Record<string, unknown>): string {
  const nickname = String(data.nickname ?? "").trim();
  if (nickname) return nickname;
  const email = String(data.email ?? "").trim().toLowerCase();
  const localPart = email.split("@", 1)[0] ?? "";
  return localPart || String(data.displayName ?? "").trim() || "Usuario";
}

export async function getOrCreateDirectChat(
  actorUidInput: string,
  targetUidInput: string,
): Promise<DirectChatSession> {
  const actorUid = cleanUid(actorUidInput);
  const targetUid = cleanUid(targetUidInput);

  if (actorUid === targetUid) {
    throw new DirectChatError(409, "No puedes abrir un chat privado contigo mismo.");
  }

  const db = getAdminDb();
  const [actor, target] = await Promise.all([
    db.collection("users").doc(actorUid).get(),
    db.collection("users").doc(targetUid).get(),
  ]);

  if (!actor.exists) throw new DirectChatError(404, "Tu perfil no está disponible.");
  if (!target.exists) throw new DirectChatError(404, "Usuario no encontrado.");

  const targetData = target.data() ?? {};
  if (targetData.isActive === false) {
    throw new DirectChatError(409, "La cuenta de este usuario está inactiva.");
  }

  const participantUids = [actorUid, targetUid].sort();
  const chatId = directChatId(actorUid, targetUid);
  const reference = db.collection("direct_chats").doc(chatId);
  const snapshot = await reference.get();

  if (!snapshot.exists) {
    const now = Date.now();
    await reference.create({
      participantUids,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: null,
    });
  } else {
    const stored = snapshot.data() ?? {};
    const existing = Array.isArray(stored.participantUids)
      ? stored.participantUids.map(String).sort()
      : [];
    if (
      existing.length !== participantUids.length ||
      existing.some((uid, index) => uid !== participantUids[index])
    ) {
      throw new DirectChatError(409, "La conversación privada no es válida.");
    }
  }

  return {
    chatId,
    target: {
      uid: targetUid,
      username: usernameFor(targetData),
      displayName: String(targetData.displayName ?? "").trim(),
    },
  };
}

export async function createDirectChatMessage(
  actorUid: string,
  targetUid: string,
  input: unknown,
): Promise<DirectChatMessage> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DirectChatError(400, "El mensaje no contiene datos válidos.");
  }

  const text = String((input as Record<string, unknown>).text ?? "").trim();
  if (!text) throw new DirectChatError(400, "El mensaje está vacío.");
  if (text.length > 1000) {
    throw new DirectChatError(400, "El mensaje no puede exceder 1000 caracteres.");
  }

  const session = await getOrCreateDirectChat(actorUid, targetUid);
  const now = Date.now();
  const db = getAdminDb();
  const chatReference = db.collection("direct_chats").doc(session.chatId);
  const messageReference = chatReference.collection("messages").doc();

  const record = {
    senderId: actorUid,
    recipientId: targetUid,
    text,
    createdAt: now,
  };

  const batch = db.batch();
  batch.create(messageReference, record);
  batch.update(chatReference, {
    updatedAt: now,
    lastMessageAt: now,
  });
  await batch.commit();

  return {
    id: messageReference.id,
    ...record,
  };
}
