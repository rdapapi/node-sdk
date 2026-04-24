/**
 * Error handling example.
 *
 * Usage: npx tsx examples/error-handling.ts
 */

import {
  RdapClient,
  AuthenticationError,
  NotFoundError,
  NotSupportedError,
  RateLimitError,
  SubscriptionRequiredError,
  RdapApiError,
} from "rdapapi";

const client = new RdapClient("your-api-key");

try {
  await client.domain("example.nope");
} catch (err) {
  // Check NotSupportedError before NotFoundError — it's a subclass.
  if (err instanceof NotSupportedError) {
    console.log("The TLD is not covered by RDAP");
  } else if (err instanceof NotFoundError) {
    console.log("The domain is not registered");
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
