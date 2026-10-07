import { getAdminAccessToken, getFirebaseProjectId } from "../firebaseAdmin";

const FIREBASE_RULES_API = "https://firebaserules.googleapis.com/v1";
const STORAGE_BUCKET = "mercadito3-1ff3e.firebasestorage.app";

export const FIRESTORE_RULES_SOURCE = "rules_version = '2';\n\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    function signedIn() {\n      return request.auth != null;\n    }\n\n    function owns(uid) {\n      return signedIn() && request.auth.uid == uid;\n    }\n\n    function verifiedInstitution() {\n      return signedIn()\n        && request.auth.token.get('email_verified', false) == true\n        && request.auth.token.get('email', '').matches('^[^@]+@morelia[.]tecnm[.]mx$');\n    }\n\n    function studentMayEnter() {\n      let profile = get(/databases/$(database)/documents/users/$(request.auth.uid)).data;\n      let year = request.time.year() - 2000;\n      let years = string(year) + '|' + string(year - 1) + '|' + string(year - 2)\n        + '|' + string(year - 3) + '|' + string(year - 4) + '|' + string(year - 5)\n        + '|' + string(year - 6) + '|' + string(year - 7) + '|' + string(year - 8);\n      return verifiedInstitution() && profile.get('isActive', true) != false\n        && (profile.get('role', '') in ['admin', 'administrator', 'superadmin', 'subadmin']\n          || profile.get('isAdmin', false) == true || profile.get('admin', false) == true\n          || request.auth.token.email.matches('^[a-z]+(' + years + ')[0-9]{6}@morelia[.]tecnm[.]mx$'));\n    }\n\n    function mayMutate() {\n      let profile = get(/databases/$(database)/documents/users/$(request.auth.uid)).data;\n      let expiry = profile.get('blockedUntil', null);\n      return studentMayEnter() && (profile.get('blocked', false) != true\n        || (expiry is timestamp && expiry <= request.time));\n    }\n\n    match /users/{uid} {\n      // A Firebase Auth account by itself is insufficient. Expired or\n      // out-of-window student identities must not load a private profile.\n      allow read: if owns(uid) && studentMayEnter();\n\n      // Role, verification, trust and moderation fields are server-owned.\n      allow create, update, delete: if false;\n\n      match /images/{imageId} {\n        allow read: if owns(uid) && studentMayEnter();\n        allow write: if false;\n      }\n\n      match /endorsements/{endorserUid} {\n        allow read, write: if false;\n      }\n\n      match /trust_counters/{periodId} {\n        allow read, write: if false;\n      }\n    }\n\n    match /messages/{messageId} {\n      allow read: if signedIn() && studentMayEnter();\n      allow write: if false;\n    }\n\n    match /message_reactions/{reactionId} {\n      allow read: if signedIn() && studentMayEnter();\n      allow write: if false;\n    }\n\n    match /public_profiles/{uid} {\n      allow read: if signedIn() && studentMayEnter();\n      allow write: if false;\n    }\n\n    match /direct_chats/{chatId} {\n      allow read: if signedIn()\n        && studentMayEnter()\n        && request.auth.uid in resource.data.participantUids;\n      allow write: if false;\n\n      match /messages/{messageId} {\n        allow read: if signedIn()\n          && studentMayEnter()\n          && request.auth.uid in\n            get(/databases/$(database)/documents/direct_chats/$(chatId)).data.participantUids;\n        allow write: if false;\n      }\n    }\n\n    match /{document=**} {\n      allow read, write: if false;\n    }\n  }\n}\n";
export const STORAGE_RULES_SOURCE = "rules_version = '2';\n\nservice firebase.storage {\n  match /b/{bucket}/o {\n    function signedIn() {\n      return request.auth != null;\n    }\n\n    function verifiedInstitution() {\n      return signedIn()\n        && request.auth.token.get('email_verified', false) == true\n        && request.auth.token.get('email', '').matches('^[^@]+@morelia[.]tecnm[.]mx$');\n    }\n\n    function mayMutate() {\n      let profile = firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data;\n      let until = profile.get('blockedUntil', null);\n      let year = request.time.year() - 2000;\n      let years = string(year) + '|' + string(year - 1) + '|' + string(year - 2)\n        + '|' + string(year - 3) + '|' + string(year - 4) + '|' + string(year - 5)\n        + '|' + string(year - 6) + '|' + string(year - 7) + '|' + string(year - 8);\n      return verifiedInstitution()\n        && profile.get('isActive', true) != false\n        && (profile.get('role', '') in ['admin', 'administrator', 'superadmin', 'subadmin']\n          || profile.get('isAdmin', false) == true || profile.get('admin', false) == true\n          || request.auth.token.email.matches('^[a-z]+(' + years + ')[0-9]{6}@morelia[.]tecnm[.]mx$'))\n        && (profile.get('blocked', false) != true\n          || (until is timestamp && until <= request.time));\n    }\n\n    match /profile-images/{uid}/{fileName} {\n      allow read: if signedIn() && mayMutate();\n      allow create, update: if signedIn() && mayMutate()\n        && request.auth.uid == uid\n        && request.resource.size > 0\n        && request.resource.size <= 2 * 1024 * 1024\n        && request.resource.contentType.matches('image/(jpeg|png|webp|gif)');\n      allow delete: if signedIn() && mayMutate() && request.auth.uid == uid;\n    }\n\n    match /{allPaths=**} {\n      allow read, write: if false;\n    }\n  }\n}\n";

type RuleTarget = {
  releaseId: string;
  fileName: string;
  content: string;
};

type ReleasePayload = {
  name?: string;
  rulesetName?: string;
};

type RulesetPayload = {
  name?: string;
  source?: { files?: Array<{ name?: string; content?: string }> };
};

