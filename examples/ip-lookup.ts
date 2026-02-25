/**
 * IP address and ASN lookup example.
 *
 * Usage: npx tsx examples/ip-lookup.ts
 */

import { RdapClient } from "rdapapi";

const client = new RdapClient("your-api-key");

// IP address lookup
const ip = await client.ip("8.8.8.8");
console.log(`IP: ${ip.startAddress} - ${ip.endAddress}`);
console.log(`Name: ${ip.name}`);
console.log(`Country: ${ip.country}`);
console.log(`CIDR: ${ip.cidr.join(", ")}`);

// ASN lookup
const asn = await client.asn(15169);
console.log(`\nASN: ${asn.handle}`);
console.log(`Name: ${asn.name}`);
console.log(`Range: ${asn.startAutnum} - ${asn.endAutnum}`);

// Nameserver lookup
const ns = await client.nameserver("ns1.google.com");
console.log(`\nNameserver: ${ns.ldhName}`);
console.log(`IPv4: ${ns.ipAddresses.v4.join(", ")}`);
console.log(`IPv6: ${ns.ipAddresses.v6.join(", ")}`);

// Entity lookup
const entity = await client.entity("GOGL");
console.log(`\nEntity: ${entity.name}`);
console.log(`ASNs: ${entity.autnums.map((a) => a.handle).join(", ")}`);
console.log(`Networks: ${entity.networks.map((n) => n.cidr.join(", ")).join("; ")}`);

client.close();
