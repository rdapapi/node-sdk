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
console.log(`DNSSEC: ${domain.dnssec}`);

// With follow-through for richer contact data
const followed = await client.domain("google.com", { follow: true });
if (followed.entities.registrant) {
  console.log(`Registrant: ${followed.entities.registrant.organization}`);
}

client.close();
