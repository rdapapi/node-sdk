import {
  RdapApiError,
  ValidationError,
  AuthenticationError,
  SubscriptionRequiredError,
  NotFoundError,
  RateLimitError,
  TemporarilyUnavailableError,
  UpstreamError,
} from "./errors.js";
import type {
  AsnResponse,
  BulkDomainResponse,
  BulkDomainResult,
  DomainResponse,
  EntityResponse,
  IpResponse,
  NameserverResponse,
  RdapClientOptions,
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
  502: UpstreamError,
};

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

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw new RateLimitError(message, error, retryAfter ? parseInt(retryAfter, 10) : null);
    }

    if (response.status === 503) {
      const retryAfter = response.headers.get("Retry-After");
      throw new TemporarilyUnavailableError(
        message,
        error,
        retryAfter ? parseInt(retryAfter, 10) : null,
      );
    }

    const ErrorClass = ERROR_MAP[response.status];
    if (ErrorClass) {
      throw new ErrorClass(message, error);
    }

    throw new RdapApiError(message, response.status, error);
  }

  /** Look up RDAP registration data for a domain name. */
  async domain(name: string, options?: { follow?: boolean }): Promise<DomainResponse> {
    const params = options?.follow ? { follow: "true" } : undefined;
    return (await this.request(`/domain/${name}`, params)) as DomainResponse;
  }

  /** Look up RDAP registration data for an IP address. */
  async ip(address: string): Promise<IpResponse> {
    return (await this.request(`/ip/${address}`)) as IpResponse;
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

  /** Look up multiple domains in a single request. Requires a Pro or Business plan. */
  async bulkDomains(
    domains: string[],
    options?: { follow?: boolean },
  ): Promise<BulkDomainResponse> {
    const body: Record<string, unknown> = { domains };
    if (options?.follow) {
      body.follow = true;
    }

    const raw = (await this.post("/domains/bulk", body)) as BulkDomainResponse;

    // Merge meta from result level into data for each successful result,
    // so each BulkDomainResult.data is a complete DomainResponse with meta.
    for (const result of raw.results) {
      if (result.status === "success" && result.data && "meta" in result) {
        const { meta, ...rest } = result as BulkDomainResult & { meta: unknown };
        result.data.meta = meta as DomainResponse["meta"];
        Object.assign(result, rest);
        delete (result as Record<string, unknown>).meta;
      }
    }

    return raw;
  }

  /** Close the client. No-op for native fetch, exists for API parity. */
  close(): void {
    // native fetch has no persistent connection to close
  }
}
