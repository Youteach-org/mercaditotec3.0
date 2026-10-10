import { Timestamp, type DocumentData } from "../firestoreRest";

import { getAdminDb } from "../firestoreRest";
import {
  buildOrderNotification,
  type NotificationDraft,
  type NotificationType,
  type OrderNotificationEvent,
  type OrderNotificationSource,
} from "./domain";
import { deliverPushSafely } from "./push";
import { isAdminRole } from "../security/domain";

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

function storedUnreadCount(data: DocumentData | undefined): number | null {
  const value = Number(data?.unreadNotificationCount);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
}

export async function createOrderNotification(
  order: OrderNotificationSource,
  event: OrderNotificationEvent,
): Promise<NotificationRecord> {
  return createNotification(buildOrderNotification(order, event));
}

export async function createNotification(draft: NotificationDraft): Promise<NotificationRecord> {
  if (!draft.recipientUid || !/^[A-Za-z0-9:_-]{1,400}$/.test(draft.dedupeKey)) {
    throw new NotificationRepositoryError(400, "Evento de notificación inválido.");
  }
  const db = getAdminDb();
  const reference = db.collection("notifications").doc(draft.dedupeKey);
  const userReference = db.collection("users").doc(draft.recipientUid);
  const record: Omit<NotificationRecord, "id"> = {
    ...draft,
    readAt: null,
    createdAt: Timestamp.now(),
  };

  let result: NotificationRecord | null = null;
  let created = false;

  const initialUserSnapshot = await userReference.get();
  if (!initialUserSnapshot.exists) {
    throw new NotificationRepositoryError(404, "El destinatario de la notificación no existe.");
  }

  const storedBaseline = storedUnreadCount(initialUserSnapshot.data());
  const legacyUnreadBaseline =
    storedBaseline === null
      ? await countUnreadNotifications(draft.recipientUid)
      : storedBaseline;

  await db.runTransaction(async (transaction) => {
    const [existing, userSnapshot] = await Promise.all([
      transaction.get(reference),
      transaction.get(userReference),
    ]);

    if (!userSnapshot.exists) {
      throw new NotificationRepositoryError(404, "El destinatario de la notificación no existe.");
    }

    const currentUnread =
      storedUnreadCount(userSnapshot.data()) ?? legacyUnreadBaseline;

    if (existing.exists) {
      if (storedUnreadCount(userSnapshot.data()) === null) {
        transaction.update(userReference, {
          unreadNotificationCount: currentUnread,
        });
      }
      result = toNotificationRecord(existing.id, existing.data()!);
      return;
    }

    transaction.create(reference, record);
    created = true;
    transaction.update(userReference, {
      unreadNotificationCount: currentUnread + 1,
    });
    result = { id: reference.id, ...record };
  });

  // The transaction callback populates result asynchronously. Explicitly
  // narrow it here instead of relying on TypeScript's closure flow analysis.
  const notification = result as NotificationRecord | null;
  if (!notification) {
    throw new NotificationRepositoryError(500, "No se pudo crear la notificación.");
  }

  // A replayed event must not send a duplicate Android push.
  if (created) {
    await deliverPushSafely(notification.recipientUid, {
      id: notification.id,
      title: notification.title,
      message: "Tienes una nueva notificación en MercaditoTec.",
      href: notification.href,
    });
  }
  return notification;
}

export async function createNotificationSafely(draft: NotificationDraft): Promise<void> {
  try {
    await createNotification(draft);
  } catch (error) {
    // An unavailable notifications service must not roll back a committed order,
    // message, store decision or account activation.
    console.warn("NOTIFICATION_EVENT_UNAVAILABLE", {
      type: draft.type,
      error: error instanceof Error ? error.name : "Unknown",
    });
  }
}

export async function notifyAdminsSafely(event: Omit<NotificationDraft, "recipientUid">): Promise<void> {
  try {
    const profiles = await getAdminDb().collection("users").list(250);
    const adminUids = profiles.docs
      .filter((document) => isAdminRole(document.data()) && document.data().isActive !== false)
      .map((document) => document.id);
    await Promise.all(adminUids.map((recipientUid) =>
      createNotificationSafely({ ...event, recipientUid, dedupeKey: `${event.dedupeKey}:admin:${recipientUid}` }),
    ));
  } catch (error) {
    console.warn("ADMIN_NOTIFICATION_UNAVAILABLE", error instanceof Error ? error.name : "Unknown");
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

export async function syncUnreadNotificationCount(
  recipientUid: string,
): Promise<number> {
  const count = await countUnreadNotifications(recipientUid);
  await getAdminDb().collection("users").doc(recipientUid).update({
    unreadNotificationCount: count,
  });
  return count;
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
  const userReference = db.collection("users").doc(recipientUid);
  let result: NotificationRecord | null = null;
  let needsCounterSync = false;

  await db.runTransaction(async (transaction) => {
    const [snapshot, userSnapshot] = await Promise.all([
      transaction.get(reference),
      transaction.get(userReference),
    ]);

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

    const currentUnread = userSnapshot.exists
      ? storedUnreadCount(userSnapshot.data())
      : null;

    if (userSnapshot.exists && currentUnread !== null) {
      transaction.update(userReference, {
        unreadNotificationCount: Math.max(0, currentUnread - 1),
      });
    } else {
      needsCounterSync = true;
    }

    result = { ...current, readAt };
  });

  if (!result) {
    throw new NotificationRepositoryError(500, "No se pudo marcar la notificación.");
  }

  if (needsCounterSync) {
    await syncUnreadNotificationCount(recipientUid);
  }

  return result;
}

export async function markAllNotificationsRead(recipientUid: string): Promise<number> {
  const db = getAdminDb();
  let updatedCount = 0;

  while (true) {
    const snapshot = await db
      .collection("notifications")
      .where("recipientUid", "==", recipientUid)
      .where("readAt", "==", null)
      .limit(400)
      .get();

    if (snapshot.empty) break;

    const batch = db.batch();
    const readAt = Timestamp.now();

    for (const document of snapshot.docs) {
      batch.update(document.ref, { readAt });
    }

    await batch.commit();
    updatedCount += snapshot.size;

    if (snapshot.size < 400) break;
  }

  await syncUnreadNotificationCount(recipientUid);

  return updatedCount;
}