function normalized(value: string): string {
  return value.replace(/\r\n/g, "\n").trim() + "\n";
}

async function apiFetch(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  headers.set("content-type", "application/json");
  return fetch(`${FIREBASE_RULES_API}/${path}`, { ...init, headers });
}

function releasePath(projectId: string, releaseId: string): string {
  return `projects/${encodeURIComponent(projectId)}/releases/${releaseId
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

async function currentSource(projectId: string, target: RuleTarget, token: string): Promise<string | null> {
  const releaseResponse = await apiFetch(releasePath(projectId, target.releaseId), token);
  if (releaseResponse.status === 404) return null;
  if (!releaseResponse.ok) {
    throw new Error(`Firebase Rules release lookup failed with HTTP ${releaseResponse.status}`);
  }

  const release = (await releaseResponse.json()) as ReleasePayload;
  if (!release.rulesetName) return null;

  const rulesetResponse = await apiFetch(release.rulesetName, token);
  if (!rulesetResponse.ok) {
    throw new Error(`Firebase Rules ruleset lookup failed with HTTP ${rulesetResponse.status}`);
  }
  const ruleset = (await rulesetResponse.json()) as RulesetPayload;
  const source = ruleset.source?.files?.find((file) => file.name === target.fileName)?.content;
  return typeof source === "string" ? source : null;
}

async function createRuleset(projectId: string, target: RuleTarget, token: string): Promise<string> {
  const response = await apiFetch(`projects/${encodeURIComponent(projectId)}/rulesets`, token, {
    method: "POST",
    body: JSON.stringify({
      source: {
        files: [{ name: target.fileName, content: target.content }],
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`Firebase Rules ruleset creation failed with HTTP ${response.status}`);
  }
  const body = (await response.json()) as RulesetPayload;
  if (!body.name) throw new Error("Firebase Rules API did not return a ruleset name");
  return body.name;
}

async function publishRelease(
  projectId: string,
  releaseId: string,
  rulesetName: string,
  token: string,
): Promise<void> {
  const name = `projects/${projectId}/releases/${releaseId}`;
  const path = releasePath(projectId, releaseId);
  const patch = await apiFetch(path, token, {
    method: "PATCH",
    body: JSON.stringify({
      release: { name, rulesetName },
      updateMask: "rulesetName",
    }),
  });
  if (patch.ok) return;
  if (patch.status !== 404) {
    throw new Error(`Firebase Rules release update failed with HTTP ${patch.status}`);
  }

  const create = await apiFetch(`projects/${encodeURIComponent(projectId)}/releases`, token, {
    method: "POST",
    body: JSON.stringify({ name, rulesetName }),
  });
  if (!create.ok) {
    throw new Error(`Firebase Rules release creation failed with HTTP ${create.status}`);
  }
}

async function syncTarget(projectId: string, target: RuleTarget, token: string): Promise<"current" | "updated"> {
  const existing = await currentSource(projectId, target, token);
  if (existing !== null && normalized(existing) === normalized(target.content)) return "current";

  const rulesetName = await createRuleset(projectId, target, token);
  await publishRelease(projectId, target.releaseId, rulesetName, token);
  return "updated";
}

type SyncResult = {
  firestore: "current" | "updated";
  storage: "current" | "updated";
};

let cachedSync: { expiresAt: number; result: SyncResult } | null = null;
let inFlightSync: Promise<SyncResult> | null = null;

async function runSync(): Promise<SyncResult> {
  const projectId = getFirebaseProjectId();
  if (projectId !== "mercadito3-1ff3e") {
    throw new Error("Refusing to deploy Firebase Rules to an unexpected project");
  }

  const token = await getAdminAccessToken();
  const firestore = await syncTarget(projectId, {
    releaseId: "cloud.firestore",
    fileName: "firestore.rules",
    content: FIRESTORE_RULES_SOURCE,
  }, token);
  const storage = await syncTarget(projectId, {
    releaseId: `firebase.storage/${STORAGE_BUCKET}`,
    fileName: "storage.rules",
    content: STORAGE_RULES_SOURCE,
  }, token);

  return { firestore, storage };
}


export async function diagnoseFirebaseRulesIam(): Promise<{
  rulesWrite: boolean;
  setIamPolicy: boolean;
  enableServices: boolean;
}> {
  const projectId = getFirebaseProjectId();
  const token = await getAdminAccessToken();
  const response = await fetch(
    `https://cloudresourcemanager.googleapis.com/v1/projects/${encodeURIComponent(projectId)}:testIamPermissions`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        permissions: [
          "firebaserules.rulesets.create",
          "firebaserules.releases.update",
          "resourcemanager.projects.setIamPolicy",
          "serviceusage.services.enable",
        ],
      }),
    },
  );

  if (!response.ok) {
    return { rulesWrite: false, setIamPolicy: false, enableServices: false };
  }

  const body = (await response.json()) as { permissions?: string[] };
  const permissions = new Set(body.permissions ?? []);
  return {
    rulesWrite:
      permissions.has("firebaserules.rulesets.create") &&
      permissions.has("firebaserules.releases.update"),
    setIamPolicy: permissions.has("resourcemanager.projects.setIamPolicy"),
    enableServices: permissions.has("serviceusage.services.enable"),
  };
}

export async function syncProductionFirebaseRules(): Promise<SyncResult> {
  const now = Date.now();
  if (cachedSync && cachedSync.expiresAt > now) return cachedSync.result;
  if (inFlightSync) return inFlightSync;

  inFlightSync = runSync()
    .then((result) => {
      cachedSync = { result, expiresAt: Date.now() + 10 * 60 * 1000 };
      return result;
    })
    .finally(() => {
      inFlightSync = null;
    });

  return inFlightSync;
}
