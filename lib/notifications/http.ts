import { NotificationRepositoryError, type NotificationRecord } from "./repository";
import { publicNotificationText } from "./presentation";

export function serializeNotification(notification: NotificationRecord) {
  return {
    id: notification.id,
    type: notification.type,
    title: publicNotificationText(notification.title),
    message: publicNotificationText(notification.message),
    href: notification.href,
    readAt: notification.readAt?.toDate().toISOString() ?? null,
    createdAt: notification.createdAt.toDate().toISOString(),
  };
}

export function toNotificationApiError(error: unknown): { status: number; message: string } {
  if (error instanceof NotificationRepositoryError) {
    return { status: error.status, message: error.message };
  }
  return { status: 500, message: "No se pudieron procesar las notificaciones." };
}
