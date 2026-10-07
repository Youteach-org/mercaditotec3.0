import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  FIRESTORE_RULES_SOURCE,
  STORAGE_RULES_SOURCE,
} from "./firebaseRulesDeployment";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function normalized(value: string): string {
  return value.replace(/\r\n/g, "\n").trim() + "\n";
}

describe("Firebase production rules deployment source", () => {
  it("embeds exactly the checked-in Firestore rules", () => {
    expect(normalized(FIRESTORE_RULES_SOURCE)).toBe(
      normalized(readFileSync(join(root, "firestore.rules"), "utf8")),
    );
  });

  it("embeds exactly the checked-in Storage rules", () => {
    expect(normalized(STORAGE_RULES_SOURCE)).toBe(
      normalized(readFileSync(join(root, "storage.rules"), "utf8")),
    );
  });

  it("keeps the runtime-only synchronizer off the public routing surface", () => {
    const runtime = readFileSync(join(root, "cloudflare-runtime-entry.mjs"), "utf8");
    expect(runtime).toContain('url.pathname === "/api/internal/firebase-rules-sync"');
    expect(runtime).toContain('new URL("/api/internal/firebase-rules-sync", request.url)');
    expect(runtime).toContain('"x-mercadito-internal-runtime": "firebase-rules-sync-v1"');
  });
});
