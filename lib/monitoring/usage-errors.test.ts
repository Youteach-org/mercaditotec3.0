import { describe, expect, it } from "vitest";
import { monitoringErrorReason } from "./usage";

describe("Cloud Monitoring error classification", () => {
  it("distinguishes permission and invalid query errors without exposing provider text", () => {
    expect(monitoringErrorReason(403, "PERMISSION_DENIED")).toContain("HTTP 403 — PERMISSION_DENIED");
    expect(monitoringErrorReason(400, "INVALID_ARGUMENT")).toContain("parámetros");
    expect(monitoringErrorReason(404, "NOT_FOUND")).toContain("ruta o el proyecto");
  });

  it("reports known RPC ErrorInfo reasons that distinguish missing IAM from a disabled API", () => {
    const missingIam = monitoringErrorReason(403, "PERMISSION_DENIED", "IAM_PERMISSION_DENIED");
    const disabled = monitoringErrorReason(403, "PERMISSION_DENIED", "SERVICE_DISABLED");
    expect(missingIam).toContain("IAM_PERMISSION_DENIED");
    expect(disabled).toContain("SERVICE_DISABLED");
    expect(disabled).toContain("proyecto consumidor");
  });

  it("does not expose arbitrary provider-supplied RPC reason text", () => {
    const message = monitoringErrorReason(403, "PERMISSION_DENIED", "user@example.com secret");
    expect(message).toContain("HTTP 403");
    expect(message).not.toContain("user@example.com");
  });

  it("never includes arbitrary Google error strings in the browser response", () => {
    const reason = monitoringErrorReason(403, "secret-private-key-value");
    expect(reason).toContain("HTTP 403");
    expect(reason).not.toContain("secret-private-key-value");
  });
});
