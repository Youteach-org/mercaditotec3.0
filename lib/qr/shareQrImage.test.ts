import { describe, expect, it, vi } from "vitest";
import { shareQrImage } from "./shareQrImage";

function png() {
  return new File([new Uint8Array([137, 80, 78, 71])], "mercadito-qr.png", { type: "image/png" });
}

describe("QR sharing across Windows and mobile", () => {
  it("copies the real PNG image on Windows/desktop when navigator.share(files) is unavailable", async () => {
    const copyPng = vi.fn().mockResolvedValue(undefined);
    const downloadPng = vi.fn();
    const file = png();
    const result = await shareQrImage(file, {
      nativeShare: vi.fn(), canNativeShare: () => false,
      copyPng, downloadPng,
    });
    expect(result).toBe("copied");
    expect(copyPng).toHaveBeenCalledWith(file);
    expect(downloadPng).not.toHaveBeenCalled();
  });

  it("uses the native image-sharing sheet on compatible Android/mobile browsers", async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const copyPng = vi.fn();
    const result = await shareQrImage(png(), {
      nativeShare, canNativeShare: () => true, copyPng, downloadPng: vi.fn(),
    });
    expect(result).toBe("shared");
    expect(nativeShare).toHaveBeenCalledWith({ files: [expect.any(File)] });
    expect(copyPng).not.toHaveBeenCalled();
  });

  it("downloads PNG as a last resort when Windows blocks clipboard image writes", async () => {
    const downloadPng = vi.fn();
    const result = await shareQrImage(png(), {
      copyPng: vi.fn().mockRejectedValue(new Error("NotAllowedError")),
      downloadPng,
    });
    expect(result).toBe("downloaded");
    expect(downloadPng).toHaveBeenCalledOnce();
  });

  it("downloads when native sharing and image clipboard are missing", async () => {
    const downloadPng = vi.fn();
    expect(await shareQrImage(png(), { downloadPng })).toBe("downloaded");
    expect(downloadPng).toHaveBeenCalledOnce();
  });

  it("does not unexpectedly copy or download when the user cancels native sharing", async () => {
    const cancel = Object.assign(new Error("cancelled"), { name: "AbortError" });
    const copyPng = vi.fn();
    const downloadPng = vi.fn();
    expect(await shareQrImage(png(), {
      canNativeShare: () => true,
      nativeShare: vi.fn().mockRejectedValue(cancel),
      copyPng, downloadPng,
    })).toBe("cancelled");
    expect(copyPng).not.toHaveBeenCalled();
    expect(downloadPng).not.toHaveBeenCalled();
  });

  it("treats a faulty canShare implementation as unsupported and copies the PNG", async () => {
    const copyPng = vi.fn();
    expect(await shareQrImage(png(), {
      canNativeShare: () => { throw new TypeError("unsupported"); },
      nativeShare: vi.fn(),
      copyPng,
      downloadPng: vi.fn(),
    })).toBe("copied");
    expect(copyPng).toHaveBeenCalledOnce();
  });
});
