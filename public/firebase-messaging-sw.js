/* Receives data-only Firebase Cloud Messaging in the background. */
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAkWKoXLU3Xaqy_4prycNsnJiz6YvYGE5M",
  authDomain: "mercadito3-1ff3e.firebaseapp.com",
  projectId: "mercadito3-1ff3e",
  messagingSenderId: "651367375320",
  appId: "1:651367375320:web:fd9ed5150a9c80eaa892ad",
});
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const destination =
    typeof data.href === "string" && data.href.startsWith("/") && !data.href.startsWith("//")
      ? data.href : "/notifications";
  return self.registration.showNotification(data.title || "MercaditoTec", {
    body: data.body || "Hay novedades en tu Mercadito.",
    tag: data.notificationId || "mercaditotec",
    icon: "/icon.svg",
    data: { href: destination },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href || "/notifications";
  const safePath = typeof href === "string" && href.startsWith("/") && !href.startsWith("//")
    ? href : "/notifications";
  event.waitUntil((async () => {
    const target = new URL(safePath, self.location.origin).toString();
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((item) => item.url.startsWith(self.location.origin));
    if (existing) {
      await existing.focus();
      return existing.navigate(target);
    }
    return clients.openWindow(target);
  })());
});
