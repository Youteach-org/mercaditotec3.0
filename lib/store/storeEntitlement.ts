/** Server-owned entitlement: never accept a plan supplied by the browser. */
export function hasPlusStoreAccess(profile: Record<string, unknown> | undefined, verifiedEmail: string): boolean {
  const email = verifiedEmail.trim().toLowerCase();
  // Reserved founder account, with verified institutional identity.
  if (email === "l22121079@morelia.tecnm.mx") return true;
  return profile?.plan === "plus" || profile?.plan === "premium";
}
