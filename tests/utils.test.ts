import { describe, it, expect } from "vitest";
import { snakeToCamel, camelCaseKeys } from "../src/utils.js";

describe("snakeToCamel", () => {
  it("converts simple snake_case", () => {
    expect(snakeToCamel("rdap_server")).toBe("rdapServer");
  });

  it("converts multiple underscores", () => {
    expect(snakeToCamel("raw_rdap_url")).toBe("rawRdapUrl");
  });

  it("returns camelCase string unchanged", () => {
    expect(snakeToCamel("already")).toBe("already");
  });

  it("handles single character segments", () => {
    expect(snakeToCamel("ip_version")).toBe("ipVersion");
  });

  it("handles numeric segments", () => {
    expect(snakeToCamel("port43")).toBe("port43");
  });

  it("converts underscore followed by digit", () => {
    expect(snakeToCamel("v_4")).toBe("v4");
  });
});

describe("camelCaseKeys", () => {
  it("converts object keys recursively", () => {
    const input = {
      rdap_server: "https://example.com",
      nested: { raw_rdap_url: "https://example.com/test", deep: { cache_expires: "2026-01-01" } },
    };
    expect(camelCaseKeys(input)).toEqual({
      rdapServer: "https://example.com",
      nested: { rawRdapUrl: "https://example.com/test", deep: { cacheExpires: "2026-01-01" } },
    });
  });

  it("converts keys inside arrays", () => {
    const input = [{ start_address: "1.0.0.0" }, { end_address: "1.0.0.255" }];
    expect(camelCaseKeys(input)).toEqual([
      { startAddress: "1.0.0.0" },
      { endAddress: "1.0.0.255" },
    ]);
  });

  it("returns primitives unchanged", () => {
    expect(camelCaseKeys("hello")).toBe("hello");
    expect(camelCaseKeys(42)).toBe(42);
    expect(camelCaseKeys(null)).toBe(null);
    expect(camelCaseKeys(true)).toBe(true);
    expect(camelCaseKeys(undefined)).toBe(undefined);
  });

  it("handles empty objects and arrays", () => {
    expect(camelCaseKeys({})).toEqual({});
    expect(camelCaseKeys([])).toEqual([]);
  });

  it("handles mixed nested structures", () => {
    const input = {
      results: [{ domain: "test.com", status: "success", data: { start_autnum: 15169 } }],
    };
    expect(camelCaseKeys(input)).toEqual({
      results: [{ domain: "test.com", status: "success", data: { startAutnum: 15169 } }],
    });
  });
});
