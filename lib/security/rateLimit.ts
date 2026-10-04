import { getAdminDb } from "../firestoreRest";

interface MutationBudget { window: number; count: number }
export class MutationLimitError extends Error {
  constructor() { super("Demasiadas acciones. Espera un minuto e inténtalo de nuevo."); }
}

export function nextMutationBudget(previous: MutationBudget | undefined, now: number): MutationBudget {
  const window = Math.floor(now / 60000);
  const count = previous?.window === window ? previous.count : 0;
  if (!Number.isInteger(count) || count < 0 || count >= 60) throw new MutationLimitError();
  return { window, count: count + 1 };
}

export async function consumeMutationBudget(uid: string): Promise<void> {
  const db = getAdminDb();
  // One server-owned record per account, shared across Worker instances.
  const reference = db.collection("mutation_budgets").doc(uid);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const previous = snapshot.data() as MutationBudget | undefined;
    transaction.set(reference, nextMutationBudget(previous, Date.now()));
  });
}
