// Display stored dates (research, access, measurement, last update) without inventing one.
// A missing or malformed value yields null, never "today".

export type Freshness = {
  /** Machine-readable value for <time dateTime>, exactly as stored. */
  dateTime: string;
  /** French label, computed in UTC so that the server and every reader agree. */
  label: string;
};

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH = /^(\d{4})-(\d{2})$/;

const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function utcDate(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

export function freshness(value: string | null | undefined): Freshness | null {
  if (!value) return null;
  const day = DAY.exec(value);
  if (day) {
    const date = utcDate(Number(day[1]), Number(day[2]), Number(day[3]));
    return date ? { dateTime: value, label: dayFormat.format(date) } : null;
  }
  const month = MONTH.exec(value);
  if (month) {
    const date = utcDate(Number(month[1]), Number(month[2]), 1);
    return date ? { dateTime: value, label: monthFormat.format(date) } : null;
  }
  // Full timestamps (ISO 8601 with time) only; anything else is not a date we can vouch for.
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return null;
  return { dateTime: value, label: dayFormat.format(instant) };
}

/** Most recent stored timestamp of a set, or null when none is usable. */
export function latestTimestamp(values: Array<string | null | undefined>): string | null {
  let latest: { value: string; time: number } | null = null;
  for (const value of values) {
    if (!value || !/^\d{4}-\d{2}-\d{2}T/.test(value)) continue;
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) continue;
    if (!latest || time > latest.time) latest = { value, time };
  }
  return latest?.value ?? null;
}
