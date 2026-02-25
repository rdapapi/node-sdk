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
    console.log(`  ${r.domain}: ${r.error} — ${r.message}`);
  }
}

client.close();
