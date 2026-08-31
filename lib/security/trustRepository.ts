import { Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebaseAdmin";
import {
  canEndorseStudent,
  ENDORSEMENTS_REQUIRED,
  normalizeStudentTrustStatus,
  trustPeriodId,
  type StudentTrustStatus,
} from "./domain";

const INSTITUTIONAL_DOMAIN = "@morelia.tecnm.mx";

export class TrustRepositoryError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface StudentTrustRecord {
  status: StudentTrustStatus;
  endorsementCount: number;
  verifiedAt: string | null;
  revokedAt: string | null;
}

export function normalizeInstitutionalEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (
    !email ||
    !email.endsWith(INSTITUTIONAL_DOMAIN) ||
    email === INSTITUTIONAL_DOMAIN
  ) {
    throw new TrustRepositoryError(
      400,
      "Debes indicar un correo institucional válido.",
    );
  }
  return email;
}

export function nextStudentTrustState(currentCount: number): {
  count: number;
  status: StudentTrustStatus;
} {
  const count = Math.max(0, Math.floor(currentCount)) + 1;
  return {
    count,
    status: count >= ENDORSEMENTS_REQUIRED ? "verified" : "pending",
  };
}

function timestampIso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

export async function getStudentTrust(uid: string): Promise<StudentTrustRecord> {
  const snapshot = await getAdminDb().collection("users").doc(uid).get();
  if (!snapshot.exists) {
    throw new TrustRepositoryError(404, "Usuario no encontrado.");
  }

  const data = snapshot.data() ?? {};
  return {
    status: normalizeStudentTrustStatus(data.studentStatus),
    endorsementCount: Number.isFinite(Number(data.studentEndorsementCount))
      ? Math.max(0, Number(data.studentEndorsementCount))
      : 0,
    verifiedAt: timestampIso(data.studentVerifiedAt),
    revokedAt: timestampIso(data.studentRevokedAt),
  };
}

export async function endorseStudent(
  endorserUid: string,
  targetEmailInput: string,
  now: Date = new Date(),
): Promise<StudentTrustRecord> {
  const targetEmail = normalizeInstitutionalEmail(targetEmailInput);
  const db = getAdminDb();

  const targetQuery = await db
    .collection("users")
    .where("email", "==", targetEmail)
    .limit(1)
    .get();

  if (targetQuery.empty) {
    throw new TrustRepositoryError(404, "No existe una cuenta con ese correo institucional.");
  }

  const targetReference = targetQuery.docs[0].ref;
  const targetUid = targetReference.id;
  const endorserReference = db.collection("users").doc(endorserUid);
  const endorsementReference = targetReference.collection("endorsements").doc(endorserUid);
  const periodId = trustPeriodId(now);
  const counterReference = endorserReference.collection("trust_counters").doc(periodId);
  const createdAt = Timestamp.fromDate(now);

  let result: StudentTrustRecord | null = null;

  await db.runTransaction(async (transaction) => {
    const [endorserSnapshot, targetSnapshot, endorsementSnapshot, counterSnapshot] =
      await Promise.all([
        transaction.get(endorserReference),
        transaction.get(targetReference),
        transaction.get(endorsementReference),
        transaction.get(counterReference),
      ]);

    if (!endorserSnapshot.exists) {
      throw new TrustRepositoryError(404, "Tu perfil de usuario no está disponible.");
    }
    if (!targetSnapshot.exists) {
      throw new TrustRepositoryError(404, "Usuario no encontrado.");
    }

    const endorserData = endorserSnapshot.data() ?? {};
    const targetData = targetSnapshot.data() ?? {};
    const currentCounter = Number(counterSnapshot.data()?.count ?? 0);

    const eligibility = canEndorseStudent({
      endorserUid,
      targetUid,
      endorserStatus: normalizeStudentTrustStatus(endorserData.studentStatus),
      targetStatus: normalizeStudentTrustStatus(targetData.studentStatus),
      alreadyEndorsed: endorsementSnapshot.exists,
      endorsementsGivenThisPeriod: Number.isFinite(currentCounter)
        ? Math.max(0, currentCounter)
        : 0,
    });

    if (!eligibility.allowed) {
      throw new TrustRepositoryError(409, eligibility.reason);
    }

    const currentCount = Number(targetData.studentEndorsementCount ?? 0);
    const next = nextStudentTrustState(
      Number.isFinite(currentCount) ? currentCount : 0,
    );

    transaction.set(endorsementReference, {
      endorserUid,
      targetUid,
      periodId,
      createdAt,
    });

    transaction.set(
      counterReference,
      {
        periodId,
        count: Math.max(0, Number.isFinite(currentCounter) ? currentCounter : 0) + 1,
        updatedAt: createdAt,
      },
      { merge: true },
    );

    const targetUpdate: Record<string, unknown> = {
      studentStatus: next.status,
      studentEndorsementCount: next.count,
      updatedAt: createdAt,
    };

    if (next.status === "verified") {
      targetUpdate.studentVerifiedAt = createdAt;
      targetUpdate.studentRevokedAt = null;
    }

    transaction.update(targetReference, targetUpdate);

    result = {
      status: next.status,
      endorsementCount: next.count,
      verifiedAt:
        next.status === "verified"
          ? createdAt.toDate().toISOString()
          : timestampIso(targetData.studentVerifiedAt),
      revokedAt: null,
    };
  });

  if (!result) {
    throw new TrustRepositoryError(500, "No se pudo registrar el aval.");
  }

  return result;
}
