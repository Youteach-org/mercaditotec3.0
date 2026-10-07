import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin, requireFirebaseUser, requireSuperadmin } from "./auth";

const state = vi.hoisted(() => ({
  profile: {} as Record<string, unknown>,
  claims: { uid: "student-1", email: "a22121079@morelia.tecnm.mx", email_verified: true, role: "superadmin" },
}));
vi.mock("../firebaseAdmin", () => ({ getAdminAuth: () => ({ verifyIdToken: async () => state.claims }) }));
vi.mock("../firestoreRest", () => ({ getAdminDb: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ data: () => state.profile }) }) }) }) }));
const request = () => new Request("https://mercadito.test/api/admin/users", { headers: { authorization: "Bearer verified-test-token" } });

beforeEach(() => { state.profile = { role: "user", isActive: true }; });
describe("server authorization boundary", () => {
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
  it("subadministrators cannot change administrator roles", async () => {
    state.profile.role = "subadmin";
    await expect(requireSuperadmin(request())).rejects.toMatchObject({ status: 403 });
    await expect(requireAdmin(request())).resolves.toMatchObject({ uid: "student-1" });
  });
});
