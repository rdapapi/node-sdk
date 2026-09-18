import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RdapClient } from "../src/client.js";
import {
  AuthenticationError,
  GatewayTimeoutError,
  NotFoundError,
  NotSupportedError,
  RateLimitError,
  RequestFailedError,
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
  TLDS_RESPONSE,
  TLD_RESPONSE,
  WHOIS_DOMAIN_RESPONSE,
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
  vi.useRealTimers();
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
    expect(result.meta.server).toBe("rdap.verisign.com");
    expect(result.meta.source).toBe("rdap");
  });

  it("camelCases the redaction field names", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(DOMAIN_RESPONSE);

    const result = await client.domain("google.com");

    expect(result.redacted?.registrar?.ianaId).toBe("replacementValue");
    expect(result.redacted?.entities?.registrant?.name).toBe("emptyValue");
    expect(result.redacted?.entities?.registrant?.email).toBe("removal");
  });

  it("reads a WHOIS answer with no rdap_server, raw_rdap_url or dnssec", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(WHOIS_DOMAIN_RESPONSE);

    const result = await client.domain("google.it");

    expect(result.meta.source).toBe("whois");
    expect(result.meta.server).toBe("whois.nic.it");
    expect(result.meta.rdapServer).toBeUndefined();
    expect(result.meta.rawRdapUrl).toBeUndefined();
    expect(result.dnssec).toBeNull();
    expect(result.redacted).toBeUndefined();
  });

  it("sends whois=false when the WHOIS fallback is refused", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(DOMAIN_RESPONSE);

    await client.domain("google.it", { whois: false });

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("whois=false");
  });

  it("does not send whois param when true", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(DOMAIN_RESPONSE);

    await client.domain("google.com", { whois: true });

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(calledUrl).not.toContain("whois");
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
    expect(result.geofeed).toBe("https://geofeed.example.net/geofeed.csv");
    expect(result.remarks[0]?.description).toBe("Google DNS");
  });

  it("appends the prefix as a path segment", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(IP_RESPONSE);

    await client.ip("8.8.8.0", { prefix: 24 });

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("/ip/8.8.8.0/24");
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
    expect(result.country).toBe("US");
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

    expect(result.summary.total).toBe(3);
    expect(result.summary.successful).toBe(1);
    expect(result.summary.failed).toBe(2);
    expect(result.results[0]?.status).toBe("success");
    expect(result.results[0]?.data?.domain).toBe("google.com");
    expect(result.results[0]?.data?.meta.rdapServer).toBe("https://rdap.verisign.com/com/v1/");
    expect(result.results[0]?.data?.meta.source).toBe("rdap");
    expect(result.results[2]?.status).toBe("error");
    expect(result.results[2]?.error).toBe("invalid_domain");
  });

  it("keeps the partial meta of a failed entry", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(BULK_RESPONSE);

    const result = await client.bulkDomains(["google.com", "nope.example", "invalid..com"]);

    expect(result.results[1]?.meta?.server).toBe("rdap.verisign.com");
    expect(result.results[1]?.meta?.source).toBe("rdap");
    // Nothing upstream was chosen for a malformed domain.
    expect(result.results[2]?.meta).toBeUndefined();
  });

  it("sends whois=false for every domain in the request", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    const fetchMock = mockFetch(BULK_RESPONSE);
    globalThis.fetch = fetchMock;

    await client.bulkDomains(["google.it"], { whois: false });

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/domains/bulk`,
      expect.objectContaining({
        body: JSON.stringify({ domains: ["google.it"], whois: false }),
      }),
    );
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

    try {
      await client.domain("nope.example");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
      expect(err).not.toBeInstanceOf(NotSupportedError);
    }
  });

  it("throws NotSupportedError when 404 error code is not_supported", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(
      { error: "not_supported", message: "The TLD '.nope' is not supported." },
      404,
    );

    try {
      await client.domain("example.nope");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(NotSupportedError);
      // Backwards compatible: NotSupportedError IS a NotFoundError.
      expect(err).toBeInstanceOf(NotFoundError);
      expect((err as NotSupportedError).error).toBe("not_supported");
    }
  });

  it("routes not_supported errors for IP lookups too", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(
      { error: "not_supported", message: "No RIR covers this IP range." },
      404,
    );

    await expect(client.ip("203.0.113.1")).rejects.toThrow(NotSupportedError);
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

  it("throws UpstreamError on 502 with retryAfter", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(
      { error: "lookup_failed", message: "RDAP lookup failed.", retry_after: 60 },
      502,
    );

    try {
      await client.domain("test.com");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamError);
      expect((err as UpstreamError).retryAfter).toBe(60);
    }
  });

  it("falls back to the body retry_after when the header is missing", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(
      { error: "rate_limit_exceeded", message: "Rate limit exceeded.", retry_after: 12 },
      429,
    );

    try {
      await client.domain("test.com");
      expect.fail("Should have thrown");
    } catch (err) {
      expect((err as RateLimitError).retryAfter).toBe(12);
    }
  });

  it("reads the HTTP-date form of Retry-After as seconds from now", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-18T12:00:00Z"));
    globalThis.fetch = mockFetch(
      { error: "temporarily_unavailable", message: "Temporarily unavailable." },
      503,
      { "Retry-After": "Fri, 18 Sep 2026 12:02:00 GMT" },
    );

    try {
      await client.domain("test.com");
      expect.fail("Should have thrown");
    } catch (err) {
      expect((err as TemporarilyUnavailableError).retryAfter).toBe(120);
    }
  });

  it("clamps an HTTP-date Retry-After that has already passed to zero", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-18T12:00:00Z"));
    globalThis.fetch = mockFetch(
      { error: "rate_limit_exceeded", message: "Rate limit exceeded." },
      429,
      { "Retry-After": "Fri, 18 Sep 2026 11:59:00 GMT" },
    );

    try {
      await client.domain("test.com");
      expect.fail("Should have thrown");
    } catch (err) {
      expect((err as RateLimitError).retryAfter).toBe(0);
    }
  });

  it("falls back to the body retry_after when the header parses as neither form", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(
      { error: "lookup_failed", message: "RDAP lookup failed.", retry_after: 45 },
      502,
      { "Retry-After": "soon" },
    );

    try {
      await client.domain("test.com");
      expect.fail("Should have thrown");
    } catch (err) {
      expect((err as UpstreamError).retryAfter).toBe(45);
    }
  });

  it("returns null rather than NaN when neither the header nor the body parses", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(
      { error: "rate_limit_exceeded", message: "Rate limit exceeded.", retry_after: "12" },
      429,
      { "Retry-After": "not-a-date" },
    );

    try {
      await client.domain("test.com");
      expect.fail("Should have thrown");
    } catch (err) {
      expect((err as RateLimitError).retryAfter).toBeNull();
      expect((err as RateLimitError).retryAfter ?? 30).toBe(30);
    }
  });

  it("prefers the Retry-After header over the body retry_after", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(
      { error: "rate_limit_exceeded", message: "Rate limit exceeded.", retry_after: 12 },
      429,
      { "Retry-After": " 30 " },
    );

    try {
      await client.domain("test.com");
      expect.fail("Should have thrown");
    } catch (err) {
      expect((err as RateLimitError).retryAfter).toBe(30);
    }
  });

  it("throws RequestFailedError on 422 with the per-field errors", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(
      {
        error: "request_failed",
        message: "The domains field must not have more than 10 items.",
        errors: { domains: ["The domains field must not have more than 10 items."] },
      },
      422,
    );

    try {
      await client.bulkDomains(Array.from({ length: 11 }, (_, i) => `d${String(i)}.com`));
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RequestFailedError);
      expect((err as RequestFailedError).statusCode).toBe(422);
      expect((err as RequestFailedError).errors.domains).toHaveLength(1);
    }
  });

  it("defaults RequestFailedError.errors when the body omits them", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch({ error: "request_failed", message: "Invalid." }, 422);

    try {
      await client.bulkDomains([]);
      expect.fail("Should have thrown");
    } catch (err) {
      expect((err as RequestFailedError).errors).toEqual({});
    }
  });

  it("throws GatewayTimeoutError on 504", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(
      { error: "gateway_timeout", message: "The request did not complete in time." },
      504,
    );

    await expect(client.domain("test.com")).rejects.toThrow(GatewayTimeoutError);
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

// === TLDs ===

describe("tlds()", () => {
  it("returns a camelCase TldListResponse with etag", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(TLDS_RESPONSE, 200, { ETag: '"abc"' });

    const result = await client.tlds();

    expect(result).not.toBeNull();
    expect(result?.meta.count).toBe(2);
    expect(result?.meta.coverage).toBe(0.5);
    expect(result?.meta.thresholds.always).toBe(0.99);
    expect(result?.data[0]?.tld).toBe("com");
    expect(result?.data[0]?.protocol).toBe("rdap");
    expect(result?.data[0]?.server).toBe("rdap.verisign.com");
    expect(result?.data[0]?.rdapServerHost).toBe("rdap.verisign.com");
    expect(result?.data[0]?.fieldAvailability?.registeredAt).toBe("always");
    expect(result?.data[1]?.protocol).toBe("whois");
    expect(result?.data[1]?.server).toBe("whois.nic.it");
    expect(result?.data[1]?.rdapServerHost).toBeNull();
    expect(result?.data[1]?.rdapServerUrl).toBeNull();
    expect(result?.data[1]?.fieldAvailability).toBeNull();
    expect(result?.etag).toBe('"abc"');
  });

  it("forwards since and server query parameters", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(TLDS_RESPONSE);

    await client.tlds({ since: "2026-04-01T00:00:00Z", server: "rdap.verisign.com" });

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(url).toContain("since=2026-04-01T00%3A00%3A00Z");
    expect(url).toContain("server=rdap.verisign.com");
  });

  it("omits params entirely when none provided", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(TLDS_RESPONSE);

    await client.tlds();

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(url).not.toContain("?");
  });

  it("returns null on 304 Not Modified", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 304,
      headers: new Headers(),
      json: () => Promise.resolve(null),
    });

    const result = await client.tlds({ ifNoneMatch: '"abc"' });

    expect(result).toBeNull();
  });

  it("sends If-None-Match header when ifNoneMatch is provided", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    const fetchMock = mockFetch(TLDS_RESPONSE);
    globalThis.fetch = fetchMock;

    await client.tlds({ ifNoneMatch: '"etag-value"' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "If-None-Match": '"etag-value"',
        }),
      }),
    );
  });

  it("returns null etag when server omits the header", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(TLDS_RESPONSE);

    const result = await client.tlds();

    expect(result?.etag).toBeNull();
  });
});

describe("tld()", () => {
  it("returns a camelCase TldResponse with etag", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(TLD_RESPONSE, 200, { ETag: '"com-1"' });

    const result = await client.tld("com");

    expect(result).not.toBeNull();
    expect(result?.data.tld).toBe("com");
    expect(result?.meta.thresholds.usually).toBe(0.8);
    expect(result?.etag).toBe('"com-1"');
  });

  it("returns null on 304 Not Modified", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 304,
      headers: new Headers(),
      json: () => Promise.resolve(null),
    });

    expect(await client.tld("com", { ifNoneMatch: '"com-1"' })).toBeNull();
  });

  it("throws NotFoundError when the TLD is unknown", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch(
      { error: "not_found", message: "No RDAP server is registered for the TLD 'nope'." },
      404,
    );

    await expect(client.tld("nope")).rejects.toThrow(NotFoundError);
  });
});

// === ping() ===

describe("ping()", () => {
  it("returns the health status", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch({ status: "ok" });

    const result = await client.ping();

    expect(result.status).toBe("ok");
    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(calledUrl).toBe(`${BASE_URL}/ping`);
  });

  it("is authenticated like every other call", async () => {
    const client = new RdapClient("test-key", { baseUrl: BASE_URL });
    globalThis.fetch = mockFetch({ status: "ok" });

    await client.ping();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }) as unknown,
      }),
    );
  });
});

// === close() ===

describe("close()", () => {
  it("is a no-op that does not throw", () => {
    const client = new RdapClient("test-key");
    expect(() => client.close()).not.toThrow();
  });
});
