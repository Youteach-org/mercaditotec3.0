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
import { notificationMatchesDestination, shouldAcknowledgeDestination } from "./destination";
import { isAdminRole, isSuperadminRole } from "../security/domain";

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
      .filter((document) => isAdminRole(document.data()) && document.data().isActive !== false
        && (event.type !== "student_pending" || isSuperadminRole(document.data())))
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


/**
 * Only pending alerts are sent to the notification inbox. Already-read records
 * remain stored internally and are never regenerated by reloading the page.
 */
export async function listUnreadNotificationsForUser(
  recipientUid: string,
): Promise<NotificationRecord[]> {
  const snapshot = await getAdminDb()
    .collection("notifications")
    .where("recipientUid", "==", recipientUid)
    .where("readAt", "==", null)
    .limit(100)
    .get();

  const deduped = new Map<string, NotificationRecord>();
  for (const document of snapshot.docs) {
    const record = toNotificationRecord(document.id, document.data());
    // Legacy duplicate documents may share the same original event key.
    const key = record.dedupeKey || record.id;
    const older = deduped.get(key);
    if (!older || record.createdAt.toMillis() > older.createdAt.toMillis()) {
      deduped.set(key, record);
    }
  }
  return [...deduped.values()].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

/**
 * Visiting the actual destination acknowledges only related unread alerts,
 * including ones reached without clicking the notification itself.
 * The client cannot supply IDs, recipients or arbitrary hrefs to clear.
 */
export async function acknowledgeNotificationsAtDestination(
  recipientUid: string,
  pathname: string,
): Promise<{ updatedCount: number; notificationIds: string[] }> {
  if (!shouldAcknowledgeDestination(pathname)) {
    return { updatedCount: 0, notificationIds: [] };
  }
  const db = getAdminDb();
  const unread = await db.collection("notifications")
    .where("recipientUid", "==", recipientUid)
    .where("readAt", "==", null)
    .limit(400)
    .get();
  const matching = unread.docs.filter((doc) =>
    notificationMatchesDestination(toNotificationRecord(doc.id, doc.data()), pathname));
  if (matching.length === 0) return { updatedCount: 0, notificationIds: [] };

  const batch = db.batch();
  const readAt = Timestamp.now();
  for (const doc of matching) batch.update(doc.ref, { readAt });
  await batch.commit();
  await syncUnreadNotificationCount(recipientUid);
  return { updatedCount: matching.length, notificationIds: matching.map((doc) => doc.id) };
}

/**
 * Quota-fallback reviews are superadmin-only. Query indexed admin roles,
 * never list the first N users (which silently misses admins on 5,000 accounts).
 */
export async function notifySuperadminsSafely(event: Omit<NotificationDraft, "recipientUid">): Promise<void> {
  try {
    const db = getAdminDb();
    const results = await Promise.all(
      ["superadmin", "admin", "administrator"].map(role =>
        db.collection("users").where("role", "==", role).limit(30).get(),
      ),
    );
    const recipients = new Set<string>();
    for (const result of results) {
      for (const doc of result.docs) {
        if (doc.data().isActive !== false && isSuperadminRole(doc.data())) recipients.add(doc.id);
      }
    }
    await Promise.all([...recipients].map((recipientUid) =>
      createNotificationSafely({ ...event, recipientUid, dedupeKey: `${event.dedupeKey}:admin:${recipientUid}` }),
    ));
  } catch (error) {
    console.warn("SUPERADMIN_REVIEW_NOTIFICATION_UNAVAILABLE", error instanceof Error ? error.name : "Unknown");
  }
}
