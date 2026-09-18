/** Which protocol answered a lookup. */
export type Source = "rdap" | "whois";

/** Metadata about the lookup: where the answer came from, and how it was served. */
export interface Meta {
  /** Hostname of the upstream that answered. Occasionally null on an older cached record. */
  server: string | null;
  source: Source;
  /** @deprecated Use {@link Meta.server} or {@link Meta.rawRdapUrl}. Absent when `source` is `whois`. */
  rdapServer?: string;
  /** Absent when `source` is `whois`, or when a stored snapshot answered. */
  rawRdapUrl?: string;
  /** Omitted from the partial `meta` of a failed bulk entry. */
  cached?: boolean;
  /** Omitted from the partial `meta` of a failed bulk entry. */
  cacheExpires?: string;
  followed?: boolean | null;
  registrarRdapServer?: string | null;
  followError?: string | null;
}

/** Registration dates. */
export interface Dates {
  registered: string | null;
  expires: string | null;
  updated: string | null;
}

/** Domain registrar information. */
export interface Registrar {
  name: string | null;
  ianaId: string | null;
  abuseEmail: string | null;
  abusePhone: string | null;
  url: string | null;
}

/** Contact entity information. */
export interface Contact {
  handle: string | null;
  name: string | null;
  organization: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactUrl: string | null;
  countryCode: string | null;
}

/** Contact entities keyed by role. */
export interface Entities {
  registrant?: Contact | null;
  administrative?: Contact | null;
  technical?: Contact | null;
  billing?: Contact | null;
  abuse?: Contact | null;
}

/** Remark from the registry. */
export interface Remark {
  title: string | null;
  description: string;
}

/**
 * How a value was withheld: `removal` deleted it, `emptyValue` blanked it,
 * `partialValue` truncated it, and `replacementValue` published a substitute.
 *
 * An unrecognised method from a server is passed through unchanged, so treat
 * this as an open set rather than a closed enum.
 */
export type RedactionMethod =
  | "removal"
  | "emptyValue"
  | "partialValue"
  | "replacementValue"
  | (string & {});

/**
 * What the upstream server declared it withheld, mirroring the shape of the
 * record it describes: a claim about `entities.registrant.name` sits at
 * `redacted.entities.registrant.name`. Field names are camelCased like the rest
 * of the response.
 *
 * Absent when the server declared nothing, which is not evidence that nothing
 * was withheld.
 */
export interface Redaction {
  handle?: RedactionMethod;
  /** Claims about the top-level `registrar` object. Domain lookups only. */
  registrar?: Record<string, RedactionMethod>;
  /** Claims keyed by contact role, then by field within that contact. */
  entities?: Record<string, Record<string, RedactionMethod>>;
}

/** Response from a domain lookup. */
export interface DomainResponse {
  domain: string;
  unicodeName: string | null;
  handle: string | null;
  status: string[];
  registrar: Registrar;
  dates: Dates;
  nameservers: string[];
  /** `null` where the registry publishes no DNSSEC status, as `.tr`, `.gg` and `.nc` do not. */
  dnssec: boolean | null;
  entities: Entities;
  redacted?: Redaction;
  meta: Meta;
}

/** IP addresses for a nameserver. */
export interface IpAddresses {
  v4: string[];
  v6: string[];
}

/** Response from an IP address lookup. */
export interface IpResponse {
  handle: string | null;
  name: string | null;
  type: string | null;
  startAddress: string | null;
  endAddress: string | null;
  ipVersion: string | null;
  parentHandle: string | null;
  country: string | null;
  status: string[];
  dates: Dates;
  entities: Entities;
  cidr: string[];
  /**
   * URL of the RFC 8805 geofeed this network publishes, as published: never
   * fetched, never inherited from a parent network. `null` when there is none.
   */
  geofeed: string | null;
  remarks: Remark[];
  port43: string | null;
  redacted?: Redaction;
  meta: Meta;
}

/** Response from an ASN lookup. */
export interface AsnResponse {
  handle: string | null;
  name: string | null;
  type: string | null;
  startAutnum: number | null;
  endAutnum: number | null;
  /** Derived from the contact entities' address; regional registries carry no top-level country. */
  country: string | null;
  status: string[];
  dates: Dates;
  entities: Entities;
  remarks: Remark[];
  port43: string | null;
  redacted?: Redaction;
  meta: Meta;
}

/** Response from a nameserver lookup. */
export interface NameserverResponse {
  ldhName: string;
  unicodeName: string | null;
  handle: string | null;
  ipAddresses: IpAddresses;
  status: string[];
  dates: Dates;
  entities: Entities;
  redacted?: Redaction;
  meta: Meta;
}

