import { describe, it, expect } from "vitest";
import {
  RdapApiError,
  ValidationError,
  AuthenticationError,
  SubscriptionRequiredError,
  NotFoundError,
  NotSupportedError,
  RateLimitError,
  TemporarilyUnavailableError,
  UpstreamError,
} from "../src/errors.js";

describe("RdapApiError", () => {
  it("stores message, statusCode, and error", () => {
    const err = new RdapApiError("Something failed", 500, "server_error");
    expect(err.message).toBe("Something failed");
    expect(err.statusCode).toBe(500);
    expect(err.error).toBe("server_error");
    expect(err.name).toBe("RdapApiError");
  });

  it("is an instance of Error", () => {
    const err = new RdapApiError("test", 500, "test");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(RdapApiError);
  });
});

describe("ValidationError", () => {
  it("has status 400 and correct prototype chain", () => {
    const err = new ValidationError("Invalid input", "validation_error");
    expect(err.statusCode).toBe(400);
    expect(err.name).toBe("ValidationError");
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toBeInstanceOf(RdapApiError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("AuthenticationError", () => {
  it("has status 401 and correct prototype chain", () => {
    const err = new AuthenticationError("Invalid token", "unauthenticated");
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe("AuthenticationError");
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err).toBeInstanceOf(RdapApiError);
  });
});

describe("SubscriptionRequiredError", () => {
  it("has status 403 and correct prototype chain", () => {
    const err = new SubscriptionRequiredError("No subscription", "subscription_required");
    expect(err.statusCode).toBe(403);
    expect(err.name).toBe("SubscriptionRequiredError");
    expect(err).toBeInstanceOf(SubscriptionRequiredError);
    expect(err).toBeInstanceOf(RdapApiError);
  });
});

describe("NotFoundError", () => {
  it("has status 404 and correct prototype chain", () => {
    const err = new NotFoundError("Not found", "not_found");
    expect(err.statusCode).toBe(404);
    expect(err.name).toBe("NotFoundError");
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err).toBeInstanceOf(RdapApiError);
  });
});

describe("NotSupportedError", () => {
  it("has status 404 and extends NotFoundError", () => {
    const err = new NotSupportedError("TLD not supported", "not_supported");
    expect(err.statusCode).toBe(404);
    expect(err.error).toBe("not_supported");
    expect(err.name).toBe("NotSupportedError");
    expect(err).toBeInstanceOf(NotSupportedError);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err).toBeInstanceOf(RdapApiError);
  });
});

describe("RateLimitError", () => {
  it("has status 429, retryAfter, and correct prototype chain", () => {
    const err = new RateLimitError("Rate limit exceeded", "rate_limit_exceeded", 30);
    expect(err.statusCode).toBe(429);
    expect(err.retryAfter).toBe(30);
    expect(err.name).toBe("RateLimitError");
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err).toBeInstanceOf(RdapApiError);
  });

  it("handles null retryAfter", () => {
    const err = new RateLimitError("Rate limit exceeded", "rate_limit_exceeded", null);
    expect(err.retryAfter).toBeNull();
  });
});

describe("TemporarilyUnavailableError", () => {
  it("has status 503, retryAfter, and correct prototype chain", () => {
    const err = new TemporarilyUnavailableError(
      "Temporarily unavailable",
      "temporarily_unavailable",
      300,
    );
    expect(err.statusCode).toBe(503);
    expect(err.retryAfter).toBe(300);
    expect(err.name).toBe("TemporarilyUnavailableError");
    expect(err).toBeInstanceOf(TemporarilyUnavailableError);
    expect(err).toBeInstanceOf(RdapApiError);
  });

  it("handles null retryAfter", () => {
    const err = new TemporarilyUnavailableError(
      "Temporarily unavailable",
      "temporarily_unavailable",
      null,
    );
    expect(err.retryAfter).toBeNull();
  });
});

describe("UpstreamError", () => {
  it("has status 502 and correct prototype chain", () => {
    const err = new UpstreamError("Upstream failed", "upstream_error");
    expect(err.statusCode).toBe(502);
    expect(err.name).toBe("UpstreamError");
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err).toBeInstanceOf(RdapApiError);
  });
});
