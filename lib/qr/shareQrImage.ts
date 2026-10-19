/** Share the actual PNG QR on browsers that support file sharing.
 * On Windows/desktop Chromium, most browsers have no OS file-share target:
 * use the PNG clipboard so it can be pasted into WhatsApp Desktop, email,
 * Teams, etc. If clipboard images are blocked, download the PNG instead.
 *
 * All operations begin inside the original button click while user activation
 * is still available. Do not call canvas.toBlob before the share/clipboard API.
 */
export type QrShareResult = "shared" | "copied" | "downloaded" | "cancelled";

export interface QrImageShareActions {
  canNativeShare?: (data: ShareData) => boolean;
  nativeShare?: (data: ShareData) => Promise<void>;
  copyPng?: (blob: Blob) => Promise<void>;
  downloadPng: () => void;
}

export async function shareQrImage(file: File, actions: QrImageShareActions): Promise<QrShareResult> {
  const payload: ShareData = { files: [file] };
  let supported = false;
  if (actions.nativeShare && actions.canNativeShare) {
    try { supported = actions.canNativeShare(payload); }
    catch { supported = false; }
  }

  if (supported && actions.nativeShare) {
    try {
      await actions.nativeShare(payload);
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return "cancelled";
      // A failed desktop share sheet must still offer the PNG image.
    }
  }

  if (actions.copyPng) {
    try {
      await actions.copyPng(file);
      return "copied";
    } catch {
      // Windows clipboard may be disabled by the browser or user permission.
    }
  }

  actions.downloadPng();
  return "downloaded";
}
