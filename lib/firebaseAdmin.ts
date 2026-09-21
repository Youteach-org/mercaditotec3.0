import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";

import {
  getAuth,
} from "firebase-admin/auth";

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
    JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

  if (
    !serviceAccount.project_id ||
    !serviceAccount.client_email ||
    !serviceAccount.private_key
  ) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is missing required service-account fields"
    );
  }

  cachedApp =
    initializeApp(
      {
        projectId:
          serviceAccount.project_id,

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

export function getFirebaseProjectId(): string {
  const projectId =
    getAdminApp().options.projectId;

  if (!projectId) {
    throw new Error(
      "Firebase projectId is not configured"
    );
  }

  return projectId;
}

export async function getAdminAccessToken(): Promise<string> {
  const credential =
    getAdminApp().options.credential;

  if (!credential) {
    throw new Error(
      "Firebase Admin credential is not configured"
    );
  }

  const token =
    await credential.getAccessToken();

  if (!token?.access_token) {
    throw new Error(
      "Firebase Admin could not obtain an access token"
    );
  }

  return token.access_token;
}
