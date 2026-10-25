import { describe, expect, it } from "vitest";
import { monitoringErrorReason } from "./usage";

describe("Cloud Monitoring error classification", () => {
  it("distinguishes permission and invalid query errors without exposing provider text", () => {
    expect(monitoringErrorReason(403, "PERMISSION_DENIED")).toContain("HTTP 403 — PERMISSION_DENIED");
    expect(monitoringErrorReason(400, "INVALID_ARGUMENT")).toContain("parámetros");
    expect(monitoringErrorReason(404, "NOT_FOUND")).toContain("ruta o el proyecto");
  });

  it("never includes arbitrary Google error strings in the browser response", () => {
    const reason = monitoringErrorReason(403, "secret-private-key-value");
    expect(reason).toContain("HTTP 403");
    expect(reason).not.toContain("secret-private-key-value");
  });
});
