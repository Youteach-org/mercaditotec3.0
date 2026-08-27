import type { StoreEditableInput } from "./domain";

export function buildBootstrapStoreInput(seed: string): StoreEditableInput {
  const suffix = seed
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toLowerCase() || "nueva1";

  return {
    name: `Nueva tienda ${suffix}`,
    description: "",
  };
}
