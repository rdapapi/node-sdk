# RDAP API Node.js SDK

[![npm version](https://img.shields.io/npm/v/rdapapi.svg)](https://www.npmjs.com/package/rdapapi)
[![Node.js](https://img.shields.io/node/v/rdapapi.svg)](https://www.npmjs.com/package/rdapapi)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Official Node.js SDK for the [RDAP API](https://rdapapi.io) — look up domains, IP addresses, ASNs, nameservers, and entities via the RDAP protocol.

## Installation

```bash
npm install rdapapi
```

## Quick start

```typescript
import { RdapClient } from "rdapapi";

const client = new RdapClient("your-api-key");

// Domain lookup
const domain = await client.domain("google.com");
console.log(domain.registrar.name); // "MarkMonitor Inc."
console.log(domain.dates.expires); // "2028-09-14T04:00:00Z"
console.log(domain.nameservers); // ["ns1.google.com", ...]

// IP address lookup
const ip = await client.ip("8.8.8.8");
console.log(ip.name); // "GOGL"
console.log(ip.cidr); // ["8.8.8.0/24"]

// ASN lookup
const asn = await client.asn(15169);
console.log(asn.name); // "GOOGLE"

// Nameserver lookup
const ns = await client.nameserver("ns1.google.com");
console.log(ns.ipAddresses.v4); // ["216.239.32.10"]

// Entity lookup
const entity = await client.entity("GOGL");
console.log(entity.name); // "Google LLC"
console.log(entity.autnums[0].handle); // "AS15169"

client.close();
```

## Bulk domain lookups

Look up multiple domains in a single request (Pro and Business plans). Up to 10 domains per call, with concurrent upstream fetches:

```typescript
const result = await client.bulkDomains(["google.com", "github.com", "invalid..com"], {
  follow: true,
});

console.log(result.summary); // { total: 3, successful: 2, failed: 1 }

for (const r of result.results) {
  if (r.status === "success" && r.data) {
    console.log(`${r.data.domain}: ${r.data.registrar.name}`);
  } else {
    console.log(`${r.domain}: ${r.error}`);
  }
}
```

Each domain counts as one request toward your monthly quota. Starter plans receive a `SubscriptionRequiredError` (403).

## Registrar follow-through

For thin registries like `.com` and `.net`, the registry only returns basic registrar info. Use `follow: true` to follow the registrar's RDAP link and get richer contact data:

```typescript
const domain = await client.domain("google.com", { follow: true });
console.log(domain.entities.registrant?.organization); // "Google LLC"
console.log(domain.entities.registrant?.email); // "registrant@google.com"
```

## Error handling

```typescript
import {
  RdapClient,
  NotFoundError,
  NotSupportedError,
  RateLimitError,
  AuthenticationError,
} from "rdapapi";

const client = new RdapClient("your-api-key");

try {
  const domain = await client.domain("example.nope");
} catch (err) {
  // Check NotSupportedError before NotFoundError: it's a subclass.
  if (err instanceof NotSupportedError) {
    console.log("The TLD is not covered by RDAP");
  } else if (err instanceof NotFoundError) {
    console.log("The domain is not registered");
  } else if (err instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${err.retryAfter}s`);
  } else if (err instanceof AuthenticationError) {
    console.log("Invalid API key");
  }
}
```

`NotSupportedError` extends `NotFoundError`, so catching `NotFoundError` still handles both cases. All exceptions inherit from `RdapApiError` and include `statusCode`, `error`, and `message` properties.

| Exception                     | HTTP Status | When                                                        |
| ----------------------------- | ----------- | ----------------------------------------------------------- |
| `ValidationError`             | 400         | Invalid input format                                        |
| `AuthenticationError`         | 401         | Missing or invalid API key                                  |
| `SubscriptionRequiredError`   | 403         | No active subscription                                      |
| `NotFoundError`               | 404         | Namespace is covered but no record exists                   |
| `NotSupportedError`           | 404         | Namespace (TLD, IP range, ASN range) is not covered by RDAP |
| `RateLimitError`              | 429         | Rate limit or quota exceeded                                |
| `UpstreamError`               | 502         | Upstream RDAP server error                                  |
| `TemporarilyUnavailableError` | 503         | Domain data temporarily unavailable                         |

## Supported TLDs catalog

List every TLD the API can resolve, with the date support was added and a qualitative summary of which fields the registry's RDAP server populates. Does not count against your monthly quota.

```typescript
const tlds = await client.tlds();
if (tlds !== null) {
  console.log(`${tlds.meta.count} TLDs, coverage ${(tlds.meta.coverage * 100).toFixed(0)}%`);

  for (const tld of tlds.data) {
    const availability = tld.fieldAvailability;
    if (availability !== null) {
      console.log(`${tld.tld}: expires_at=${availability.expiresAt}`);
    }
  }
}
```

Filter to recent additions or to a single registry:

```typescript
const recent = await client.tlds({ since: "2026-04-01T00:00:00Z" });
const verisign = await client.tlds({ server: "rdap.verisign.com" });
```

Pass back the previous `etag` to skip the transfer when nothing has changed:

```typescript
const first = await client.tlds();
const later = await client.tlds({ ifNoneMatch: first?.etag ?? undefined });
if (later === null) {
  console.log("No change since last poll");
}
```

Look up a single TLD:

```typescript
const com = await client.tld("com");
console.log(com?.data.rdapServerHost); // "rdap.verisign.com"
```

## Configuration

```typescript
const client = new RdapClient("your-api-key", {
  baseUrl: "https://rdapapi.io/api/v1", // default
  timeout: 30_000, // milliseconds, default
});
```

## TypeScript

The SDK is written in TypeScript with full type definitions. All response types are exported:

```typescript
import type { DomainResponse, IpResponse, AsnResponse } from "rdapapi";
```

## Requirements

- Node.js 20 or later
- An API key from [rdapapi.io](https://rdapapi.io/register)

## Links

- [API Documentation](https://rdapapi.io/docs)
- [Get an API Key](https://rdapapi.io/register)
- [OpenAPI Spec](https://rdapapi.io/openapi.yaml)
- [Pricing](https://rdapapi.io/pricing)

## Development

Set up pre-commit hooks (runs lint + tests before each commit):

```bash
git config core.hooksPath .githooks
```

## License

MIT
