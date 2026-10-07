import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCommunityPost,
  listActiveCommunityPosts,
  resolveCommunityPost,
} from "./repository";

vi.mock("../firebaseAdmin", () => ({
  getAdminAccessToken: async () => "test-service-token",
  getFirebaseProjectId: () => "test-project",
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

function value(value: unknown): Record<string, unknown> {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  throw new Error("Unsupported test value");
}

function postDocument(input: {
  id: string;
  authorUid: string;
  type: "quick_notice" | "found_item";
  title: string;
  createdAt: string;
  status?: "active" | "resolved";
}) {
  return {
    name: `projects/test-project/databases/(default)/documents/community_posts/${input.id}`,
    fields: {
      authorUid: value(input.authorUid),
      type: value(input.type),
      title: value(input.title),
      body: value("Mensaje"),
      location: value("Biblioteca"),
      imageUrl: { nullValue: null },
      status: value(input.status ?? "active"),
      createdAt: { timestampValue: input.createdAt },
      updatedAt: { timestampValue: input.createdAt },
      resolvedAt: { nullValue: null },
    },
  };
}

describe("createCommunityPost", () => {
  it("stores the authenticated uid and server-owned active status", async () => {
    let patchBody: any = null;

    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
      if (init?.method === "PATCH" && url.pathname.includes("/documents/community_posts/")) {
        patchBody = JSON.parse(String(init.body));
        return Response.json({});
      }
      throw new Error(`Unexpected request: ${init?.method} ${url.pathname}`);
    });

    const record = await createCommunityPost("student-1", {
      type: "quick_notice",
      title: "Aviso",
      body: "Mensaje",
      location: "",
      imageUrl: null,
    });

    expect(record.authorUid).toBe("student-1");
    expect(record.status).toBe("active");
    expect(record.resolvedAt).toBeNull();
    expect(patchBody.fields.authorUid.stringValue).toBe("student-1");
    expect(patchBody.fields.status.stringValue).toBe("active");
  });
});

describe("listActiveCommunityPosts", () => {
  it("sorts newest first, filters by type and applies the requested limit", async () => {
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
      if (init?.method === "POST" && url.pathname.endsWith("/documents:runQuery")) {
        return Response.json([
          { document: postDocument({ id: "old-found", authorUid: "a", type: "found_item", title: "Viejo", createdAt: "2026-10-07T10:00:00Z" }) },
          { document: postDocument({ id: "new-quick", authorUid: "b", type: "quick_notice", title: "Nuevo aviso", createdAt: "2026-10-07T12:00:00Z" }) },
          { document: postDocument({ id: "new-found", authorUid: "c", type: "found_item", title: "Nuevo objeto", createdAt: "2026-10-07T11:00:00Z" }) },
        ]);
      }
      throw new Error(`Unexpected request: ${init?.method} ${url.pathname}`);
    });

    const all = await listActiveCommunityPosts({ limit: 2 });
    expect(all.map((post) => post.id)).toEqual(["new-quick", "new-found"]);

    const found = await listActiveCommunityPosts({ type: "found_item", limit: 10 });
    expect(found.map((post) => post.id)).toEqual(["new-found", "old-found"]);
  });
});

describe("resolveCommunityPost", () => {
  it("rejects resolution by a different author", async () => {
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
      if (init?.method === "GET" && url.pathname.endsWith("/documents/community_posts/post-1")) {
        return Response.json(postDocument({
          id: "post-1",
          authorUid: "victim",
          type: "found_item",
          title: "Termo",
          createdAt: "2026-10-07T10:00:00Z",
        }));
      }
      throw new Error(`Unexpected request: ${init?.method} ${url.pathname}`);
    });

    await expect(resolveCommunityPost("student-1", "post-1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("lets the author resolve the post", async () => {
    let updateBody: any = null;

    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
      if (init?.method === "GET" && url.pathname.endsWith("/documents/community_posts/post-1")) {
        return Response.json(postDocument({
          id: "post-1",
          authorUid: "student-1",
          type: "found_item",
          title: "Termo",
          createdAt: "2026-10-07T10:00:00Z",
        }));
      }
      if (init?.method === "PATCH" && url.pathname.endsWith("/documents/community_posts/post-1")) {
        updateBody = JSON.parse(String(init.body));
        return Response.json({});
      }
      throw new Error(`Unexpected request: ${init?.method} ${url.pathname}`);
    });

    const resolved = await resolveCommunityPost("student-1", "post-1");

    expect(resolved.status).toBe("resolved");
    expect(resolved.resolvedAt).not.toBeNull();
    expect(updateBody.fields.status.stringValue).toBe("resolved");
    expect(updateBody.fields.resolvedAt.timestampValue).toBeTruthy();
  });
});
