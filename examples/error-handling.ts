/**
 * Error handling example.
 *
 * Usage: npx tsx examples/error-handling.ts
 */

import {
  RdapClient,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  SubscriptionRequiredError,
  RdapApiError,
} from "rdapapi";

const client = new RdapClient("your-api-key");

try {
  await client.domain("nonexistent.example");
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log("Domain not found in RDAP");
  } else if (err instanceof AuthenticationError) {
    console.log("Invalid API key — check your credentials");
  } else if (err instanceof RateLimitError) {
    console.log(`Rate limited — retry after ${err.retryAfter} seconds`);
  } else if (err instanceof SubscriptionRequiredError) {
    console.log("Subscription required — upgrade your plan");
  } else if (err instanceof RdapApiError) {
    console.log(`API error ${err.statusCode}: ${err.message}`);
  } else {
    throw err;
  }
}

client.close();
