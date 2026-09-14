import {
  NextResponse,
} from "next/server";

import type {
  DocumentReference,
  DocumentSnapshot,
} from "firebase-admin/firestore";

import {
  getAdminAuth,
  getAdminDb,
} from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


function normalizeNicknameKey(
  value: string
) {

  return value
    .normalize("NFD")

    .replace(
      /[\u0300-\u036f]/g,
      ""
    )

    .toLocaleLowerCase(
      "es-MX"
    )

    /*
     * Batman.25, Batman_25 y Batman-25
     * se consideran el mismo nickname.
     */
    .replace(
      /[._-]/g,
      ""
    )

    .trim();
}


function validateNickname(
  value: string
) {

  const nickname =
    value.trim();

  if (
    nickname.length < 3
  ) {
    return "El nickname debe tener al menos 3 caracteres.";
  }

  if (
    nickname.length > 20
  ) {
    return "El nickname puede tener máximo 20 caracteres.";
  }

  if (
    !/^[\p{L}\p{N}._-]+$/u.test(
      nickname
    )
  ) {
    return "Usa solo letras, números, punto, guion o _.";
  }

  const normalized =
    normalizeNicknameKey(
      nickname
    );

  if (
    normalized.length < 3
  ) {
    return "El nickname debe contener al menos 3 letras o números.";
  }

  const reserved =
    new Set([
      "tu",
      "admin",
      "administrador",
      "administracion",
      "mercaditotec",
      "mercaditotec3",
      "sistema",
      "moderador",
    ]);

  if (
    reserved.has(
      normalized
    )
  ) {
    return "Ese nickname está reservado.";
  }

  return "";
}


async function authenticate(
  request: Request
) {

  const authorization =
    request.headers.get(
      "authorization"
    ) || "";

  if (
    !authorization
      .startsWith("Bearer ")
  ) {
    throw new Error(
      "UNAUTHENTICATED"
    );
  }

  const token =
    authorization.slice(7);

  const decoded =
    await getAdminAuth()
      .verifyIdToken(
        token,
        true
      );

  return decoded;
}


/*
 * =====================================================
 * LEER NICKNAMES
 * =====================================================
 */

export async function GET(
  request: Request
) {

  try {

    const decoded =
      await authenticate(
        request
      );

    const uid =
      decoded.uid;

    const snapshot =
      await getAdminDb()
        .collection(
          "public_profiles"
        )
        .doc(uid)
        .get();

    const rawNickname =
      snapshot.data()
        ?.nickname;

    const nickname =
      typeof rawNickname ===
        "string" &&
      rawNickname.trim()
        ? rawNickname.trim()
        : "";

    return NextResponse.json({
      ok: true,
      nickname,
      nicknames:
        nickname
          ? {
              [uid]:
                nickname,
            }
          : {},
    });

  } catch (error) {

    console.error(
      "GET_NICKNAME_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudo cargar el nickname.",
      },
      {
        status: 401,
      }
    );
  }
}


/*
 * =====================================================
 * GUARDAR / CAMBIAR NICKNAME
 * =====================================================
 */

export async function POST(
  request: Request
) {

  try {

    const decoded =
      await authenticate(
        request
      );

    const uid =
      decoded.uid;

    const body =
      await request.json();

    const nickname =
      String(
        body?.nickname || ""
      ).trim();

    const validation =
      validateNickname(
        nickname
      );

    if (validation) {

      return NextResponse.json(
        {
          ok: false,
          error: validation,
        },
        {
          status: 400,
        }
      );
    }

    const normalized =
      normalizeNicknameKey(
        nickname
      );

    const db =
      getAdminDb();

    const userRef =
      db
        .collection("users")
        .doc(uid);

    const profileRef =
      db
        .collection(
          "public_profiles"
        )
        .doc(uid);

    const newNicknameRef =
      db
        .collection(
          "nicknames"
        )
        .doc(
          normalized
        );

    await db.runTransaction(
      async (
        transaction
      ) => {

        /*
         * Todas las lecturas ocurren
         * antes de cualquier escritura.
         */

        const userSnapshot =
          await transaction.get(
            userRef
          );

        const profileSnapshot =
          await transaction.get(
            profileRef
          );

        const newReservation =
          await transaction.get(
            newNicknameRef
          );

        const oldNormalized =
          String(
            userSnapshot
              .data()
              ?.nicknameNormalized ||

            profileSnapshot
              .data()
              ?.nicknameNormalized ||

            ""
          ).trim();

        let oldNicknameRef:
          DocumentReference |
          null = null;

        let oldReservation:
          DocumentSnapshot |
          null = null;

        if (
          oldNormalized &&
          oldNormalized !==
            normalized
        ) {

          oldNicknameRef =
            db
              .collection(
                "nicknames"
              )
              .doc(
                oldNormalized
              );

          oldReservation =
            await transaction.get(
              oldNicknameRef
            );
        }


        /*
         * Si ya existe y pertenece a
         * otra persona, queda bloqueado.
         */

        if (
          newReservation.exists &&
          newReservation
            .data()
            ?.uid !== uid
        ) {

          throw new Error(
            "NICKNAME_TAKEN"
          );
        }


        const now =
          Date.now();


        /*
         * Reserva global.
         */

        transaction.set(
          newNicknameRef,
          {
            uid,
            nickname,
            normalized,
            updatedAt: now,
          }
        );


        /*
         * Perfil privado.
         */

        transaction.set(
          userRef,
          {
            nickname,

            nicknameNormalized:
              normalized,

            nicknameUpdatedAt:
              now,
          },
          {
            merge: true,
          }
        );


        /*
         * Perfil público.
         * Solo UID + nickname.
         */

        transaction.set(
          profileRef,
          {
            uid,
            nickname,

            nicknameNormalized:
              normalized,

            updatedAt:
              now,
          },
          {
            merge: true,
          }
        );


        /*
         * Si cambió de nickname,
         * liberar el anterior.
         */

        if (
          oldNicknameRef &&
          oldReservation
            ?.exists &&
          oldReservation
            .data()
            ?.uid === uid
        ) {

          transaction.delete(
            oldNicknameRef
          );
        }
      }
    );


    return NextResponse.json({
      ok: true,
      nickname,
    });

  } catch (error) {


    if (
      error instanceof Error &&
      error.message ===
        "NICKNAME_TAKEN"
    ) {

      return NextResponse.json(
        {
          ok: false,

          error:
            "Ese nickname ya está siendo usado por otra persona.",
        },
        {
          status: 409,
        }
      );
    }


    if (
      error instanceof Error &&
      (
        error.message ===
          "UNAUTHENTICATED" ||

        error.message.includes(
          "ID token"
        )
      )
    ) {

      return NextResponse.json(
        {
          ok: false,

          error:
            "Tu sesión ya no es válida. Inicia sesión nuevamente.",
        },
        {
          status: 401,
        }
      );
    }


    console.error(
      "SAVE_NICKNAME_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          "No se pudo guardar el nickname.",
      },
      {
        status: 500,
      }
    );
  }
}