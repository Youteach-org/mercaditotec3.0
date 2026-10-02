import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("Firebase data and Supabase image-only architecture", () => {
  it("keeps shared image metadata in Firestore", () => {
    const repository = source("lib/chat/imageLibraryRepository.ts");
    expect(repository).toContain('getAdminDb()');
    expect(repository).toContain('"chat_image_library"');
    expect(repository).not.toContain("supabase");
  });

  it("uses the secure image upload function instead of Supabase database calls", () => {
    const chat = source("app/chat/page.tsx");
    const media = source("lib/store/mediaClient.ts");

    expect(chat).toContain("uploadImageFile");
    expect(media).toContain("uploadImageFile");
    expect(chat).not.toMatch(/supabase\s*\.\s*from\s*\(/);
    expect(media).not.toMatch(/supabase\s*\.\s*from\s*\(/);
  });

  it("keeps Firebase as the application data and authentication layer", () => {
    const firebase = source("lib/firebase.ts");
    expect(firebase).toContain("getAuth");
    expect(firebase).toContain("getFirestore");
  });
});
