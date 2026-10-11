import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./AppShell.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/admin/pending-counts/route.ts", import.meta.url), "utf8");

describe("Admin navigation counts", () => {
  it("only requests counts for fresh server-verified administrators", () => {
    expect(source).toContain('"/api/admin/pending-counts"');
    expect(source).toContain("!serverAdminVerified");
    expect(source).toContain('pathname.startsWith("/admin")');
    expect(route).toContain("await requireAdmin(request)");
    expect(route).toContain('"studentStatus", "==", "pending"');
    expect(route).toContain('"status", "==", "pending_review"');
  });
  it("hides the count icons inside admin pages and preserves mobile navigation", () => {
    expect(source.match(/!adminSurface && pendingApprovals/g)).toHaveLength(2);
    expect(source).toContain('<NavIcon icon="profile" />{pendingApprovals.usersPending}');
    expect(source).toContain('<NavIcon icon="store" />{pendingApprovals.storesPending}');
    expect(source).not.toContain("window.setInterval(() => void check(), 60_000)");
    expect(source).toContain('document.addEventListener("visibilitychange", onVisible)');
    expect(source).toContain("appUser?.unreadNotificationCount");
    expect(source).toContain("Date.now() - lastFocusRefresh < 30_000");
  });
});
