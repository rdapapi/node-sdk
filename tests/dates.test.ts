import { describe, expect, it } from "vitest";
import { expiresAt, expiresInDays, registeredAt, updatedAt } from "../src/dates.js";
import type { Dates } from "../src/types.js";

describe("date helpers", () => {
  const dates: Dates = {
    registered: "2020-01-01T00:00:00Z",
    expires: "2028-09-14T04:00:00Z",
    updated: "2024-02-20T10:16:08Z",
  };

  it("parses registered date", () => {
    const d = registeredAt(dates);
    expect(d).toBeInstanceOf(Date);
    expect((d as Date).getUTCFullYear()).toBe(2020);
  });

  it("parses expires date", () => {
    const d = expiresAt(dates);
    expect(d).toBeInstanceOf(Date);
    expect((d as Date).getUTCFullYear()).toBe(2028);
  });

  it("parses updated date", () => {
    const d = updatedAt(dates);
    expect(d).toBeInstanceOf(Date);
    expect((d as Date).getUTCFullYear()).toBe(2024);
  });

  it("calculates days until expiry", () => {
    const days = expiresInDays(dates);
    expect(days).toBeTypeOf("number");
    expect(days as number).toBeGreaterThan(0);
  });

  it("returns null for null fields", () => {
    const nullDates: Dates = { registered: null, expires: null, updated: null };
    expect(registeredAt(nullDates)).toBeNull();
    expect(expiresAt(nullDates)).toBeNull();
    expect(updatedAt(nullDates)).toBeNull();
    expect(expiresInDays(nullDates)).toBeNull();
  });

  it("returns null for invalid date strings", () => {
    const badDates: Dates = { registered: "not-a-date", expires: "garbage", updated: null };
    expect(registeredAt(badDates)).toBeNull();
    expect(expiresAt(badDates)).toBeNull();
    expect(expiresInDays(badDates)).toBeNull();
  });
});
