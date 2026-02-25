/**
 * Convert a snake_case string to camelCase.
 *
 * Examples: "rdap_server" → "rdapServer", "raw_rdap_url" → "rawRdapUrl"
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

/**
 * Recursively convert all keys in an object from snake_case to camelCase.
 */
export function camelCaseKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(camelCaseKeys);
  }

  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[snakeToCamel(key)] = camelCaseKeys(value);
    }
    return result;
  }

  return obj;
}
