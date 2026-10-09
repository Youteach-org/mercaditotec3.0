import { NextResponse } from "next/server";
import { getAdminAccessToken, getFirebaseProjectId } from "@/lib/firebaseAdmin";
import { ApiAuthError, requireFirebaseUser } from "@/lib/store/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shared short-lived cache avoids one Firestore aggregation per page visit.
const CACHE_MS = 5 * 60_000;
let cached: { count: number; expiresAt: number } | null = null;
let pending: Promise<number> | null = null;

async function aggregateRegisteredUsers(): Promise<number> {
  const projectId = await getFirebaseProjectId();
  const token = await getAdminAccessToken();
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:runAggregationQuery`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        structuredAggregationQuery: {
          structuredQuery: { from: [{ collectionId: "users" }] },
          aggregations: [{ count: {}, alias: "registered" }],
        },
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`User count query returned ${response.status}`);
  }
  const result = (await response.json()) as Array<{
    result?: { aggregateFields?: { registered?: { integerValue?: string } } };
  }>;
  const value = Number(result[0]?.result?.aggregateFields?.registered?.integerValue);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid registered user count");
  return value;
}

async function getRegisteredUsersCount(): Promise<number> {
  if (cached && Date.now() < cached.expiresAt) return cached.count;
  if (pending) return pending;
  const query = aggregateRegisteredUsers()
    .then((count) => {
      cached = { count, expiresAt: Date.now() + CACHE_MS };
      return count;
    })
    .catch((error) => {
      if (cached) return cached.count;
      throw error;
    })
    .finally(() => {
      if (pending === query) pending = null;
    });
  pending = query;
  return query;
}

export async function GET(request: Request) {
  try {
    // Never expose community counters to anonymous or ineligible visitors.
    await requireFirebaseUser(request);
    const registeredUsers = await getRegisteredUsersCount();
    return NextResponse.json({ registeredUsers }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    }
    console.error("COMMUNITY_COUNTERS_UNAVAILABLE", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Contador temporalmente no disponible." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
