const FIREBASE_WEB_API_KEY = "AIzaSyAkWKoXLU3Xaqy_4prycNsnJiz6YvYGE5M";
const FIREBASE_ISSUER_PREFIX = "https://securetoken.google.com/";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_OAUTH_SCOPE =
  "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

export interface DecodedIdToken extends Record<string, unknown> {
  uid: string;
  sub: string;
  aud: string | string[];
  iss: string;
  exp: number;
  iat: number;
  auth_time?: number;
  email?: string;
  email_verified?: boolean;
}

export class FirebaseAuthUnavailableError extends Error {
  constructor(public readonly status: number) {
    super("Firebase Authentication is temporarily unavailable");
    this.name = "FirebaseAuthUnavailableError";
  }
}

export class GoogleOAuthUnavailableError extends Error {
  constructor(public readonly status: number) {
    super("Google OAuth token exchange is temporarily unavailable");
    this.name = "GoogleOAuthUnavailableError";
  }
}

interface FirebaseLookupUser {
  localId?: string;
  disabled?: boolean;
  validSince?: string;
}

interface FirebaseLookupResponse {
  users?: FirebaseLookupUser[];
}

let cachedServiceAccount: ServiceAccount | null = null;
let cachedAccessToken:
  | {
      token: string;
      expiresAtMs: number;
    }
  | null = null;
let cachedPrivateKey: CryptoKey | null = null;
let pendingAccessToken: Promise<string> | null = null;
const inFlightFirebaseChecks = new Map<string, Promise<void>>();

function getServiceAccount(): ServiceAccount {
  if (cachedServiceAccount) {
    return cachedServiceAccount;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");
  }

  const value = JSON.parse(raw) as Partial<ServiceAccount>;

  if (!value.project_id || !value.client_email || !value.private_key) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is missing required service-account fields",
    );
  }

  cachedServiceAccount = {
    project_id: value.project_id,
    client_email: value.client_email,
    private_key: value.private_key,
  };

  return cachedServiceAccount;
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = "";

  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function encodeJsonBase64Url(value: unknown): string {
  return encodeBase64Url(
    new TextEncoder().encode(JSON.stringify(value)),
  );
}

function decodeJwtPayload(token: string): DecodedIdToken {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid Firebase ID token");
  }

  const payloadText = new TextDecoder().decode(
    decodeBase64Url(parts[1]),
  );
  const payload = JSON.parse(payloadText) as Record<string, unknown>;

  const uid =
    typeof payload.sub === "string"
      ? payload.sub
      : typeof payload.user_id === "string"
        ? payload.user_id
        : "";

  return {
    ...payload,
    uid,
    sub: uid,
    aud: payload.aud as string | string[],
    iss: String(payload.iss ?? ""),
    exp: Number(payload.exp ?? 0),
    iat: Number(payload.iat ?? 0),
    auth_time:
      payload.auth_time === undefined
        ? undefined
        : Number(payload.auth_time),
    email:
      typeof payload.email === "string"
        ? payload.email
        : undefined,
    email_verified:
      typeof payload.email_verified === "boolean"
        ? payload.email_verified
        : undefined,
  };
}

function validateFirebaseClaims(claims: DecodedIdToken): void {
  const projectId = getFirebaseProjectId();
  const now = Math.floor(Date.now() / 1000);

  const audienceMatches = Array.isArray(claims.aud)
    ? claims.aud.includes(projectId)
    : claims.aud === projectId;

  if (!audienceMatches) {
    throw new Error("Firebase ID token has incorrect audience");
  }

  if (claims.iss !== `${FIREBASE_ISSUER_PREFIX}${projectId}`) {
    throw new Error("Firebase ID token has incorrect issuer");
  }

  if (!claims.uid || claims.uid.length > 128) {
    throw new Error("Firebase ID token has invalid subject");
  }

  if (!Number.isFinite(claims.exp) || claims.exp <= now) {
    throw new Error("Firebase ID token has expired");
  }

  if (!Number.isFinite(claims.iat) || claims.iat > now + 60) {
    throw new Error("Firebase ID token has invalid issued-at time");
  }

  if (
    claims.auth_time !== undefined &&
    (!Number.isFinite(claims.auth_time) || claims.auth_time > now + 60)
  ) {
    throw new Error("Firebase ID token has invalid authentication time");
  }
}

async function verifyWithFirebaseAuthUnshared(
  token: string,
  claims: DecodedIdToken,
  checkRevoked: boolean,
): Promise<void> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ idToken: token }),
    },
  );

  if (!response.ok) {
    // Quota exhaustion or temporary identity-service outages are NOT evidence
    // of an invalid user; keep authorization fail-closed without forcing logout.
    if (response.status === 429 || response.status >= 500) {
      throw new FirebaseAuthUnavailableError(response.status);
    }
    let message = "Firebase rejected the ID token";

    try {
      const body = (await response.json()) as {
        error?: { message?: string };
      };

      if (body.error?.message) {
        message = body.error.message;
      }
    } catch {
      // Keep the generic authentication error.
    }

    throw new Error(message);
  }

  const body = (await response.json()) as FirebaseLookupResponse;
  const user = body.users?.[0];

  if (!user?.localId || user.localId !== claims.uid) {
    throw new Error("Firebase ID token user mismatch");
  }

  if (user.disabled) {
    throw new Error("Firebase user is disabled");
  }

  if (checkRevoked && user.validSince) {
    const validSince = Number(user.validSince);
    const authTime = Number(claims.auth_time ?? claims.iat);

    if (
      Number.isFinite(validSince) &&
      Number.isFinite(authTime) &&
      authTime < validSince
    ) {
      throw new Error("Firebase ID token has been revoked");
    }
  }
}

