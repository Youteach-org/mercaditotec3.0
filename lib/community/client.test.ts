import { afterEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";

import { storeApiFetch } from "../store/client";
import {
  createCommunityPostRequest,
  loadCommunityPosts,
  resolveCommunityPostRequest,
} from "./client";

vi.mock("../store/client", () => ({
  storeApiFetch: vi.fn(),
}));

const user = {} as User;

afterEach(() => {
  vi.clearAllMocks();
});

describe("community client", () => {
  it("loads posts with encoded filters", async () => {
    vi.mocked(storeApiFetch).mockResolvedValue(
      Response.json({ posts: [] }),
    );

    await loadCommunityPosts(user, { type: "found_item", limit: 4 });

    expect(storeApiFetch).toHaveBeenCalledWith(
      user,
      "/api/community-posts?type=found_item&limit=4",
    );
  });

  it("creates a post with bearer-authenticated API helper", async () => {
    vi.mocked(storeApiFetch).mockResolvedValue(
      Response.json({ post: { id: "post-1" } }, { status: 201 }),
    );

    await createCommunityPostRequest(user, {
      type: "quick_notice",
      title: "Aviso",
      body: "Mensaje",
      location: "",
      imageUrl: null,
    });

    expect(storeApiFetch).toHaveBeenCalledWith(
      user,
      "/api/community-posts",
      expect.objectContaining({
        method: "POST",
        body: expect.any(String),
      }),
    );
  });

  it("resolves a post with only resolved status", async () => {
    vi.mocked(storeApiFetch).mockResolvedValue(
      Response.json({ post: { id: "post-1", status: "resolved" } }),
    );

    await resolveCommunityPostRequest(user, "post-1");

    const call = vi.mocked(storeApiFetch).mock.calls[0];
    expect(call[1]).toBe("/api/community-posts/post-1");
    expect(call[2]).toMatchObject({ method: "PATCH" });
    expect(JSON.parse(String(call[2]?.body))).toEqual({ status: "resolved" });
  });

  it("surfaces API error messages", async () => {
    vi.mocked(storeApiFetch).mockResolvedValue(
      Response.json({ error: "No autorizado." }, { status: 403 }),
    );

    await expect(loadCommunityPosts(user)).rejects.toThrow("No autorizado.");
  });
});
