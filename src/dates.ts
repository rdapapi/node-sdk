import type { Dates } from "./types.js";

/**
 * Parse the registered date into a Date object, or null if absent or unparseable.
 */
export function registeredAt(dates: Dates): Date | null {
  return parseISO(dates.registered);
}

/**
 * Parse the expiry date into a Date object, or null if absent or unparseable.
 */
export function expiresAt(dates: Dates): Date | null {
  return parseISO(dates.expires);
}

/**
 * Parse the updated date into a Date object, or null if absent or unparseable.
 */
export function updatedAt(dates: Dates): Date | null {
  return parseISO(dates.updated);
}

/**
 * Days until expiration, or null if no expiry date is available.
 *
 * Returns a negative number if the domain has already expired.
 */
export function expiresInDays(dates: Dates): number | null {
  const exp = expiresAt(dates);
  if (exp === null) {
    return null;
  }
  return Math.floor((exp.getTime() - Date.now()) / 86_400_000);
}

function parseISO(value: string | null): Date | null {
  if (value === null) {
    return null;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
