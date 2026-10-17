import type { NotificationType } from "./domain";

export interface NotificationDestination {
  type: NotificationType;
  href: string;
}

function normalizedPath(value: string): string {
  const raw = value.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

/**
 * Only explicit in-app destinations acknowledge notifications. Visiting the
 * general message inbox must NOT clear unread alerts for unopened conversations.
 */
export function shouldAcknowledgeDestination(pathname: string): boolean {
  const path = normalizedPath(pathname);
  return path === "/orders" ||
    path === "/mystore/orders" ||
    path === "/admin/stores" ||
    path === "/admin/descubre" ||
    path === "/admin/users" ||
    /^\/admin\/stores\/[^/]+$/.test(path) ||
    /^\/mystore\/[^/]+$/.test(path) ||
    /^\/chat\/personal\/[^/]+$/.test(path);
}

export function notificationMatchesDestination(
  notification: NotificationDestination,
  pathname: string,
): boolean {
  const destination = normalizedPath(pathname);
  const href = normalizedPath(notification.href);

  if (!shouldAcknowledgeDestination(destination)) return false;

  if (notification.type.startsWith("order_")) {
    return href === destination && (destination === "/orders" || destination === "/mystore/orders");
  }

  if (notification.type === "direct_message") {
    return /^\/chat\/personal\/[^/]+$/.test(destination) && href === destination;
  }

  if (notification.type === "discover_manual_review") {
    return destination === "/admin/descubre" && href === destination;
  }

  if (notification.type === "student_pending") {
    return destination === "/admin/users" && href.startsWith("/admin/users");
  }

  if (notification.type === "store_pending_review" && href.startsWith("/admin/stores/")) {
    // Admin review overview opens the full list of pending stores.
    return destination === "/admin/stores" || destination === href;
  }

  if (
    notification.type === "store_pending_review" ||
    notification.type === "store_changes_required" ||
    notification.type === "store_approved" ||
    notification.type === "store_suspended" ||
    notification.type === "store_reactivated" ||
    notification.type === "contact_attempt"
  ) {
    return href === destination && /^\/mystore\/[^/]+$/.test(destination);
  }

  return false;
}
