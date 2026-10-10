import { createHash } from "node:crypto";
import { getAdminAccessToken, getFirebaseProjectId } from "@/lib/firebaseAdmin";
import { getAdminDb, Timestamp } from "@/lib/firestoreRest";

export class PushDeviceError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export function validatePushToken(input: unknown): string {
  if (typeof input !== "string" || input.length < 40 || input.length > 4096 || !/^[A-Za-z0-9:_-]+$/.test(input)) {
    throw new PushDeviceError(400, "El identificador de este dispositivo no es válido.");
  }
  return input;
}

export function pushDeviceId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function registerPushDevice(uid: string, rawToken: unknown): Promise<void> {
  const token = validatePushToken(rawToken);
  const ref = getAdminDb().collection("push_devices").doc(pushDeviceId(token));
  const now = Timestamp.now();
  await ref.set({ token, recipientUid: uid, updatedAt: now }, { merge: true });
}

export async function unregisterPushDevice(uid: string, rawToken: unknown): Promise<void> {
  const token = validatePushToken(rawToken);
  const ref = getAdminDb().collection("push_devices").doc(pushDeviceId(token));
  const current = await ref.get();
  if (current.exists && current.data()?.recipientUid === uid) await ref.delete();
}

export async function sendDevicePush(
  uid: string,
  info: { title: string; message: string; href: string; id: string },
): Promise<void> {
  const recipients = await getAdminDb().collection("push_devices")
    .where("recipientUid", "==", uid).limit(10).get();
  if (recipients.empty) return;
  const projectId = getFirebaseProjectId();
  const accessToken = await getAdminAccessToken();
  await Promise.all(recipients.docs.map(async (device) => {
    const token = String(device.data().token ?? "");
    if (!token) return;
    try {
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              data: {
                title: info.title.slice(0, 100),
                body: info.message.slice(0, 180),
                href: info.href.startsWith("/") && !info.href.startsWith("//") ? info.href : "/notifications",
                notificationId: info.id,
              },
              webpush: { headers: { TTL: "86400" } },
            },
          }),
        },
      );
      if (!response.ok) {
        // Only remove definitively invalid tokens, never a transient 429 or 503.
        const body = await response.json().catch(() => ({})) as { error?: { status?: string; details?: Array<{ errorCode?: string }> } };
        const errors = body.error?.details ?? [];
        const invalid = errors.some((detail) =>
          detail.errorCode === "UNREGISTERED" || detail.errorCode === "INVALID_ARGUMENT",
        );
        if (response.status === 404 || (response.status === 400 && invalid)) {
          await device.ref.delete();
        } else {
          console.warn("FCM_DELIVERY_FAILED", { status: response.status });
        }
      }
    } catch (error) {
      console.warn("FCM_DELIVERY_UNAVAILABLE", error instanceof Error ? error.name : "Unknown");
    }
  }));
}

export async function deliverPushSafely(
  uid: string,
  info: { title: string; message: string; href: string; id: string },
): Promise<void> {
  try {
    await sendDevicePush(uid, info);
  } catch (error) {
    console.warn("PUSH_DELIVERY_UNAVAILABLE", error instanceof Error ? error.name : "Unknown");
  }
}
