import {
  RdapApiError,
  ValidationError,
  AuthenticationError,
  SubscriptionRequiredError,
  GatewayTimeoutError,
  NotFoundError,
  NotSupportedError,
  RateLimitError,
  RequestFailedError,
  TemporarilyUnavailableError,
  UpstreamError,
} from "./errors.js";
import type {
  AsnResponse,
  BulkDomainResponse,
  DomainResponse,
  EntityResponse,
  IpResponse,
  NameserverResponse,
  PingResponse,
  RdapClientOptions,
  TldListResponse,
  TldOptions,
  TldResponse,
  TldsOptions,
} from "./types.js";
import { camelCaseKeys } from "./utils.js";
import { VERSION } from "./version.js";

const DEFAULT_BASE_URL = "https://rdapapi.io/api/v1";
const DEFAULT_TIMEOUT = 30_000;

const ERROR_MAP: Record<number, new (message: string, error: string) => RdapApiError> = {
  400: ValidationError,
  401: AuthenticationError,
  403: SubscriptionRequiredError,
  404: NotFoundError,
  504: GatewayTimeoutError,
};

/**
 * Seconds to wait, from a `Retry-After` header in either RFC 9110 form.
 *
 * The API passes an upstream registry's header through verbatim, so the
 * HTTP-date form really arrives. Returns `null` — never `NaN` — for anything
 * else, so the caller can fall back and `retryAfter ?? 30` still guards.
 */
function parseRetryAfter(header: string | null): number | null {
  if (header === null) {
    return null;
  }

  const value = header.trim();
  if (/^\d+$/.test(value)) {
    return parseInt(value, 10);
  }

  const at = Date.parse(value);
  if (Number.isNaN(at)) {
    return null;
  }
  return Math.max(0, Math.round((at - Date.now()) / 1000));
}

/** Seconds to wait before retrying, from the `Retry-After` header or the body. */
function retryAfterFrom(response: Response, body: Record<string, unknown>): number | null {
  const header = parseRetryAfter(response.headers.get("Retry-After"));
  if (header !== null) {
    return header;
  }
  return typeof body.retry_after === "number" ? body.retry_after : null;
}

