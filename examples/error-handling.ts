/**
 * Error handling example.
 *
 * Usage: npx tsx examples/error-handling.ts
 */

import {
  RdapClient,
  AuthenticationError,
  GatewayTimeoutError,
  NotFoundError,
  NotSupportedError,
  RateLimitError,
  RequestFailedError,
  SubscriptionRequiredError,
  UpstreamError,
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
    // One class, three causes: only err.error separates a billing problem from
    // a temporary IP block, which no plan change fixes.
    if (err.error === "forbidden") {
      console.log("Temporarily blocked — wait it out, this is not a plan problem");
    } else {
      console.log(`Refused (${err.error}) — subscribe or upgrade your plan`);
    }
  } else if (err instanceof RequestFailedError) {
    console.log(`Invalid request body: ${JSON.stringify(err.errors)}`);
  } else if (err instanceof UpstreamError) {
    console.log(`Registry server failed — retry after ${String(err.retryAfter)} seconds`);
  } else if (err instanceof GatewayTimeoutError) {
    console.log("Timed out — safe to retry after a short delay");
  } else if (err instanceof RdapApiError) {
    console.log(`API error ${err.statusCode}: ${err.message}`);
  } else {
    throw err;
  }
}

client.close();
