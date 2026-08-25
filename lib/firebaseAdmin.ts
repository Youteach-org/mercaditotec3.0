import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";

import {
  getAuth,
} from "firebase-admin/auth";

import {
  getFirestore,
} from "firebase-admin/firestore";

let cachedApp: App | null = null;

function getAdminApp() {

  if (cachedApp) {
    return cachedApp;
  }

  const existing =
    getApps().find(
      (app) =>
        app.name ===
          "mercaditotec3-admin"
    );

  if (existing) {
    cachedApp = existing;
    return existing;
  }

  const raw =
    process.env
      .FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not configured"
    );
  }

  const serviceAccount =
    JSON.parse(raw);

  cachedApp =
    initializeApp(
      {
        credential: cert({
          projectId:
            serviceAccount.project_id,

          clientEmail:
            serviceAccount.client_email,

          privateKey:
            serviceAccount.private_key,
        }),
      },
      "mercaditotec3-admin"
    );

  return cachedApp;
}

export function getAdminAuth() {
  return getAuth(
    getAdminApp()
  );
}

export function getAdminDb() {
  return getFirestore(
    getAdminApp()
  );
}