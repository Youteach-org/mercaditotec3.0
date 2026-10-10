import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin, requireFirebaseUser, requireSuperadmin } from "./auth";

const state = vi.hoisted(() => ({
  profile: {} as Record<string, unknown>,
  claims: { uid: "student-1", email: "a22121079@morelia.tecnm.mx", email_verified: true, role: "superadmin" },
  transientAuthError: false,
}));
vi.mock("../firebaseAdmin", () => ({ getAdminAuth: () => ({ verifyIdToken: async () => {
  if (state.transientAuthError) {
    const error = new Error("Firebase upstream 429");
    error.name = "FirebaseAuthUnavailableError";
    throw error;
  }
  return state.claims;
} }) }));
vi.mock("../firestoreRest", () => ({ getAdminDb: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ data: () => state.profile }) }) }) }) }));
const request = () => new Request("https://mercadito.test/api/admin/users", { headers: { authorization: "Bearer verified-test-token" } });

beforeEach(() => {
  state.transientAuthError = false;
  state.profile = { role: "user", isActive: true };
  state.claims.email = "a22121079@morelia.tecnm.mx";
  state.claims.email_verified = true;
  state.claims.role = "superadmin";
});
describe("server authorization boundary", () => {
  it("returns temporary unavailability instead of logging out on provider quota exhaustion", async () => {
    state.transientAuthError = true;
    await expect(requireFirebaseUser(request())).rejects.toMatchObject({ status: 503 });
  });
  it("rejects an absent bearer token", async () => {
    await expect(requireFirebaseUser(new Request("https://mercadito.test"))).rejects.toMatchObject({ status: 401 });
  });
  it("rejects deactivated accounts even with a valid Firebase identity", async () => {
    state.profile.isActive = false;
    await expect(requireFirebaseUser(request())).rejects.toMatchObject({ status: 403 });
  });
  it("rejects a blocked administrator", async () => {
    state.profile = { role: "superadmin", blocked: true, blockedUntil: "2099-01-01" };
    await expect(requireAdmin(request())).rejects.toMatchObject({ status: 403 });
  });
  it("rejects a blocked superadministrator", async () => {
    state.profile = { role: "superadmin", blocked: true };
    await expect(requireSuperadmin(request())).rejects.toMatchObject({ status: 403 });
  });
  it("a persisted demotion overrides old administrator token claims", async () => {
    await expect(requireAdmin(request())).rejects.toMatchObject({ status: 403 });
  });
  it("does not grant admin access when the user profile is absent", async () => {
    state.profile = undefined as unknown as Record<string, unknown>;
    await expect(requireAdmin(request())).rejects.toMatchObject({ status: 403 });
    await expect(requireSuperadmin(request())).rejects.toMatchObject({ status: 403 });
  });
  it("rejects a verified older student on every authenticated API, despite old admin token claims", async () => {
    const expiredYear = String((new Date().getUTCFullYear() - 9) % 100).padStart(2, "0");
    state.claims.email = `a${expiredYear}121079@morelia.tecnm.mx`;
    await expect(requireFirebaseUser(request())).rejects.toMatchObject({ status: 403 });
    await expect(requireAdmin(request())).rejects.toMatchObject({ status: 403 });
  });
  it("does not give direct Firebase signups access before a server bootstrap profile exists", async () => {
    state.profile = undefined as unknown as Record<string, unknown>;
    await expect(requireFirebaseUser(request())).rejects.toMatchObject({ status: 403 });
  });
  it("keeps the special exception only for real administrators stored on the server", async () => {
    state.claims.email = "administracion@morelia.tecnm.mx";
    state.profile = { role: "superadmin", isActive: true };
    await expect(requireAdmin(request())).resolves.toMatchObject({ uid: "student-1" });
    state.profile = { role: "user", isActive: true };
    await expect(requireFirebaseUser(request())).rejects.toMatchObject({ status: 403 });
  });
  it("subadministrators cannot change administrator roles", async () => {
    state.profile.role = "subadmin";
    await expect(requireSuperadmin(request())).rejects.toMatchObject({ status: 403 });
    await expect(requireAdmin(request())).resolves.toMatchObject({ uid: "student-1" });
  });
});
