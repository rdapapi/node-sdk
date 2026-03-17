import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RdapClient } from "../src/client.js";
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  TemporarilyUnavailableError,
  RdapApiError,
  SubscriptionRequiredError,
  UpstreamError,
  ValidationError,
} from "../src/errors.js";
import { VERSION } from "../src/version.js";
import {
  ASN_RESPONSE,
  BASE_URL,
  BULK_RESPONSE,
  DOMAIN_RESPONSE,
  ENTITY_RESPONSE,
  IP_RESPONSE,
  NAMESERVER_RESPONSE,
} from "./fixtures.js";

function mockFetch(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
  });
}

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// === Constructor ===

describe("RdapClient constructor", () => {
  it("throws if apiKey is empty", () => {
    expect(() => new RdapClient("")).toThrow("apiKey must be a non-empty string");
  });

  it("uses default baseUrl and timeout", () => {
    const client = new RdapClient("test-key");
    globalThis.fetch = mockFetch(DOMAIN_RESPONSE);

    void client.domain("google.com");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://rdapapi.io/api/v1/domain/google.com"),
      expect.any(Object),
    );
  });

  it("accepts custom baseUrl and timeout", () => {
    const client = new RdapClient("test-key", {
      baseUrl: "https://custom.api.com/v2",
      timeout: 5000,
    });
    globalThis.fetch = mockFetch(DOMAIN_RESPONSE);

    void client.domain("test.com");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://custom.api.com/v2/domain/test.com"),
      expect.any(Object),
    );
  });

  it("sends correct headers", async () => {
    const client = new RdapClient("my-api-key");
    globalThis.fetch = mockFetch(DOMAIN_RESPONSE);

    await client.domain("google.com");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          Authorization: "Bearer my-api-key",
          "User-Agent": `rdapapi-node/${VERSION}`,
          Accept: "application/json",
        },
      }),
    );
  });
});

// === Domain Lookup ===

describe("domain()", () => {
  it("returns a camelCase DomainResponse", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(DOMAIN_RESPONSE);

    const result = await client.domain("google.com");

    expect(result.domain).toBe("google.com");
    expect(result.registrar.name).toBe("MarkMonitor Inc.");
    expect(result.registrar.ianaId).toBe("292");
    expect(result.meta.rdapServer).toBe("https://rdap.verisign.com/com/v1/");
    expect(result.meta.rawRdapUrl).toBe("https://rdap.verisign.com/com/v1/domain/google.com");
  });

  it("sends follow=true query param when requested", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(DOMAIN_RESPONSE);

    await client.domain("google.com", { follow: true });

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("follow=true");
  });

  it("does not send follow param by default", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(DOMAIN_RESPONSE);

    await client.domain("google.com");

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(calledUrl).not.toContain("follow");
  });
});

// === IP Lookup ===

describe("ip()", () => {
  it("returns a camelCase IpResponse", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(IP_RESPONSE);

    const result = await client.ip("8.8.8.8");

    expect(result.name).toBe("GOGL");
    expect(result.cidr).toEqual(["8.8.8.0/24"]);
    expect(result.startAddress).toBe("8.8.8.0");
    expect(result.ipVersion).toBe("v4");
    expect(result.remarks[0]?.description).toBe("Google DNS");
  });
});

// === ASN Lookup ===

describe("asn()", () => {
  it("returns a camelCase AsnResponse", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(ASN_RESPONSE);

    const result = await client.asn("AS15169");

    expect(result.handle).toBe("AS15169");
    expect(result.startAutnum).toBe(15169);
  });

  it("strips AS prefix from string input", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(ASN_RESPONSE);

    await client.asn("AS15169");

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("/asn/15169");
  });

  it("accepts numeric input", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(ASN_RESPONSE);

    await client.asn(15169);

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("/asn/15169");
  });
});

// === Nameserver Lookup ===

describe("nameserver()", () => {
  it("returns a camelCase NameserverResponse", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(NAMESERVER_RESPONSE);

    const result = await client.nameserver("ns1.google.com");

    expect(result.ldhName).toBe("ns1.google.com");
    expect(result.ipAddresses.v4).toEqual(["216.239.32.10"]);
    expect(result.ipAddresses.v6).toEqual(["2001:4860:4802:32::a"]);
  });
});

// === Entity Lookup ===

describe("entity()", () => {
  it("returns a camelCase EntityResponse", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(ENTITY_RESPONSE);

    const result = await client.entity("GOGL");

    expect(result.handle).toBe("GOGL");
    expect(result.name).toBe("Google LLC");
    expect(result.entities.abuse?.email).toBe("network-abuse@google.com");
    expect(result.autnums).toHaveLength(2);
    expect(result.autnums[0]?.handle).toBe("AS15169");
    expect(result.autnums[1]?.name).toBe("YOUTUBE");
    expect(result.networks[0]?.cidr).toEqual(["8.8.8.0/24"]);
    expect(result.publicIds[0]?.type).toBe("ARIN OrgID");
  });
});

