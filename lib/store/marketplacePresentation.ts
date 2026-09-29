import {
  MARKETPLACE_VARIANTS,
  type MarketplaceVariant,
} from "./domain";

export function marketplaceVariantIndex(variant: MarketplaceVariant): number {
  return MARKETPLACE_VARIANTS.indexOf(variant);
}

function stableHash(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function resolveMarketplaceVariant(
  explicitVariant: MarketplaceVariant | null | undefined,
  storeId: string,
): MarketplaceVariant {
  if (explicitVariant && MARKETPLACE_VARIANTS.includes(explicitVariant)) {
    return explicitVariant;
  }

  const index = stableHash(storeId || "mercaditotec") % MARKETPLACE_VARIANTS.length;
  return MARKETPLACE_VARIANTS[index];
}
