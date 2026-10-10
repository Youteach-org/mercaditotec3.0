import type { User } from "firebase/auth";
import { getApp } from "firebase/app";
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { storeApiFetch } from "@/lib/store/client";

export function browserPushAvailable(): boolean {
  return typeof window !== "undefined" && "Notification" in window &&
    "serviceWorker" in navigator && "PushManager" in window &&
    window.isSecureContext;
}

export async function enableDevicePush(user: User): Promise<void> {
  if (!browserPushAvailable() || !(await isSupported())) {
    throw new Error("Este navegador no admite notificaciones push.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Debes permitir las notificaciones en Android y el navegador.");
  }
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
  const configResponse = await storeApiFetch(user, "/api/notifications/devices", { cache: "no-store" });
  const config = await configResponse.json().catch(() => ({})) as { vapidPublicKey?: string };
  if (!configResponse.ok) throw new Error("No se pudo consultar la configuración de notificaciones.");
  const messaging = getMessaging(getApp());
  const token = await getToken(messaging, {
    serviceWorkerRegistration: registration,
    ...(config.vapidPublicKey ? { vapidKey: config.vapidPublicKey } : {}),
  });
  if (!token) throw new Error("Android no proporcionó el identificador de notificaciones.");
  const response = await storeApiFetch(user, "/api/notifications/devices", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  if (!response.ok) throw new Error("No se pudo vincular este dispositivo a tu cuenta.");
}

export async function disableDevicePush(user: User): Promise<void> {
  if (!browserPushAvailable() || !(await isSupported())) return;
  const messaging = getMessaging(getApp());
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) return;
  const configResponse = await storeApiFetch(user, "/api/notifications/devices");
  const config = await configResponse.json().catch(() => ({})) as { vapidPublicKey?: string };
  const token = await getToken(messaging, {
    serviceWorkerRegistration: registration,
    ...(config.vapidPublicKey ? { vapidKey: config.vapidPublicKey } : {}),
  });
  if (token) {
    const response = await storeApiFetch(user, "/api/notifications/devices", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    });
    if (!response.ok) throw new Error("No se pudo desvincular este dispositivo.");
  }
  await deleteToken(messaging);
}

/**
 * FCM routes messages to the page while the tab is focused. Android's
 * Notification constructor is not supported in many mobile browsers, so use
 * the existing service worker registration to display an OS notification.
 */
export async function watchForegroundPush(): Promise<() => void> {
  if (!browserPushAvailable() || Notification.permission !== "granted" || !(await isSupported())) {
    return () => undefined;
  }
  const messaging = getMessaging(getApp());
  return onMessage(messaging, (payload) => {
    window.dispatchEvent(new Event("notifications:changed"));
    const data = payload.data ?? {};
    const href = typeof data.href === "string" && data.href.startsWith("/") && !data.href.startsWith("//")
      ? data.href : "/notifications";
    void navigator.serviceWorker.getRegistration("/")
      .then((registration) => registration?.showNotification(data.title || "MercaditoTec", {
        body: data.body || "Tienes una nueva notificación.",
        icon: "/icon.svg",
        tag: data.notificationId || "mercaditotec",
        data: { href },
      }))
      .catch(() => undefined);
  });
}
