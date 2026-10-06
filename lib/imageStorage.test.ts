import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "imageStorage.ts"), "utf8");
const profileSource = readFileSync(
  join(here, "..", "app", "profile", "page.tsx"),
  "utf8",
);
const mediaClientSource = readFileSync(
  join(here, "store", "mediaClient.ts"),
  "utf8",
);

describe("automatic image optimization", () => {
  it("optimizes oversized images before every central upload", () => {
    expect(source).toContain("prepareImageForUpload");
    expect(source).toContain("MAX_UPLOADED_IMAGE_BYTES = 1_048_576");
    expect(source).toContain("imageCompression(");
    expect(source).toContain('fileType: "image/webp"');
    expect(source).toContain("const prepared = await prepareImageForUpload");
    expect(source).toContain("prepared.size > MAX_UPLOADED_IMAGE_BYTES");
  });

  it("optimizes store media before validating its final upload metadata", () => {
    expect(mediaClientSource).toContain("await prepareImageForUpload");
    expect(mediaClientSource).toContain("type:");
    expect(mediaClientSource).toContain("prepared.type");
    expect(mediaClientSource).toContain("prepared.size");
  });

  it("no longer rejects profile photos merely because the original exceeds 1 MB", () => {
    expect(profileSource).toContain("await prepareImageForUpload(file, file.name)");
    expect(profileSource).not.toContain("file.size > 1024 * 1024");
  });
});