export class RdapClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;

  constructor(apiKey: string, options?: RdapClientOptions) {
    if (!apiKey) {
      throw new Error("apiKey must be a non-empty string");
    }

    this.baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
    this.timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": `rdapapi-node/${VERSION}`,
      Accept: "application/json",
    };
  }

  private async request(path: string, params?: Record<string, string>): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this.headers,
      signal: AbortSignal.timeout(this.timeout),
    });

    return this.handleResponse(response);
  }

  private async post(path: string, body: Record<string, unknown>): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    });

    return this.handleResponse(response);
  }

  private async handleResponse(response: Response): Promise<unknown> {
    if (response.ok) {
      const data: unknown = await response.json();
      return camelCaseKeys(data);
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      // ignore parse errors
    }

    const error = (body.error as string | undefined) ?? "unknown_error";
    const message = (body.message as string | undefined) ?? `HTTP ${String(response.status)}`;
    const retryAfter = retryAfterFrom(response, body);

    if (response.status === 429) {
      throw new RateLimitError(message, error, retryAfter);
    }

    if (response.status === 503) {
      throw new TemporarilyUnavailableError(message, error, retryAfter);
    }

    if (response.status === 502) {
      throw new UpstreamError(message, error, retryAfter);
    }

    if (response.status === 422) {
      throw new RequestFailedError(
        message,
        error,
        (body.errors as Record<string, string[]> | undefined) ?? {},
      );
    }

    if (response.status === 404 && error === "not_supported") {
      throw new NotSupportedError(message, error);
    }

    const ErrorClass = ERROR_MAP[response.status];
    if (ErrorClass) {
      throw new ErrorClass(message, error);
    }

    throw new RdapApiError(message, response.status, error);
  }

  /**
   * Look up registration data for a domain name.
   *
   * `follow` merges in the contacts held by the registrar — most `.com` and
   * `.net` lookups want it. `whois: false` refuses the WHOIS fallback, so a TLD
   * with no RDAP server throws {@link NotSupportedError} instead of answering.
   */
  async domain(
    name: string,
    options?: { follow?: boolean; whois?: boolean },
  ): Promise<DomainResponse> {
    const params: Record<string, string> = {};
    if (options?.follow) {
      params.follow = "true";
    }
    if (options?.whois === false) {
      params.whois = "false";
    }
    return (await this.request(
      `/domain/${name}`,
      Object.keys(params).length > 0 ? params : undefined,
    )) as DomainResponse;
  }

  /**
   * Look up RDAP registration data for an IP address or CIDR block.
   *
   * A plain address returns the most specific allocation covering it; a prefix
   * returns that network, so different prefix lengths can return different
   * allocations. The prefix can be given either as `options.prefix` or inline
   * (`"8.8.8.0/24"`).
   */
  async ip(address: string, options?: { prefix?: number }): Promise<IpResponse> {
    const path =
      options?.prefix === undefined ? `/ip/${address}` : `/ip/${address}/${String(options.prefix)}`;
    return (await this.request(path)) as IpResponse;
  }

  /** Look up RDAP registration data for an ASN. Accepts a number (15169) or string ("AS15169"). */
  async asn(number: number | string): Promise<AsnResponse> {
    const value = String(number).toUpperCase().replace(/^AS/, "");
    return (await this.request(`/asn/${value}`)) as AsnResponse;
  }

  /** Look up RDAP registration data for a nameserver. */
  async nameserver(host: string): Promise<NameserverResponse> {
    return (await this.request(`/nameserver/${host}`)) as NameserverResponse;
  }

  /** Look up RDAP registration data for an entity by handle. */
  async entity(handle: string): Promise<EntityResponse> {
    return (await this.request(`/entity/${handle}`)) as EntityResponse;
  }

  private async conditionalGet<T>(
    path: string,
    params: Record<string, string> | undefined,
    ifNoneMatch: string | undefined,
  ): Promise<(T & { etag: string | null }) | null> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = { ...this.headers };
    if (ifNoneMatch) {
      headers["If-None-Match"] = ifNoneMatch;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(this.timeout),
    });

    if (response.status === 304) {
      return null;
    }

    const data = (await this.handleResponse(response)) as T;
    return { ...data, etag: response.headers.get("ETag") };
  }

  /**
   * List every TLD the API can resolve, and which protocol answers for each.
   *
   * Does not count against the monthly quota. Returns `null` when
   * `ifNoneMatch` is provided and matches the server's current `ETag` (HTTP
   * 304). Otherwise returns a response whose `etag` field can be passed back
   * on a later call to skip unchanged transfers.
   */
  async tlds(options?: TldsOptions): Promise<TldListResponse | null> {
    const params: Record<string, string> = {};
    if (options?.since !== undefined) {
      params.since = options.since;
    }
    if (options?.server !== undefined) {
      params.server = options.server;
    }
    return this.conditionalGet<Omit<TldListResponse, "etag">>(
      "/tlds",
      Object.keys(params).length > 0 ? params : undefined,
      options?.ifNoneMatch,
    );
  }

  /**
   * Return catalog metadata for a single TLD.
   *
   * Does not count against the monthly quota. Returns `null` on HTTP 304.
   * Throws {@link NotFoundError} when the TLD is not in the catalog.
   */
  async tld(tld: string, options?: TldOptions): Promise<TldResponse | null> {
    return this.conditionalGet<Omit<TldResponse, "etag">>(
      `/tlds/${tld}`,
      undefined,
      options?.ifNoneMatch,
    );
  }

  /**
   * Look up as many as 10 domains in a single request. Requires a Pro or
   * Business plan.
   *
   * `follow` and `whois` apply to every domain in the request. A failing domain
   * does not fail the call: check each result's `status`.
   */
  async bulkDomains(
    domains: string[],
    options?: { follow?: boolean; whois?: boolean },
  ): Promise<BulkDomainResponse> {
    const body: Record<string, unknown> = { domains };
    if (options?.follow) {
      body.follow = true;
    }
    if (options?.whois === false) {
      body.whois = false;
    }

    const raw = (await this.post("/domains/bulk", body)) as BulkDomainResponse;

    // Move the result-level meta into data for each successful result, so each
    // BulkDomainResult.data is a complete DomainResponse. A failed entry keeps
    // its partial meta where it is.
    for (const result of raw.results) {
      if (result.status === "success" && result.data && result.meta) {
        result.data.meta = result.meta;
        delete result.meta;
      }
    }

    return raw;
  }

  /**
   * Check that the API is reachable.
   *
   * Sent with your API key like every other call, but makes no upstream call
   * and never counts against your quota. Resolves to `{ status: "ok" }`.
   */
  async ping(): Promise<PingResponse> {
    return (await this.request("/ping")) as PingResponse;
  }

  /** Close the client. No-op for native fetch, exists for API parity. */
  close(): void {
    // native fetch has no persistent connection to close
  }
}
