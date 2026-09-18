/**
 * Shared snake_case API response fixtures matching the actual API output.
 * These are intentionally in snake_case to test the camelCase conversion.
 */

export const DOMAIN_RESPONSE = {
  domain: "google.com",
  unicode_name: null,
  handle: "2138514_DOMAIN_COM-VRSN",
  status: ["client delete prohibited"],
  registrar: {
    name: "MarkMonitor Inc.",
    iana_id: "292",
    abuse_email: null,
    abuse_phone: null,
    url: null,
  },
  dates: {
    registered: "1997-09-15T04:00:00Z",
    expires: "2028-09-14T04:00:00Z",
    updated: null,
  },
  nameservers: ["ns1.google.com"],
  dnssec: false,
  entities: {},
  redacted: {
    registrar: { iana_id: "replacementValue" },
    entities: { registrant: { name: "emptyValue", email: "removal" } },
  },
  meta: {
    server: "rdap.verisign.com",
    source: "rdap",
    rdap_server: "https://rdap.verisign.com/com/v1/",
    raw_rdap_url: "https://rdap.verisign.com/com/v1/domain/google.com",
    cached: false,
    cache_expires: "2026-02-24T15:30:00Z",
  },
};

/** A TLD with no RDAP server, answered over WHOIS: no rdap_server, no raw_rdap_url. */
export const WHOIS_DOMAIN_RESPONSE = {
  domain: "google.it",
  unicode_name: null,
  handle: null,
  status: ["active"],
  registrar: {
    name: "MarkMonitor International Limited",
    iana_id: null,
    abuse_email: null,
    abuse_phone: null,
    url: "https://www.markmonitor.com/",
  },
  dates: {
    registered: "1999-12-10T00:00:00Z",
    expires: "2027-04-21T00:00:00Z",
    updated: "2026-06-09T23:13:34Z",
  },
  nameservers: ["ns1.google.com", "ns2.google.com"],
  dnssec: null,
  entities: {},
  meta: {
    server: "whois.nic.it",
    source: "whois",
    cached: true,
    cache_expires: "2026-02-24T15:30:00Z",
  },
};

export const IP_RESPONSE = {
  handle: "NET-8-8-8-0-2",
  name: "GOGL",
  type: "DIRECT ALLOCATION",
  start_address: "8.8.8.0",
  end_address: "8.8.8.255",
  ip_version: "v4",
  parent_handle: "NET-8-0-0-0-0",
  country: "US",
  status: ["active"],
  dates: { registered: "2014-03-14T00:00:00Z", expires: null, updated: null },
  entities: {},
  cidr: ["8.8.8.0/24"],
  geofeed: "https://geofeed.example.net/geofeed.csv",
  remarks: [{ title: "description", description: "Google DNS" }],
  port43: "whois.arin.net",
  meta: {
    server: "rdap.arin.net",
    source: "rdap",
    rdap_server: "https://rdap.arin.net/registry/",
    raw_rdap_url: "https://rdap.arin.net/registry/ip/8.8.8.0",
    cached: false,
    cache_expires: "2026-02-24T15:30:00Z",
  },
};

export const ASN_RESPONSE = {
  handle: "AS15169",
  name: "GOOGLE",
  type: null,
  start_autnum: 15169,
  end_autnum: 15169,
  country: "US",
  status: ["active"],
  dates: { registered: "2000-03-30T00:00:00-05:00", expires: null, updated: null },
  entities: {},
  remarks: [],
  port43: "whois.arin.net",
  meta: {
    server: "rdap.arin.net",
    source: "rdap",
    rdap_server: "https://rdap.arin.net/registry/",
    raw_rdap_url: "https://rdap.arin.net/registry/autnum/15169",
    cached: false,
    cache_expires: "2026-02-24T15:30:00Z",
  },
};

export const NAMESERVER_RESPONSE = {
  ldh_name: "ns1.google.com",
  unicode_name: null,
  handle: null,
  ip_addresses: { v4: ["216.239.32.10"], v6: ["2001:4860:4802:32::a"] },
  status: [],
  dates: { registered: null, expires: null, updated: null },
  entities: {},
  meta: {
    server: "rdap.verisign.com",
    source: "rdap",
    rdap_server: "https://rdap.verisign.com/com/v1/",
    raw_rdap_url: "https://rdap.verisign.com/com/v1/nameserver/ns1.google.com",
    cached: false,
    cache_expires: "2026-02-24T15:30:00Z",
  },
};

