/**
 * Bulk domain lookup example (Pro and Business plans).
 *
 * Usage: npx tsx examples/bulk-lookup.ts
 */

import { RdapClient } from "rdapapi";

const client = new RdapClient("your-api-key");

const result = await client.bulkDomains(["google.com", "github.com", "invalid..com"], {
  follow: true,
});

console.log(`Total: ${result.summary.total}`);
console.log(`OK: ${result.summary.successful}`);
console.log(`Failed: ${result.summary.failed}`);

for (const r of result.results) {
  if (r.status === "success" && r.data) {
    console.log(
      `  ${r.data.domain}: registrar=${r.data.registrar.name}, expires=${r.data.dates.expires}`,
    );
  } else {
    // A failed entry carries a partial meta naming the upstream that was tried,
    // unless it failed before one was chosen.
    console.log(`  ${r.domain}: ${r.error} — ${r.message} (via ${r.meta?.server ?? "n/a"})`);
  }
}

client.close();
