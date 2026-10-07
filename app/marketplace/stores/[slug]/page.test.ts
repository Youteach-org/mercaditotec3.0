import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(currentDirectory, "page.tsx"), "utf8");

describe("Public store WhatsApp CTA", () => {
  it("renders the WhatsApp CTA only from the public derived URL", () => {
    expect(pageSource).toContain("store.whatsappUrl");
    expect(pageSource).toContain("Contactar por WhatsApp");
    expect(pageSource).toContain('target="_blank"');
    expect(pageSource).toContain('rel="noopener noreferrer"');
  });
});
