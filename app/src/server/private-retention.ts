// Retention of the private space (owner decision of 12 November 2026, ADR-0010).
//
// A private dossier is purged 24 calendar months after its last modification — the later of its
// content version (`updatedAt`) and its last explicit visibility change — unless it has been
// made public. Public dossiers are never touched.
//
// The purge is explicit and logged:
//   - `mode: 'dry-run'` reads only: it lists what a purge would remove and writes nothing, not
//     even a log row;
//   - `mode: 'purge'` deletes, in one transaction, each due dossier together with everything
//     that belongs to it (assets, axes, metrics, sources, annotations, revisions, filiations,
//     visibility history: foreign keys ON DELETE CASCADE), with SQLite `secure_delete` so the
//     freed pages are overwritten, then records one `PrivatePurgeRun` row holding counts only.
// Callers: POST /api/admin/private-purge (key), the `argos-purge-private` command of the image
// (which calls that route) and the daily run inside the server (private-purge-schedule.ts).
//
// Assets are stored as rows that point to URLs: Argos writes no asset file on /data. The only
// files on the volume are the database, its journal and the copies made by `argos-backup`;
// copies taken before a purge still hold the purged dossiers, and are reported here.

import { existsSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { prisma } from '@/lib/db';
import {
  PRIVATE_RETENTION_MONTHS,
  lastModificationOf,
  privatePurgeDueAt,
  retentionCutoff,
} from '@/lib/visibility';

export { PRIVATE_RETENTION_MONTHS, lastModificationOf, privatePurgeDueAt, retentionCutoff };

export type PurgeMode = 'dry-run' | 'purge';

export interface PrivateDossierRetention {
  slug: string;
  title: string;
  brandEmitter: string;
  updatedAt: string;
  visibilityChangedAt: string | null;
  visibilityChangedBy: string | null;
  lastModifiedAt: string;
  purgeDueAt: string;
  due: boolean;
}

export interface PurgeReport {
  mode: PurgeMode;
  trigger: string;
  ranAt: string;
  retentionMonths: number;
  /** Informative: a dossier last modified at or before this instant is due. */
  cutoff: string;
  /** Due private dossiers (dry-run: would be removed; purge: were due when the run started). */
  candidates: { slug: string; title: string; lastModifiedAt: string; purgeDueAt: string }[];
  purgedCount: number;
  /** Copies made by argos-backup before this run: they may still hold purged dossiers. */
  backups: { directory: string; count: number } | null;
}

/** The private space with each dossier's retention, earliest purge first. */
export async function listPrivateDossiers(now: Date = new Date()): Promise<PrivateDossierRetention[]> {
  const rows = await prisma.reference.findMany({
    where: { visibility: 'private' },
    select: { slug: true, title: true, brandEmitter: true, updatedAt: true, visibilityChangedAt: true,
      visibilityChangedBy: true },
  });
  return rows
    .map((row) => {
      const lastModifiedAt = lastModificationOf(row);
      const due = privatePurgeDueAt(lastModifiedAt);
      return {
        slug: row.slug,
        title: row.title,
        brandEmitter: row.brandEmitter,
        updatedAt: row.updatedAt.toISOString(),
        visibilityChangedAt: row.visibilityChangedAt?.toISOString() ?? null,
        visibilityChangedBy: row.visibilityChangedBy,
        lastModifiedAt: lastModifiedAt.toISOString(),
        purgeDueAt: due.toISOString(),
        due: due.getTime() <= now.getTime(),
      };
    })
    .sort((a, b) => a.purgeDueAt.localeCompare(b.purgeDueAt) || a.slug.localeCompare(b.slug));
}

/** The directory where argos-backup writes, when the database is an absolute SQLite path. */
function backupInventory(): PurgeReport['backups'] {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('file:')) return null;
  const file = url.slice('file:'.length).split('?')[0] ?? '';
  if (!isAbsolute(file)) return null;
  const directory = join(dirname(file), 'backups');
  if (!existsSync(directory)) return { directory, count: 0 };
  try {
    const count = readdirSync(directory).filter((name) => name.startsWith('argos-') && name.endsWith('.db')).length;
    return { directory, count };
  } catch {
    return null;
  }
}

export async function purgeExpiredPrivateDossiers(options: {
  mode: PurgeMode;
  trigger: string;
  now?: Date;
}): Promise<PurgeReport> {
  const now = options.now ?? new Date();
  const rows = await prisma.reference.findMany({
    where: { visibility: 'private' },
    select: { id: true, slug: true, title: true, updatedAt: true, visibilityChangedAt: true },
  });
  const due = rows
    .map((row) => ({ row, lastModifiedAt: lastModificationOf(row), purgeDueAt: privatePurgeDueAt(lastModificationOf(row)) }))
    .filter((entry) => entry.purgeDueAt.getTime() <= now.getTime())
    .sort((a, b) => a.purgeDueAt.getTime() - b.purgeDueAt.getTime() || a.row.slug.localeCompare(b.row.slug));
  const cutoff = retentionCutoff(now);
  const report: PurgeReport = {
    mode: options.mode,
    trigger: options.trigger,
    ranAt: now.toISOString(),
    retentionMonths: PRIVATE_RETENTION_MONTHS,
    cutoff: cutoff.toISOString(),
    candidates: due.map(({ row, lastModifiedAt, purgeDueAt }) => ({
      slug: row.slug, title: row.title, lastModifiedAt: lastModifiedAt.toISOString(), purgeDueAt: purgeDueAt.toISOString(),
    })),
    purgedCount: 0,
    backups: backupInventory(),
  };
  if (options.mode === 'dry-run') {
    console.info(`[argos] purge des dossiers privés (aperçu, ${options.trigger}) : ${due.length} dossier(s) échu(s), aucune écriture.`);
    return report;
  }
  report.purgedCount = await prisma.$transaction(async (tx) => {
    // Freed pages are overwritten: the deleted dossier does not linger in the database file.
    await tx.$queryRawUnsafe('PRAGMA secure_delete = ON');
    let purged = 0;
    for (const { row } of due) {
      // Still private and unmodified since it was read: a dossier published or amended in the
      // meantime is not due any more and is kept.
      const deleted = await tx.reference.deleteMany({
        where: { id: row.id, visibility: 'private', updatedAt: row.updatedAt, visibilityChangedAt: row.visibilityChangedAt },
      });
      purged += deleted.count;
    }
    await tx.privatePurgeRun.create({
      data: { ranAt: now, cutoff, retentionMonths: PRIVATE_RETENTION_MONTHS, purgedCount: purged, trigger: options.trigger },
    });
    return purged;
  });
  console.info(`[argos] purge des dossiers privés (${options.trigger}) : ${report.purgedCount} dossier(s) supprimé(s), dernière modification au plus tard ${report.cutoff}.`);
  return report;
}

/** Latest real purges, newest first (counts only). */
export async function recentPurgeRuns(take = 5) {
  return prisma.privatePurgeRun.findMany({ orderBy: { ranAt: 'desc' }, take });
}