export const ENTITY_RESPONSE = {
  handle: "GOGL",
  name: "Google LLC",
  organization: null,
  email: null,
  phone: null,
  address: "1600 Amphitheatre Parkway",
  contact_url: null,
  country_code: null,
  roles: [],
  status: [],
  dates: { registered: "2000-03-30T00:00:00Z", expires: null, updated: null },
  remarks: [],
  port43: "whois.arin.net",
  public_ids: [{ type: "ARIN OrgID", identifier: "GOGL" }],
  entities: {
    abuse: {
      handle: "ABUSE5250-ARIN",
      name: "Abuse",
      organization: null,
      email: "network-abuse@google.com",
      phone: "+16502530000",
      address: null,
      contact_url: null,
      country_code: null,
    },
  },
  autnums: [
    { handle: "AS15169", name: "GOOGLE", start_autnum: 15169, end_autnum: 15169 },
    { handle: "AS36040", name: "YOUTUBE", start_autnum: 36040, end_autnum: 36040 },
  ],
  networks: [
    {
      handle: "NET-8-8-8-0-2",
      name: "GOGL",
      start_address: "8.8.8.0",
      end_address: "8.8.8.255",
      ip_version: "v4",
      cidr: ["8.8.8.0/24"],
    },
  ],
  meta: {
    server: "rdap.arin.net",
    source: "rdap",
    rdap_server: "https://rdap.arin.net/registry/",
    raw_rdap_url: "https://rdap.arin.net/registry/entity/GOGL",
    cached: false,
    cache_expires: "2026-02-24T15:30:00Z",
  },
};

export const BULK_RESPONSE = {
  results: [
    {
      domain: "google.com",
      status: "success",
      data: {
        domain: "google.com",
        unicode_name: null,
        handle: "2138514_DOMAIN_COM-VRSN",
        status: ["client delete prohibited"],
        registrar: {
          name: "MarkMonitor Inc.",
          iana_id: "292",
          abuse_email: null,
          abuse_phone: null,
          url: null,
        },
        dates: {
          registered: "1997-09-15T04:00:00Z",
          expires: "2028-09-14T04:00:00Z",
          updated: null,
        },
        nameservers: ["ns1.google.com"],
        dnssec: false,
        entities: {},
      },
      meta: {
        server: "rdap.verisign.com",
        source: "rdap",
        rdap_server: "https://rdap.verisign.com/com/v1/",
        raw_rdap_url: "https://rdap.verisign.com/com/v1/domain/google.com",
        cached: false,
        cache_expires: "2026-02-25T15:30:00Z",
      },
    },
    {
      domain: "nope.example",
      status: "error",
      error: "not_found",
      message: "This domain was not found. It may not be registered.",
      meta: { server: "rdap.verisign.com", source: "rdap" },
    },
    {
      domain: "invalid..com",
      status: "error",
      error: "invalid_domain",
      message: "The provided domain name is not valid.",
    },
  ],
  summary: { total: 3, successful: 1, failed: 2 },
};

export const BASE_URL = "https://rdapapi.io/api/v1";

export const TLDS_RESPONSE = {
  data: [
    {
      tld: "com",
      protocol: "rdap",
      supported_since: "2026-03-07T00:00:00Z",
      server: "rdap.verisign.com",
      rdap_server_host: "rdap.verisign.com",
      rdap_server_url: "https://rdap.verisign.com/com/v1/",
      field_availability: {
        registrar: "sometimes",
        registered_at: "always",
        expires_at: "always",
        nameservers: "always",
        status: "always",
      },
    },
    {
      tld: "it",
      protocol: "whois",
      supported_since: "2026-05-13T11:21:03Z",
      server: "whois.nic.it",
      rdap_server_host: null,
      rdap_server_url: null,
      field_availability: null,
    },
  ],
  meta: {
    computed_at: "2026-04-22T10:00:00Z",
    count: 2,
    coverage: 0.5,
    thresholds: { always: 0.99, usually: 0.8, sometimes: 0.0 },
  },
};

export const TLD_RESPONSE = {
  data: {
    tld: "com",
    protocol: "rdap",
    supported_since: "2026-03-07T00:00:00Z",
    server: "rdap.verisign.com",
    rdap_server_host: "rdap.verisign.com",
    rdap_server_url: "https://rdap.verisign.com/com/v1/",
    field_availability: {
      registrar: "sometimes",
      registered_at: "always",
      expires_at: "always",
      nameservers: "always",
      status: "always",
    },
  },
  meta: {
    computed_at: "2026-04-22T10:00:00Z",
    thresholds: { always: 0.99, usually: 0.8, sometimes: 0.0 },
  },
};
