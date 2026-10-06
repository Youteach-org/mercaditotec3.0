import { NextResponse } from "next/server";

import type {
  DocumentReference,
  DocumentSnapshot,
} from "@/lib/firestoreRest";

import {
  ApiAuthError,
  requireFirebaseUser,
  requireUnblockedUser,
} from "@/lib/store/auth";
import { getAdminDb } from "@/lib/firestoreRest";
import {
  normalizeNickname,
  validateNicknameSyntax,
} from "@/lib/security/nickname";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authenticate(request: Request) {
  const user =
    request.method === "GET"
      ? await requireFirebaseUser(request)
      : await requireUnblockedUser(request);
  return user.claims;
}

async function readAccountNickname(uid: string): Promise<string> {
  const db = getAdminDb();
  const [userSnapshot, publicSnapshot] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("public_profiles").doc(uid).get(),
  ]);

  const userNickname = String(userSnapshot.data()?.nickname ?? "").trim();
  if (userNickname) return userNickname;

  return String(publicSnapshot.data()?.nickname ?? "").trim();
}

export async function GET(request: Request) {
  try {
    const decoded = await authenticate(request);
    const nickname = await readAccountNickname(decoded.uid);

    return NextResponse.json(
      {
        ok: true,
        nickname,
        nicknames: nickname ? { [decoded.uid]: nickname } : {},
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }

    console.error("GET_NICKNAME_ERROR", error);
    return NextResponse.json(
      { ok: false, error: "No se pudo cargar el nickname." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const decoded = await authenticate(request);
    const uid = decoded.uid;
    const body = await request.json().catch(() => ({}));
    const parsed = validateNicknameSyntax(
      String((body as Record<string, unknown>).nickname ?? ""),
    );

    if (!parsed.valid) {
      return NextResponse.json(
        { ok: false, error: parsed.reason },
        { status: 400 },
      );
    }

    const nickname = parsed.nickname;
    const normalized = normalizeNickname(nickname);
    const db = getAdminDb();

    /*
     * Besides the atomic reservation document, check existing user profiles
     * so legacy accounts that predate reservations cannot be duplicated.
     */
    const [normalizedUsers, rawUsers] = await Promise.all([
      db.collection("users")
        .where("nicknameNormalized", "==", normalized)
        .limit(2)
        .get(),
      db.collection("users")
        .where("nickname", "==", nickname)
        .limit(2)
        .get(),
    ]);

    const ownedByAnotherUser = [...normalizedUsers.docs, ...rawUsers.docs]
      .some((document) => document.id !== uid);

    if (ownedByAnotherUser) {
      return NextResponse.json(
        { ok: false, error: "Ese nickname ya está siendo usado por otra persona." },
        { status: 409 },
      );
    }

    const userRef = db.collection("users").doc(uid);
    const profileRef = db.collection("public_profiles").doc(uid);
    const newNicknameRef = db.collection("nicknames").doc(normalized);

    await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const profileSnapshot = await transaction.get(profileRef);
      const newReservation = await transaction.get(newNicknameRef);

      const existingNickname = String(
        userSnapshot.data()?.nickname ??
          profileSnapshot.data()?.nickname ??
          "",
      ).trim();

      const oldNormalized = normalizeNickname(
        String(
          userSnapshot.data()?.nicknameNormalized ??
            profileSnapshot.data()?.nicknameNormalized ??
            existingNickname,
        ),
      );

      let oldNicknameRef: DocumentReference | null = null;
      let oldReservation: DocumentSnapshot | null = null;

      if (oldNormalized && oldNormalized !== normalized) {
        oldNicknameRef = db.collection("nicknames").doc(oldNormalized);
        oldReservation = await transaction.get(oldNicknameRef);
      }

      if (
        newReservation.exists &&
        String(newReservation.data()?.uid ?? "") !== uid
      ) {
        throw new Error("NICKNAME_TAKEN");
      }

      const now = Date.now();

      transaction.set(
        newNicknameRef,
        {
          uid,
          nickname,
          normalized,
          updatedAt: now,
        },
        { merge: true },
      );

      transaction.set(
        userRef,
        {
          nickname,
          nicknameNormalized: normalized,
          nicknameUpdatedAt: now,
          updatedAt: now,
        },
        { merge: true },
      );

      transaction.set(
        profileRef,
        {
          uid,
          nickname,
          nicknameNormalized: normalized,
          updatedAt: now,
        },
        { merge: true },
      );

      if (
        oldNicknameRef &&
        oldReservation?.exists &&
        String(oldReservation.data()?.uid ?? "") === uid
      ) {
        transaction.delete(oldNicknameRef);
      }
    });

    return NextResponse.json(
      { ok: true, nickname },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }

    if (error instanceof Error && error.message === "NICKNAME_TAKEN") {
      return NextResponse.json(
        {
          ok: false,
          error: "Ese nickname ya está siendo usado por otra persona.",
        },
        { status: 409 },
      );
    }

    console.error("SAVE_NICKNAME_ERROR", error);
    return NextResponse.json(
      { ok: false, error: "No se pudo guardar el nickname." },
      { status: 500 },
    );
  }
}
