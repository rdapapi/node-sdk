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
console.log(domain.meta.source); // "rdap"

// IP address lookup
const ip = await client.ip("8.8.8.8");
console.log(ip.name); // "GOGL"
console.log(ip.cidr); // ["8.8.8.0/24"]
console.log(ip.geofeed); // "https://geofeed.example.net/geofeed.csv" or null

// A CIDR block, inline or as an option
const net = await client.ip("8.8.8.0", { prefix: 24 });
console.log(net.handle); // "NET-8-8-8-0-2"

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

// Health check — no quota cost
console.log((await client.ping()).status); // "ok"

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

`follow` and `whois` apply to every domain in the request. A failing domain does not fail the call, so check each result's `status`; a failed entry carries a partial `meta` naming the upstream that was tried.

Each domain counts as one request toward your monthly quota. Starter plans receive a `SubscriptionRequiredError` (403), and a body that fails validation — more than 10 domains, say — a `RequestFailedError` (422) whose `errors` names the offending fields.

## Registrar follow-through

For thin registries like `.com` and `.net`, the registry only returns basic registrar info. Use `follow: true` to follow the registrar's RDAP link and get richer contact data:

```typescript
const domain = await client.domain("google.com", { follow: true });
console.log(domain.entities.registrant?.organization); // "Google LLC"
console.log(domain.entities.registrant?.email); // "registrant@google.com"
```

## WHOIS fallback

Some ccTLDs — `.it`, `.eu`, `.tr` among them — have no RDAP server. Those are read from the
registry's WHOIS server and come back in the same shape, with `meta.source` set to `"whois"`
rather than `"rdap"`. A WHOIS answer has no `meta.rdapServer` or `meta.rawRdapUrl`, and a
registry may publish fewer fields — anything it withholds is `null` rather than inferred.

```typescript
const domain = await client.domain("google.it");
console.log(domain.meta.source); // "whois"
console.log(domain.meta.server); // "whois.nic.it"
```

Pass `whois: false` to refuse the fallback; those TLDs then throw `NotSupportedError`:

```typescript
await client.domain("google.it", { whois: false }); // throws NotSupportedError
```

`tlds()` marks each one `protocol: "whois"` and is the current list. The option works on
`bulkDomains()` too, where it applies to every domain in the request.

## Redaction

Since GDPR most contact fields come back `null`, and a field the registry never collected looks
exactly like one it withheld. `redacted` reports what the upstream server _declared_ it withheld
(RFC 9537). Most declare nothing, so the field is usually absent — which is not evidence that
nothing was withheld.

It mirrors the record, so a claim about `entities.registrant.name` sits at
`redacted.entities.registrant.name`, with field names camelCased like the rest of the response:

```typescript
const domain = await client.domain("google.co.uk");
console.log(domain.redacted?.entities?.registrant?.email); // "replacementValue"
console.log(domain.redacted?.registrar?.ianaId); // "replacementValue"
```

`RedactionMethod` is `"removal" | "emptyValue" | "partialValue" | "replacementValue"`, widened to
`string` because an unrecognised method from a server is passed through unchanged. Watch for
`replacementValue`: the field holds a substitute that looks genuine. `redacted` is also returned on
IP, ASN, nameserver and entity lookups.

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

| Exception                     | HTTP Status | `error` codes                                                                                                                           |
| ----------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `ValidationError`             | 400         | `invalid_domain`, `invalid_ip`, `invalid_asn`, `invalid_nameserver`, `invalid_handle`, `invalid_prefix`, `invalid_since`, `bad_request` |
| `AuthenticationError`         | 401         | `unauthenticated`                                                                                                                       |
| `SubscriptionRequiredError`   | 403         | `subscription_required`, `plan_upgrade_required`, `forbidden`                                                                           |
| `NotFoundError`               | 404         | `not_found`                                                                                                                             |
| `NotSupportedError`           | 404         | `not_supported`                                                                                                                         |
| `RequestFailedError`          | 422         | `request_failed` — `errors` names the fields                                                                                            |
| `RateLimitError`              | 429         | `rate_limit_exceeded`, `quota_exceeded`, `too_many_requests`                                                                            |
| `UpstreamError`               | 502         | `lookup_failed`, `bad_gateway`                                                                                                          |
| `TemporarilyUnavailableError` | 503         | `temporarily_unavailable`, `service_unavailable`                                                                                        |
| `GatewayTimeoutError`         | 504         | `gateway_timeout`                                                                                                                       |
| `RdapApiError`                | 5xx         | `server_error`, and anything else unmapped                                                                                              |

Branch on `err.error`, not on `err.message` — messages are display text and may be reworded.
The three 403 codes share one class but are not one failure: `subscription_required` means there is
no active subscription, `plan_upgrade_required` means the plan does not cover the endpoint, and
`forbidden` is a temporary IP block that clears on its own — nothing to buy. Only `err.error`
tells them apart.

`RateLimitError`, `TemporarilyUnavailableError` and `UpstreamError` carry `retryAfter` in seconds
(`null` when the server gives no estimate), read from the `Retry-After` header — in either the
delta-seconds or the HTTP-date form, since a registry's header is passed through verbatim — and
otherwise from the response body.

## Supported TLDs catalog

List every TLD the API can resolve, which protocol answers for it, the date support was added, and a qualitative summary of which fields the registry populates. Does not count against your monthly quota.

```typescript
const tlds = await client.tlds();
if (tlds !== null) {
  console.log(`${tlds.meta.count} TLDs, coverage ${(tlds.meta.coverage * 100).toFixed(0)}%`);

  for (const tld of tlds.data) {
    console.log(`${tld.tld}: ${tld.protocol} via ${tld.server}`);

    // null while a TLD accrues observations, and always null for a WHOIS TLD.
    const availability = tld.fieldAvailability;
    if (availability !== null) {
      console.log(`  expires_at=${availability.expiresAt}`);
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
console.log(com?.data.server); // "rdap.verisign.com"
```

`server` supersedes `rdapServerHost`, which is deprecated and `null` for a WHOIS TLD.

## Health check

```typescript
const health = await client.ping();
console.log(health.status); // "ok"
```

Sent with your API key like every other call, but makes no upstream call and never counts against your quota.

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
