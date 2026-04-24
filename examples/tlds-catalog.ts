/**
 * List the TLDs the RDAP API supports and their field availability.
 *
 * Usage: npx tsx examples/tlds-catalog.ts
 */

import { RdapClient } from "rdapapi";

const client = new RdapClient("your-api-key");

// Full catalog. Does not count against your monthly quota.
const tlds = await client.tlds();
if (tlds !== null) {
  console.log(
    `${tlds.meta.count} TLDs supported, coverage ${(tlds.meta.coverage * 100).toFixed(0)}%`,
  );

  for (const tld of tlds.data.slice(0, 5)) {
    const availability = tld.fieldAvailability;
    if (availability === null) {
      console.log(`.${tld.tld} via ${tld.rdapServerHost} (not enough data yet)`);
    } else {
      console.log(
        `.${tld.tld} via ${tld.rdapServerHost}: ` +
          `registrar=${availability.registrar}, expires_at=${availability.expiresAt}`,
      );
    }
  }

  // Skip the transfer when nothing has changed.
  const later = await client.tlds({ ifNoneMatch: tlds.etag ?? undefined });
  console.log(later !== null ? "Changed" : "No change since last poll");
}

// Single-TLD lookup.
const com = await client.tld("com");
if (com !== null) {
  console.log(`.com supported since ${com.data.supportedSince}`);
}

client.close();
