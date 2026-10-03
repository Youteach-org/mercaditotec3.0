import { describe, expect, it } from "vitest";
import * as media from "../store/media";

function parse(path: string, uid = "student-1") {
  const candidate = (media as Record<string, unknown>).parseImageUploadPath;
  expect(candidate).toBeTypeOf("function");
  return (candidate as (path: string, uid: string) => unknown)(path, uid);
}
describe("upload namespace boundary", () => {
  it.each([
    "chat/student-1/shared/2026-10/x.jpg",
    "stores/student-1/store-1/logo/x.png",
    "stores/student-1/store-1/products/product-1/x.webp",
  ])("accepts the supported canonical path: %s", (path) => {
    expect(parse(path)).toMatchObject({ path });
  });
  it.each([
    "chat/victim/shared/2026-10/x.jpg",
    "chat/student-1/shared/../victim/x.jpg",
    "chat/student-1/shared/%2e%2e/x.jpg",
    "chat/student-1//shared/2026-10/x.jpg",
    "chat/student-1/shared/2026-10/x.svg",
    "chat/student-1/arbitrary/2026-10/x.jpg",
    "stores/student-1/store-1/logo/x.jpg/extra",
  ])("rejects other owners, traversal and unsupported shapes: %s", (path) => {
    const candidate = (media as Record<string, unknown>).parseImageUploadPath;
    expect(candidate).toBeTypeOf("function");
    expect(() => (candidate as (p: string, u: string) => unknown)(path, "student-1")).toThrow();
  });
});
