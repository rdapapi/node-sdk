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

/** Raised when no active subscription exists (HTTP 403). */
export class SubscriptionRequiredError extends RdapApiError {
  constructor(message: string, error: string) {
    super(message, 403, error);
    this.name = "SubscriptionRequiredError";
  }
}

/** Raised when no RDAP data is found for the query (HTTP 404). */
export class NotFoundError extends RdapApiError {
  constructor(message: string, error: string) {
    super(message, 404, error);
    this.name = "NotFoundError";
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

/** Raised when the upstream RDAP server fails (HTTP 502). */
export class UpstreamError extends RdapApiError {
  constructor(message: string, error: string) {
    super(message, 502, error);
    this.name = "UpstreamError";
  }
}