async function verifyWithFirebaseAuth(
  token: string,
  claims: DecodedIdToken,
  checkRevoked: boolean,
): Promise<void> {
  // Concurrent requests for the same token share the same Firebase lookup.
  // Only IN-FLIGHT checks are reused; there is no cache of authorization,
  // revocation, disabled-account state or Firestore profile decisions.
  const key = `${checkRevoked ? "revoked" : "standard"}:${token}`;
  let pending = inFlightFirebaseChecks.get(key);
  if (!pending) {
    pending = verifyWithFirebaseAuthUnshared(token, claims, checkRevoked).finally(() => {
      inFlightFirebaseChecks.delete(key);
    });
    inFlightFirebaseChecks.set(key, pending);
  }
  await pending;
}

async function verifyIdToken(
  token: string,
  checkRevoked = false,
): Promise<DecodedIdToken> {
  if (!token) {
    throw new Error("Firebase ID token is required");
  }

  const claims = decodeJwtPayload(token);
  validateFirebaseClaims(claims);
  await verifyWithFirebaseAuth(token, claims, checkRevoked);

  return claims;
}

async function importServiceAccountPrivateKey(): Promise<CryptoKey> {
  if (cachedPrivateKey) {
    return cachedPrivateKey;
  }

  const pem = getServiceAccount().private_key;
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  cachedPrivateKey = await crypto.subtle.importKey(
    "pkcs8",
    bytes,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  return cachedPrivateKey;
}

async function createServiceAccountAssertion(): Promise<string> {
  const serviceAccount = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);

  const header = encodeJsonBase64Url({
    alg: "RS256",
    typ: "JWT",
  });

  const payload = encodeJsonBase64Url({
    iss: serviceAccount.client_email,
    scope: GOOGLE_OAUTH_SCOPE,
    aud: GOOGLE_OAUTH_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  });

  const unsigned = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    await importServiceAccountPrivateKey(),
    new TextEncoder().encode(unsigned),
  );

  return `${unsigned}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export function getAdminAuth() {
  return {
    verifyIdToken,
  };
}

export function getFirebaseProjectId(): string {
  return getServiceAccount().project_id;
}

export async function deleteFirebaseAuthUser(uid: string): Promise<void> {
  const cleanUid = uid.trim();
  if (!cleanUid || cleanUid.length > 128) {
    throw new Error("Firebase user id is invalid");
  }

  const projectId = getFirebaseProjectId();
  const token = await getAdminAccessToken();
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts:delete`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ localId: cleanUid }),
    },
  );

  if (response.ok) return;

  let details = "";
  try {
    details = await response.text();
  } catch {
    details = "";
  }

  if (response.status === 404 || /USER_NOT_FOUND/i.test(details)) return;

  throw new Error(
    `Firebase Auth user deletion failed with HTTP ${response.status}${
      details ? `: ${details.slice(0, 500)}` : ""
    }`,
  );
}

async function requestNewAdminAccessToken(): Promise<string> {
  const now = Date.now();

  if (
    cachedAccessToken &&
    cachedAccessToken.expiresAtMs > now + 60_000
  ) {
    return cachedAccessToken.token;
  }

  const assertion = await createServiceAccountAssertion();
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    if (response.status === 429 || response.status >= 500) {
      throw new GoogleOAuthUnavailableError(response.status);
    }
    let details = "";

    try {
      details = await response.text();
    } catch {
      details = "";
    }

    throw new Error(
      `Google OAuth token exchange failed with HTTP ${response.status}${
        details ? `: ${details.slice(0, 500)}` : ""
      }`,
    );
  }

  const body = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!body.access_token) {
    throw new Error("Google OAuth token response did not include access_token");
  }

  const expiresInSeconds = Number(body.expires_in ?? 3600);

  cachedAccessToken = {
    token: body.access_token,
    expiresAtMs:
      now +
      Math.max(
        60,
        Number.isFinite(expiresInSeconds)
          ? expiresInSeconds
          : 3600,
      ) *
        1000,
  };

  return body.access_token;
}

/**
 * Deduplicate overlapping Google OAuth exchanges within a Worker instance.
 * Completed responses are still subject to the existing expiration check.
 */
export async function getAdminAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAtMs > now + 60_000) {
    return cachedAccessToken.token;
  }
  if (!pendingAccessToken) {
    pendingAccessToken = requestNewAdminAccessToken().finally(() => {
      pendingAccessToken = null;
    });
  }
  return pendingAccessToken;
}
