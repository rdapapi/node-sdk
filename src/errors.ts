/** Base error for all RDAP API errors. */
export class RdapApiError extends Error {
  readonly statusCode: number;
  readonly error: string;

  constructor(message: string, statusCode: number, error: string) {
    super(message);
    this.name = "RdapApiError";
    this.statusCode = statusCode;
    this.error = error;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Raised when the input is invalid (HTTP 400). */
export class ValidationError extends RdapApiError {
  constructor(message: string, error: string) {
    super(message, 400, error);
    this.name = "ValidationError";
  }
}

/** Raised when the API key is missing or invalid (HTTP 401). */
export class AuthenticationError extends RdapApiError {
  constructor(message: string, error: string) {
    super(message, 401, error);
    this.name = "AuthenticationError";
  }
}

/**
 * Raised when the request is refused for the account (HTTP 403).
 *
 * Covers `subscription_required`, `plan_upgrade_required` and `forbidden` (a
 * temporary IP block). Read {@link RdapApiError.error} to tell them apart.
 */
export class SubscriptionRequiredError extends RdapApiError {
  constructor(message: string, error: string) {
    super(message, 403, error);
    this.name = "SubscriptionRequiredError";
  }
}

/**
 * Raised when no RDAP data is found for the query (HTTP 404).
 *
 * The namespace is covered by an RDAP server but no matching record exists.
 * For queries where the namespace itself is not covered by RDAP, see
 * {@link NotSupportedError}, which is a subclass of this error.
 */
export class NotFoundError extends RdapApiError {
  constructor(message: string, error: string) {
    super(message, 404, error);
    this.name = "NotFoundError";
  }
}

/**
 * Raised when the query targets a namespace not covered by RDAP (HTTP 404).
 *
 * Also a {@link NotFoundError}, so a `catch (NotFoundError)` block handles both
 * cases. Catch this class first when you want to distinguish "no RDAP server
 * for this TLD/range" from "namespace covered but no matching record".
 */
export class NotSupportedError extends NotFoundError {
  constructor(message: string, error: string) {
    super(message, error);
    this.name = "NotSupportedError";
  }
}

/** Raised when rate limit or monthly quota is exceeded (HTTP 429). */
export class RateLimitError extends RdapApiError {
  readonly retryAfter: number | null;

  constructor(message: string, error: string, retryAfter: number | null) {
    super(message, 429, error);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/** Raised when the domain data is temporarily unavailable (HTTP 503). */
export class TemporarilyUnavailableError extends RdapApiError {
  readonly retryAfter: number | null;

  constructor(message: string, error: string, retryAfter: number | null) {
    super(message, 503, error);
    this.name = "TemporarilyUnavailableError";
    this.retryAfter = retryAfter;
  }
}

/** Raised when the upstream RDAP or WHOIS server fails (HTTP 502). */
export class UpstreamError extends RdapApiError {
  readonly retryAfter: number | null;

  constructor(message: string, error: string, retryAfter: number | null = null) {
    super(message, 502, error);
    this.name = "UpstreamError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Raised when the request body fails validation (HTTP 422).
 *
 * Only the bulk endpoint takes a body, so this is what an over-long or
 * malformed `domains` list returns. {@link RequestFailedError.errors} names the
 * offending fields.
 */
export class RequestFailedError extends RdapApiError {
  readonly errors: Record<string, string[]>;

  constructor(message: string, error: string, errors: Record<string, string[]> = {}) {
    super(message, 422, error);
    this.name = "RequestFailedError";
    this.errors = errors;
  }
}

/** Raised when the request did not complete in time (HTTP 504). Safe to retry. */
export class GatewayTimeoutError extends RdapApiError {
  constructor(message: string, error: string) {
    super(message, 504, error);
    this.name = "GatewayTimeoutError";
  }
}
