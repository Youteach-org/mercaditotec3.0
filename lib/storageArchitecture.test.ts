import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

describe("Firebase data and Supabase image-only architecture", () => {
  it("keeps chat metadata in Firestore instead of Supabase tables", () => {
    const chat = readFileSync(join(root, "app/chat/page.tsx"), "utf8");
    expect(chat).not.toContain('.from("chat_image_library")');
    expect(chat).toContain('collection(db, "chat_image_library")');
  });

  it("uses Supabase only through Storage in the chat page", () => {
    const chat = readFileSync(join(root, "app/chat/page.tsx"), "utf8");
    expect(chat).toContain("supabase.storage");
    expect(chat).not.toMatch(/supabase\s*\.\s*from\s*\(/);
  });
});
