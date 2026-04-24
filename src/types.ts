/** Metadata about the RDAP lookup. */
export interface Meta {
  rdapServer: string;
  rawRdapUrl: string;
  cached: boolean;
  cacheExpires: string;
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

/** Response from a domain lookup. */
export interface DomainResponse {
  domain: string;
  unicodeName: string | null;
  handle: string | null;
  status: string[];
  registrar: Registrar;
  dates: Dates;
  nameservers: string[];
  dnssec: boolean;
  entities: Entities;
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
  remarks: Remark[];
  port43: string | null;
  meta: Meta;
}

/** Response from an ASN lookup. */
export interface AsnResponse {
  handle: string | null;
  name: string | null;
  type: string | null;
  startAutnum: number | null;
  endAutnum: number | null;
  status: string[];
  dates: Dates;
  entities: Entities;
  remarks: Remark[];
  port43: string | null;
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
  meta: Meta;
}

/** A single result within a bulk domain lookup response. */
export interface BulkDomainResult {
  domain: string;
  status: string;
  data?: DomainResponse | null;
  error?: string | null;
  message?: string | null;
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
  supportedSince: string;
  rdapServerHost: string;
  rdapServerUrl: string;
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
