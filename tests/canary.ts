/**
 * Production canary: probes the live API through the SDK's public surface.
 *
 * The unit suite replays frozen fixtures, so it proves the SDK is
 * self-consistent but never that production still answers the shape the SDK
 * models. This imports the built package by name, the way a consumer does, so
 * a broken export map fails here too.
 *
 * Not a vitest test: it needs the network and a real key, and it is excluded
 * from the suite and its coverage gate.
 *
 * Usage: RDAPAPI_API_KEY=... npm run canary
 */

import { RdapApiError, RdapClient } from "rdapapi";

/** Minimal Node globals: the package deliberately ships no `@types/node`. */
declare const process: {
  env: Record<string, string | undefined>;
  exitCode: number;
};

const apiKey = process.env.RDAPAPI_API_KEY;
if (!apiKey) {
  throw new Error("RDAPAPI_API_KEY is not set");
}

const client = new RdapClient(apiKey);

const failures: string[] = [];

/** Record a failed contract assertion. The message must name expected and actual. */
function check(condition: boolean, message: string): void {
  if (!condition) {
    failures.push(message);
    console.error(`  FAIL ${message}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a call once on a transport error or a 5xx, since these probes reach
 * real registries. Only the call is wrapped: a field that is wrong is wrong on
 * the second try too, so an assertion never retries.
 */
async function call<T>(what: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof RdapApiError && error.statusCode < 500) {
      throw error;
    }
    console.error(`  ${what} failed (${String(error)}), retrying once in 5s`);
    await sleep(5_000);
    return fn();
  }
}

async function probePing(): Promise<void> {
  const ping = await call("ping", () => client.ping());

  check(ping.status === "ok", `ping: expected status "ok", got ${JSON.stringify(ping.status)}`);
}

async function probeRdapDomain(): Promise<void> {
  const domain = await call("domain google.com", () =>
    client.domain("google.com", { follow: true }),
  );
  const entities = Object.values(domain.entities).filter((contact) => contact != null);

  check(
    domain.meta.source === "rdap",
    `google.com: expected meta.source "rdap", got ${JSON.stringify(domain.meta.source)}`,
  );
  check(
    !!domain.meta.server,
    `google.com: expected a non-empty meta.server, got ${JSON.stringify(domain.meta.server)}`,
  );
  check(
    !!domain.registrar.name,
    `google.com: expected a non-empty registrar.name, got ${JSON.stringify(domain.registrar.name)}`,
  );
  check(
    entities.length > 0,
    `google.com: expected at least one entity, got ${String(entities.length)}`,
  );
}

async function probeWhoisDomain(): Promise<void> {
  const domain = await call("domain google.it", () => client.domain("google.it"));

  check(
    domain.meta.source === "whois",
    `google.it: expected meta.source "whois", got ${JSON.stringify(domain.meta.source)}`,
  );
  check(
    domain.meta.server === "whois.nic.it",
    `google.it: expected meta.server "whois.nic.it", got ${JSON.stringify(domain.meta.server)}`,
  );
  // `== null` on purpose: a WHOIS answer may omit these or send them null, and
  // reading either must not throw. This shape crashed the Python SDK in prod.
  check(
    domain.meta.rdapServer == null,
    `google.it: expected meta.rdapServer absent or null, got ${JSON.stringify(domain.meta.rdapServer)}`,
  );
  check(
    domain.meta.rawRdapUrl == null,
    `google.it: expected meta.rawRdapUrl absent or null, got ${JSON.stringify(domain.meta.rawRdapUrl)}`,
  );
}

async function probeIpGeofeed(): Promise<void> {
  const ip = await call("ip 45.83.220.1", () => client.ip("45.83.220.1"));

  // Depends on that network's operator continuing to publish an RFC 8805
  // geofeed. Check the record still carries one before suspecting the SDK.
  check(
    !!ip.geofeed,
    `45.83.220.1: expected a non-empty geofeed, got ${JSON.stringify(ip.geofeed)}`,
  );
}

async function probeWhoisTld(): Promise<void> {
  const tld = await call("tld it", () => client.tld("it"));
  if (tld === null) {
    check(false, "tld it: expected a response, got null");
    return;
  }

  check(
    tld.data.protocol === "whois",
    `tld it: expected protocol "whois", got ${JSON.stringify(tld.data.protocol)}`,
  );
  check(
    !!tld.data.server,
    `tld it: expected a non-empty server, got ${JSON.stringify(tld.data.server)}`,
  );
  check(
    tld.data.rdapServerHost == null,
    `tld it: expected rdapServerHost null, got ${JSON.stringify(tld.data.rdapServerHost)}`,
  );
  check(
    tld.data.rdapServerUrl == null,
    `tld it: expected rdapServerUrl null, got ${JSON.stringify(tld.data.rdapServerUrl)}`,
  );
}

const probes: [string, () => Promise<void>][] = [
  ["ping", probePing],
  ["domain google.com (follow)", probeRdapDomain],
  ["domain google.it (whois)", probeWhoisDomain],
  ["ip 45.83.220.1 (geofeed)", probeIpGeofeed],
  ["tld it (whois)", probeWhoisTld],
];

for (const [name, probe] of probes) {
  console.log(name);
  try {
    await probe();
  } catch (error) {
    failures.push(`${name}: ${String(error)}`);
    console.error(`  ERROR ${String(error)}`);
  }
}

client.close();

if (failures.length > 0) {
  console.error(`\n${String(failures.length)} canary failure(s):`);
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log("\nAll canary probes passed.");
}
