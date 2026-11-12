// Visibility of a dossier and its retention (owner decision of 12 November 2026, ADR-0010).
//
// A dossier is public or private. A private dossier belongs to UPgraders, the studio operator:
// only the administration key (Bearer header or open session) reads it. Anonymous readers never
// see it, its existence, its count or its assets. It is purged 24 calendar months after its last
// modification, unless it has been made public.
//
// Pure module: shared by the library, the server and the interface.

export type Visibility = 'public' | 'private';
export const VISIBILITIES: readonly Visibility[] = ['public', 'private'];

/** Who reads: anyone, or the holder of the administration key. */
export type ReadScope = 'public' | 'admin';

export function parseVisibility(value: unknown): Visibility | null {
  return value === 'public' || value === 'private' ? value : null;
}

/** Prisma filter of the references a scope may read. */
export function visibilityWhere(scope: ReadScope): { visibility?: Visibility } {
  return scope === 'admin' ? {} : { visibility: 'public' };
}

export const PRIVATE_RETENTION_MONTHS = 24;

/** Adds calendar months in UTC; the 29–31 of a shorter month becomes its last day. */
export function addUtcMonths(date: Date, months: number): Date {
  const day = date.getUTCDate();
  const result = new Date(date.getTime());
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

/**
 * Last modification of a dossier: its content version (`updatedAt`) or its last explicit
 * visibility change, whichever is later. Making an old dossier private restarts its clock.
 */
export function lastModificationOf(row: { updatedAt: Date; visibilityChangedAt?: Date | null }): Date {
  const changed = row.visibilityChangedAt;
  return changed && changed.getTime() > row.updatedAt.getTime() ? changed : row.updatedAt;
}

/** A private dossier is due for purge 24 months after its last modification. */
export function privatePurgeDueAt(lastModifiedAt: Date): Date {
  return addUtcMonths(lastModifiedAt, PRIVATE_RETENTION_MONTHS);
}

/** Dossiers last modified at or before this instant are due (informative bound of a run). */
export function retentionCutoff(now: Date): Date {
  return addUtcMonths(now, -PRIVATE_RETENTION_MONTHS);
}

/** Channel of the single key that performed an administration action (not a person). */
export type AdminChannel = 'admin-session' | 'admin-bearer';

export const ADMIN_CHANNEL_LABELS: Record<string, string> = {
  'admin-session': 'session d’administration',
  'admin-bearer': 'clé par en-tête Authorization',
  scheduler: 'purge quotidienne du serveur',
};
