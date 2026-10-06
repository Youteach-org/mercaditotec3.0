import { describe, expect, it } from "vitest";

import { Timestamp } from "../firestoreRest";
import { coerceRecordTimestamp } from "./legacyTimestamp";

describe("legacy timestamp coercion", () => {
  it("keeps current Timestamp values", () => {
    const now = Timestamp.fromMillis(1234);
    expect(coerceRecordTimestamp(now).toMillis()).toBe(1234);
  });

  it("accepts legacy number, string and Date values", () => {
    expect(coerceRecordTimestamp(2000).toMillis()).toBe(2000);
    expect(coerceRecordTimestamp("1970-01-01T00:00:03.000Z").toMillis()).toBe(3000);
    expect(coerceRecordTimestamp(new Date(4000)).toMillis()).toBe(4000);
  });

  it("falls back instead of crashing on missing or malformed legacy values", () => {
    const fallback = Timestamp.fromMillis(99);
    expect(coerceRecordTimestamp(undefined, fallback).toMillis()).toBe(99);
    expect(coerceRecordTimestamp("not-a-date", fallback).toMillis()).toBe(99);
  });
});
