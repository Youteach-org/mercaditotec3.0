import { describe, expect, it } from "vitest";
import {
  parseArcoSubmission,
  parseArcoResolution,
  privacyRequestDocumentId,
  ArcoValidationError,
} from "./arco";

describe("ARCO request validation", () => {
  it("accepts access and cancellation without obligatory details", () => {
    expect(parseArcoSubmission({ type: "access", details: "   " }))
      .toEqual({ type: "access", details: "" });
    expect(parseArcoSubmission({ type: "cancellation", details: "" }).type)
      .toBe("cancellation");
  });
  it("requires a specific purpose for opposition and rectification", () => {
    for (const type of ["opposition", "rectification"]) {
      expect(() => parseArcoSubmission({ type, details: "breve" })).toThrow(ArcoValidationError);
      expect(parseArcoSubmission({ type, details: "Solicito cambiar estos datos, por favor." }).type).toBe(type);
    }
  });
  it("rejects unrecognized types, oversized input and non-string values", () => {
    expect(() => parseArcoSubmission({ type: "admin", details: "" })).toThrow(ArcoValidationError);
    expect(() => parseArcoSubmission({ type: "access", details: "a".repeat(1201) })).toThrow(ArcoValidationError);
    expect(() => parseArcoSubmission({ type: "access", details: { private: true } })).toThrow(ArcoValidationError);
  });
  it("prevents closing requests without written response and invalid state", () => {
    expect(() => parseArcoResolution({ status: "resolved", response: "ok" })).toThrow(ArcoValidationError);
    expect(() => parseArcoResolution({ status: "received", response: "" })).toThrow(ArcoValidationError);
    expect(parseArcoResolution({ status: "in_review", response: "" })).toEqual({ status: "in_review", response: "" });
  });
  it("names request documents from authenticated UID and UTC date, rejecting bad UIDs", () => {
    expect(privacyRequestDocumentId("user_26", "access", new Date("2026-10-22T15:25:00Z")))
      .toBe("user_26__20261022__access");
    expect(() => privacyRequestDocumentId("../user", "access", new Date())).toThrow(ArcoValidationError);
  });
});
