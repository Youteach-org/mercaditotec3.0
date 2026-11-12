import { describe, expect, it } from "vitest";
import { publicStoreImageSrc } from "./publicStoreImageSrc";

const origin = "https://wfmokinfcypfpdisussw.supabase.co/storage/v1/object/public/chat-images/";

describe("publicStoreImageSrc", () => {
  it("moves approved store photos to same-origin edge delivery", () => {
    expect(publicStoreImageSrc(origin + "stores/owner/store/products/item/image.webp"))
      .toBe("/media/stores/owner/store/products/item/image.webp");
    expect(publicStoreImageSrc(origin + "stores/owner/store/logo/image.png"))
      .toBe("/media/stores/owner/store/logo/image.png");
    expect(publicStoreImageSrc(origin + "stores/owner/store/cover/image.jpg"))
      .toBe("/media/stores/owner/store/cover/image.jpg");
  });

  it("never proxies chats, profiles, offsite files or query-variant URLs", () => {
    for (const url of [
      origin + "chat/owner/shared/2026-11/image.png",
      origin + "profile-images/owner/avatar.png",
      "https://other.example.org/storage/v1/object/public/chat-images/stores/owner/store/logo/x.png",
      origin + "stores/owner/store/logo/image.png?token=test",
      origin + "stores/owner/store/logo/%2e%2e.png",
      "blob:https://mercaditotec.store/example",
    ]) {
      expect(publicStoreImageSrc(url)).toBe(url);
    }
  });

  it("keeps blank URLs and external demo images unchanged", () => {
    expect(publicStoreImageSrc(null)).toBe("");
    expect(publicStoreImageSrc("https://example.org/demo.jpg")).toBe("https://example.org/demo.jpg");
  });
});
