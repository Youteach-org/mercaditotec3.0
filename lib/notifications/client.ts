import type { User } from "firebase/auth";

import { storeApiFetch } from "../store/client";

export interface NotificationApiRecord {
  id: string;
  type:
    | "order_created"
    | "order_accepted"
    | "order_rejected"
    | "order_ready"
    | "order_completed"
    | "order_cancelled"
    | "store_pending_review"
    | "store_changes_required"
    | "store_approved"
    | "store_suspended"
    | "store_reactivated"
    | "student_pending"
    | "direct_message"
    | "contact_attempt";
  title: string;
  message: string;
  href: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationApiRecord[];
  unreadCount: number;
}

async function notificationResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? "No se pudieron procesar las notificaciones.");
  }
  return data;
}

export async function loadUnreadNotificationCount(user: User): Promise<number> {
  const response = await storeApiFetch(user, "/api/notifications?summary=1");
  const data = await notificationResponse(response);
  return typeof data.unreadCount === "number" ? data.unreadCount : 0;
}

export async function loadNotifications(user: User): Promise<NotificationsResponse> {
  const response = await storeApiFetch(user, "/api/notifications");
  const data = await notificationResponse(response);
  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    unreadCount: typeof data.unreadCount === "number" ? data.unreadCount : 0,
  };
}

export async function markNotificationRead(
  user: User,
  notificationId: string,
): Promise<NotificationApiRecord> {
  const response = await storeApiFetch(
    user,
    `/api/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "PATCH" },
  );
  return (await notificationResponse(response)).notification as NotificationApiRecord;
}

export async function markAllNotificationsRead(user: User): Promise<number> {
  const response = await storeApiFetch(user, "/api/notifications/read-all", {
    method: "PATCH",
  });
  const data = await notificationResponse(response);
  return typeof data.updatedCount === "number" ? data.updatedCount : 0;
}

export function announceNotificationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("notifications:changed"));
  }
}
