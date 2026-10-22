/** True only for a MercaditoTec hybrid app with an origin-scoped native bridge. */
export function getMercaditoHost(): "android" | "ios" | null {
  if (typeof window === "undefined") return null;
  const native = window as Window & {
    MercaditoBridge?: { postMessage(value: string): void };
    webkit?: { messageHandlers?: { MercaditoBridge?: { postMessage(value: unknown): void } } };
  };
  if (native.MercaditoBridge?.postMessage) return "android";
  if (native.webkit?.messageHandlers?.MercaditoBridge?.postMessage) return "ios";
  return null;
}

export function isNativeMercaditoApp(): boolean {
  return getMercaditoHost() !== null;
}
