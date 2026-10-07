import { describe, expect, it } from "vitest";

import {
  buildCommunityPostMediaPath,
  validateCommunityPostImageUrl,
} from "./media";

describe("buildCommunityPostMediaPath", () => {
  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["image/gif", "gif"],
  ])("builds an owner-bound path for %s", (mimeType, extension) => {
    expect(
      buildCommunityPostMediaPath({
        ownerUid: "student-1",
        nonce: "abc123",
        mimeType,
      }),
    ).toBe(`community-posts/student-1/abc123.${extension}`);
  });

  it("rejects unsupported MIME types", () => {
    expect(() =>
      buildCommunityPostMediaPath({
        ownerUid: "student-1",
        nonce: "abc123",
        mimeType: "image/svg+xml",
      }),
    ).toThrow();
  });
});

describe("validateCommunityPostImageUrl", () => {
  const own =
    "https://wfmokinfcypfpdisussw.supabase.co/storage/v1/object/public/chat-images/community-posts/student-1/a.png";

  it("accepts a Supabase image owned by the current user", () => {
    expect(validateCommunityPostImageUrl(own, "student-1")).toBe(own);
  });

  it("rejects another user's otherwise valid image", () => {
    expect(() =>
      validateCommunityPostImageUrl(own, "victim"),
    ).toThrow();
  });

  it("rejects external origins", () => {
    expect(() =>
      validateCommunityPostImageUrl(
        "https://example.com/community-posts/student-1/a.png",
        "student-1",
      ),
    ).toThrow();
  });
});
