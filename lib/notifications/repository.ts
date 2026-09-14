import { Timestamp, type DocumentData } from "firebase-admin/firestore";

import { getAdminDb } from "../firebaseAdmin";
import {
  buildOrderNotification,
  type NotificationType,
  type OrderNotificationEvent,
  type OrderNotificationSource,
} from "./domain";

export interface NotificationRecord {
  id: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  readAt: Timestamp | null;
  createdAt: Timestamp;
  dedupeKey: string;
}

export class NotificationRepositoryError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function toNotificationRecord(id: string, data: DocumentData): NotificationRecord {
  return {
    id,
    recipientUid: String(data.recipientUid ?? ""),
    type: data.type as NotificationType,
    title: String(data.title ?? "Notificación"),
    message: String(data.message ?? ""),
    href: typeof data.href === "string" && data.href.startsWith("/") ? data.href : "/",
    readAt: data.readAt instanceof Timestamp ? data.readAt : null,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.fromMillis(0),
    dedupeKey: String(data.dedupeKey ?? id),
  };
}

export async function createOrderNotification(
  order: OrderNotificationSource,
  event: OrderNotificationEvent,
): Promise<NotificationRecord> {
  const draft = buildOrderNotification(order, event);
  const reference = getAdminDb().collection("notifications").doc(draft.dedupeKey);
  const existing = await reference.get();
  if (existing.exists) return toNotificationRecord(existing.id, existing.data()!);

  const record: Omit<NotificationRecord, "id"> = {
    ...draft,
    readAt: null,
    createdAt: Timestamp.now(),
  };

  try {
    await reference.create(record);
    return { id: reference.id, ...record };
  } catch (error) {
    const raced = await reference.get();
    if (raced.exists) return toNotificationRecord(raced.id, raced.data()!);
    throw error;
  }
}

export async function countUnreadNotifications(
  recipientUid: string,
): Promise<number> {
  const snapshot = await getAdminDb()
    .collection("notifications")
    .where("recipientUid", "==", recipientUid)
    .where("readAt", "==", null)
    .count()
    .get();

  return snapshot.data().count;
}

export async function listNotificationsForUser(
  recipientUid: string,
): Promise<NotificationRecord[]> {
  const snapshot = await getAdminDb()
    .collection("notifications")
    .where("recipientUid", "==", recipientUid)
    .limit(100)
    .get();

  return snapshot.docs
    .map((document) => toNotificationRecord(document.id, document.data()))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function markNotificationRead(
  recipientUid: string,
  notificationId: string,
): Promise<NotificationRecord> {
  const db = getAdminDb();
  const reference = db.collection("notifications").doc(notificationId);
  let result: NotificationRecord | null = null;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) {
      throw new NotificationRepositoryError(404, "Notificación no encontrada.");
    }

    const current = toNotificationRecord(snapshot.id, snapshot.data()!);
    if (current.recipientUid !== recipientUid) {
      throw new NotificationRepositoryError(404, "Notificación no encontrada.");
    }

    if (current.readAt) {
      result = current;
      return;
    }

    const readAt = Timestamp.now();
    transaction.update(reference, { readAt });
    result = { ...current, readAt };
  });

  if (!result) {
    throw new NotificationRepositoryError(500, "No se pudo marcar la notificación.");
  }
  return result;
}

export async function markAllNotificationsRead(recipientUid: string): Promise<number> {
  const db = getAdminDb();
  const snapshot = await db
    .collection("notifications")
    .where("recipientUid", "==", recipientUid)
    .limit(100)
    .get();
  const unread = snapshot.docs.filter((document) => !(document.data().readAt instanceof Timestamp));
  if (unread.length === 0) return 0;

  const batch = db.batch();
  const readAt = Timestamp.now();
  for (const document of unread) batch.update(document.ref, { readAt });
  await batch.commit();
  return unread.length;
}
