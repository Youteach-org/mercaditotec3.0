import { NotificationRepositoryError, type NotificationRecord } from "./repository";

export function serializeNotification(notification: NotificationRecord) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
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