// === Bulk Domain Lookup ===

describe("bulkDomains()", () => {
  it("returns bulk response with meta merged into data", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(BULK_RESPONSE);

    const result = await client.bulkDomains(["google.com", "invalid..com"]);

    expect(result.summary.total).toBe(2);
    expect(result.summary.successful).toBe(1);
    expect(result.summary.failed).toBe(1);
    expect(result.results[0]?.status).toBe("success");
    expect(result.results[0]?.data?.domain).toBe("google.com");
    expect(result.results[0]?.data?.meta.rdapServer).toBe("https://rdap.verisign.com/com/v1/");
    expect(result.results[1]?.status).toBe("error");
    expect(result.results[1]?.error).toBe("invalid_domain");
  });

  it("sends POST with domains and follow", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    const fetchMock = mockFetch(BULK_RESPONSE);
    globalThis.fetch = fetchMock;

    await client.bulkDomains(["google.com"], { follow: true });

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/domains/bulk`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ domains: ["google.com"], follow: true }),
      }),
    );
  });

  it("does not send follow key when false", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    const fetchMock = mockFetch(BULK_RESPONSE);
    globalThis.fetch = fetchMock;

    await client.bulkDomains(["google.com"]);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/domains/bulk`,
      expect.objectContaining({
        body: JSON.stringify({ domains: ["google.com"] }),
      }),
    );
  });
});

// === Error Handling ===

describe("error handling", () => {
  it("throws AuthenticationError on 401", async () => {
    const client = new RdapClient("bad-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch({ error: "unauthenticated", message: "Invalid token." }, 401);

    await expect(client.domain("test.com")).rejects.toThrow(AuthenticationError);
  });

  it("throws NotFoundError on 404", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch({ error: "not_found", message: "Not found." }, 404);

    await expect(client.domain("nope.example")).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError on 400", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch({ error: "validation_error", message: "Invalid domain." }, 400);

    await expect(client.domain("bad!domain")).rejects.toThrow(ValidationError);
  });

  it("throws SubscriptionRequiredError on 403", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(
      { error: "plan_upgrade_required", message: "Bulk lookups require a Pro or Business plan." },
      403,
    );

    await expect(client.bulkDomains(["google.com"])).rejects.toThrow(SubscriptionRequiredError);
  });

  it("throws RateLimitError on 429 with retryAfter", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(
      { error: "rate_limit_exceeded", message: "Rate limit exceeded." },
      429,
      { "Retry-After": "30" },
    );

    try {
      await client.domain("test.com");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfter).toBe(30);
    }
  });

  it("throws RateLimitError with null retryAfter when header missing", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(
      { error: "rate_limit_exceeded", message: "Rate limit exceeded." },
      429,
    );

    try {
      await client.domain("test.com");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfter).toBeNull();
    }
  });

  it("throws TemporarilyUnavailableError on 503 with retryAfter", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(
      {
        error: "temporarily_unavailable",
        message: "Data for this domain is temporarily unavailable.",
      },
      503,
      { "Retry-After": "300" },
    );

    try {
      await client.domain("test.com");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TemporarilyUnavailableError);
      expect((err as TemporarilyUnavailableError).retryAfter).toBe(300);
      expect((err as TemporarilyUnavailableError).statusCode).toBe(503);
    }
  });

  it("throws TemporarilyUnavailableError with null retryAfter when header missing", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(
      {
        error: "temporarily_unavailable",
        message: "Data for this domain is temporarily unavailable.",
      },
      503,
    );

    try {
      await client.domain("test.com");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TemporarilyUnavailableError);
      expect((err as TemporarilyUnavailableError).retryAfter).toBeNull();
    }
  });

  it("throws UpstreamError on 502", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(
      { error: "upstream_error", message: "Upstream RDAP server error." },
      502,
    );

    await expect(client.domain("test.com")).rejects.toThrow(UpstreamError);
  });

  it("throws RdapApiError for unknown status codes", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch({ error: "server_error", message: "Internal error." }, 500);

    try {
      await client.domain("test.com");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RdapApiError);
      expect((err as RdapApiError).statusCode).toBe(500);
    }
  });

  it("handles non-JSON error responses", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers(),
      json: () => Promise.reject(new Error("not JSON")),
    });

    try {
      await client.domain("test.com");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RdapApiError);
      expect((err as RdapApiError).message).toBe("HTTP 503");
      expect((err as RdapApiError).error).toBe("unknown_error");
    }
  });
});

// === close() ===

describe("close()", () => {
  it("is a no-op that does not throw", () => {
    const client = new RdapClient("test-key");
    expect(() => client.close()).not.toThrow();
  });
});
