(function () {
  "use strict";
  if (window.__mercaditotecBridgeInstalled) return;
  window.__mercaditotecBridgeInstalled = true;
  const LIMIT = 8 * 1024 * 1024;
  const nativeBridge = () => window.MercaditoBridge ||
    window.webkit?.messageHandlers?.MercaditoBridge;

  function transmit(message) {
    const bridge = nativeBridge();
    if (!bridge || typeof bridge.postMessage !== "function") {
      throw new Error("La integración de este dispositivo no está disponible.");
    }
    // Android WebMessageListener accepts strings. WKWebView accepts objects.
    if (window.MercaditoBridge) bridge.postMessage(JSON.stringify(message));
    else bridge.postMessage(message);
  }

  function fileAsDataUrl(blob) {
    if (blob.size > LIMIT) return Promise.reject(new Error("Archivo demasiado grande."));
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
      reader.readAsDataURL(blob);
    });
  }

  async function toPayload(blob, filename) {
    return {
      filename: String(filename || "mercaditotec.png").slice(0, 110),
      mime: blob.type || "image/png",
      dataUrl: await fileAsDataUrl(blob)
    };
  }

  async function shareNative(data) {
    const payload = {
      type: "share",
      title: String(data?.title || ""),
      text: String(data?.text || ""),
      url: String(data?.url || ""),
    };
    const file = data?.files?.[0];
    if (file instanceof Blob) {
      payload.file = await toPayload(file, file.name || "mercaditotec-qr.png");
    }
    transmit(payload);
  }

  // The Web Share API can be absent or file-sharing-incomplete in WebView.
  // Our implementation supports the QR PNG and URL, preserving the original
  // React dialog and its asynchronous preparation.
  try {
    Object.defineProperty(navigator, "share", { configurable: true, value: shareNative });
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: (data) => !data?.files || (
        data.files.length === 1 && data.files[0] instanceof Blob &&
        data.files[0].size <= LIMIT
      ),
    });
  } catch (_error) {
    navigator.share = shareNative;
    navigator.canShare = (data) => !data?.files || data.files.length === 1;
  }

  // Chromium WebView cannot download blob: URLs through DownloadManager.
  // Intercept only deliberate <a download> links; send their bytes to the
  // native Downloads / iOS share-to-save interface, never a server.
  document.addEventListener("click", function (event) {
    const anchor = event.target?.closest?.("a[download]");
    if (!anchor || !anchor.href.startsWith("blob:")) return;
    event.preventDefault();
    event.stopPropagation();
    (async () => {
      const response = await fetch(anchor.href);
      if (!response.ok) throw new Error("No se pudo generar el archivo.");
      const blob = await response.blob();
      transmit({ type: "download", file: await toPayload(blob, anchor.download) });
    })().catch((error) => {
      console.warn("MercaditoTec: no se pudo guardar el archivo local", error?.message);
    });
  }, true);
})();
