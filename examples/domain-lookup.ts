/**
 * Basic domain lookup example.
 *
 * Usage: npx tsx examples/domain-lookup.ts
 */

import { RdapClient } from "rdapapi";

const client = new RdapClient("your-api-key");

const domain = await client.domain("google.com");
console.log(`Domain: ${domain.domain}`);
console.log(`Registrar: ${domain.registrar.name}`);
console.log(`Registered: ${domain.dates.registered}`);
console.log(`Expires: ${domain.dates.expires}`);
console.log(`Nameservers: ${domain.nameservers.join(", ")}`);
console.log(`DNSSEC: ${domain.dnssec}`); // null where the registry publishes no status
console.log(`Answered over ${domain.meta.source} by ${domain.meta.server}`);

// What the server declared it withheld, when it declares anything at all.
if (domain.redacted?.entities?.registrant) {
  console.log(`Registrant redactions: ${JSON.stringify(domain.redacted.entities.registrant)}`);
}

// With follow-through for richer contact data
const followed = await client.domain("google.com", { follow: true });
if (followed.entities.registrant) {
  console.log(`Registrant: ${followed.entities.registrant.organization}`);
}

// A TLD with no RDAP server is read over WHOIS unless you refuse the fallback.
const it = await client.domain("google.it");
console.log(`google.it via ${it.meta.source}`); // "whois"

client.close();