/** Public identifier (e.g. ARIN OrgID, IANA Registrar ID). */
export interface PublicId {
  type: string | null;
  identifier: string | null;
}

/** Autonomous system number owned by an entity. */
export interface EntityAutnum {
  handle: string | null;
  name: string | null;
  startAutnum: number | null;
  endAutnum: number | null;
}

/** IP network block owned by an entity. */
export interface EntityNetwork {
  handle: string | null;
  name: string | null;
  startAddress: string | null;
  endAddress: string | null;
  ipVersion: string | null;
  cidr: string[];
}

/** Response from an entity lookup. */
export interface EntityResponse {
  handle: string | null;
  name: string | null;
  organization: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactUrl: string | null;
  countryCode: string | null;
  roles: string[];
  status: string[];
  dates: Dates;
  remarks: Remark[];
  port43: string | null;
  publicIds: PublicId[];
  entities: Entities;
  autnums: EntityAutnum[];
  networks: EntityNetwork[];
  redacted?: Redaction;
  meta: Meta;
}

/** A single result within a bulk domain lookup response. */
export interface BulkDomainResult {
  domain: string;
  status: string;
  data?: DomainResponse | null;
  error?: string | null;
  message?: string | null;
  /**
   * Partial `meta` for a failed entry, naming the upstream that was tried.
   * Absent when the entry failed before an upstream was chosen, as
   * `invalid_domain` does. On a successful entry the full `meta` is moved onto
   * {@link BulkDomainResult.data} instead.
   */
  meta?: Meta;
}

/** Summary counts for a bulk domain lookup. */
export interface BulkDomainSummary {
  total: number;
  successful: number;
  failed: number;
}

/** Response from a bulk domain lookup. */
export interface BulkDomainResponse {
  results: BulkDomainResult[];
  summary: BulkDomainSummary;
}

/** Response from the health check endpoint. */
export interface PingResponse {
  status: string;
}

/** Options for the RdapClient constructor. */
export interface RdapClientOptions {
  baseUrl?: string;
  timeout?: number;
}

/** Qualitative bucket describing how often a field is populated in a TLD's RDAP responses. */
export type AvailabilityLevel = "always" | "usually" | "sometimes" | "never";

/** How often each common domain field is populated in a TLD's RDAP responses. */
export interface FieldAvailability {
  registrar: AvailabilityLevel;
  registeredAt: AvailabilityLevel;
  expiresAt: AvailabilityLevel;
  nameservers: AvailabilityLevel;
  status: AvailabilityLevel;
}

/** Percentage cutoffs used to pick each availability label. */
export interface TldThresholds {
  always: number;
  usually: number;
  sometimes: number;
}

/** A single TLD entry from the /tlds catalog. */
export interface TldEntry {
  tld: string;
  /** `whois` marks the ccTLDs IANA lists no RDAP server for. */
  protocol: Source;
  supportedSince: string;
  /** Hostname of the upstream that answers for this TLD. What `?server=` filters on. */
  server: string;
  /** @deprecated Superseded by {@link TldEntry.server}. Null when `protocol` is `whois`. */
  rdapServerHost: string | null;
  /** Null when `protocol` is `whois`, which has no URL form. */
  rdapServerUrl: string | null;
  /** Null while a TLD is still accruing observations, and always null when `protocol` is `whois`. */
  fieldAvailability: FieldAvailability | null;
}

/** Metadata for a TLD list response. */
export interface TldListMeta {
  computedAt: string;
  count: number;
  coverage: number;
  thresholds: TldThresholds;
}

/** Metadata for a single-TLD response. */
export interface TldMeta {
  computedAt: string;
  thresholds: TldThresholds;
}

/** Response from GET /tlds. */
export interface TldListResponse {
  data: TldEntry[];
  meta: TldListMeta;
  /** ETag returned by the server. Pass back via {@link TldsOptions.ifNoneMatch} to skip unchanged transfers. */
  etag: string | null;
}

/** Response from GET /tlds/{tld}. */
export interface TldResponse {
  data: TldEntry;
  meta: TldMeta;
  /** ETag returned by the server. Pass back via {@link TldOptions.ifNoneMatch} to skip unchanged transfers. */
  etag: string | null;
}

/** Options for {@link RdapClient.tlds}. */
export interface TldsOptions {
  /** ISO 8601 timestamp. Only TLDs supported after this instant are returned. */
  since?: string;
  /** RDAP server hostname filter (case-insensitive). */
  server?: string;
  /** Previous ETag. When matched, the method resolves to `null`. */
  ifNoneMatch?: string;
}

/** Options for {@link RdapClient.tld}. */
export interface TldOptions {
  /** Previous ETag. When matched, the method resolves to `null`. */
  ifNoneMatch?: string;
}
