// Unified library access layer — DB-backed.
//
// Reads from PostgreSQL/SQLite via Prisma. The public surface stays identical
// to the previous filesystem-backed implementation so all the entity pages,
// /search, /works, /assets, /browse keep working.
//
// All functions are async now (the FS-backed ones were sync). React's `cache`
// dedupes calls within a single render pass, so the per-page cost is one DB
// round-trip even if many helpers ask for the full reference set.
//
// Visibility (ADR-0010): every reader takes a `ReadScope` whose DEFAULT IS PUBLIC. The public
// scope never returns, counts or links a private dossier. Only a caller holding the
// administration key (see src/server/read-scope.ts) passes 'admin'. Crawler-facing surfaces
// (sitemap, Open Graph image) always read the public scope.

import { cache } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import { prisma, dbToReference, referenceInclude } from './db';
import { ResearchDossierSchema, type ResearchDossier } from './research-dossier';
import { type ReadScope, type Visibility, visibilityWhere } from './visibility';
import { slugify } from './utils';
import type {
  Asset,
  AssetFunction,
  ManipulationMode,
  OperationGoal,
  PatternKind,
  Pillar,
  Reference,
  SectorMeta,
  StructuralAxisName,
  VictoryType,
} from './types';
import { MOCK_SECTORS } from '@/data/mock-references';

export { slugify } from './utils';
export type { ReadScope } from './visibility';

/* -------------------------------------------------------------------------- */
/* Reference access                                                           */
/* -------------------------------------------------------------------------- */

const loadReferences = cache(async (scope: ReadScope): Promise<Reference[]> => {
  noStore();
  const rows = await prisma.reference.findMany({
    where: visibilityWhere(scope),
    include: referenceInclude(scope),
    orderBy: { emissionYear: 'desc' },
  });
  return rows.map((row) => dbToReference(row, scope));
});

export function getAllReferences(scope: ReadScope = 'public'): Promise<Reference[]> {
  return loadReferences(scope);
}

export async function getReferenceBySlug(
  slug: string,
  scope: ReadScope = 'public',
): Promise<Reference | undefined> {
  noStore();
  const row = await prisma.reference.findFirst({
    where: { slug, ...visibilityWhere(scope) },
    include: referenceInclude(scope),
  });
  return row ? dbToReference(row, scope) : undefined;
}

export type SourceDossierRead =
  | { status: 'found'; dossier: ResearchDossier; updatedAt: string; visibility: Visibility }
  | { status: 'unavailable' };

/**
 * The canonical dossier of a reference, for its export and its correction. The researcher's
 * private contact is removed. In the public scope, a filiation whose target is not a public
 * reference (private, or purged) is removed too, with its declared title.
 */
export async function getSourceDossier(
  slug: string,
  scope: ReadScope = 'public',
): Promise<SourceDossierRead | undefined> {
  noStore();
  const row = await prisma.reference.findFirst({
    where: { slug, ...visibilityWhere(scope) },
    select: { sourceDossierJson: true, updatedAt: true, visibility: true },
  });
  if (!row) return undefined;
  if (!row.sourceDossierJson) return { status: 'unavailable' };
  const original = ResearchDossierSchema.parse(JSON.parse(row.sourceDossierJson));
  const { contact: _privateContact, ...researcher } = original.researcher;
  let filiations = original.filiations;
  if (scope !== 'admin' && filiations.length > 0) {
    const readable = await prisma.reference.findMany({
      where: { slug: { in: filiations.map((f) => f.targetSlug) }, visibility: 'public' },
      select: { slug: true },
    });
    const allowed = new Set(readable.map((r) => r.slug));
    filiations = filiations.filter((f) => allowed.has(f.targetSlug));
  }
  return {
    status: 'found',
    dossier: { ...original, researcher, filiations },
    updatedAt: row.updatedAt.toISOString(),
    visibility: row.visibility === 'private' ? 'private' : 'public',
  };
}

/* -------------------------------------------------------------------------- */
/* Entity lookups                                                              */
/* -------------------------------------------------------------------------- */

export async function getReferencesByBrand(brandSlug: string, scope: ReadScope = 'public'): Promise<Reference[]> {
  return (await getAllReferences(scope)).filter((r) => slugify(r.brandEmitter) === brandSlug);
}

export async function getReferencesByAgency(agencySlug: string, scope: ReadScope = 'public'): Promise<Reference[]> {
  return (await getAllReferences(scope)).filter(
    (r) => r.agencyCreator && slugify(r.agencyCreator) === agencySlug,
  );
}

export async function getReferencesByMarket(marketSlug: string, scope: ReadScope = 'public'): Promise<Reference[]> {
  return (await getAllReferences(scope)).filter(
    (r) =>
      slugify(r.marketPrimary) === marketSlug ||
      r.marketsSecondary.some((m) => slugify(m) === marketSlug),
  );
}

export async function getReferencesByYear(year: number, scope: ReadScope = 'public'): Promise<Reference[]> {
  return (await getAllReferences(scope)).filter((r) => r.emissionYear === year);
}

export async function getReferencesByAward(awardKey: VictoryType, scope: ReadScope = 'public'): Promise<Reference[]> {
  return (await getAllReferences(scope)).filter((r) => r.victoryTypes.includes(awardKey));
}

export async function getReferencesBySector(sectorSlug: string, scope: ReadScope = 'public'): Promise<Reference[]> {
  return (await getAllReferences(scope)).filter((r) => slugify(r.sector) === sectorSlug);
}

export async function getReferencesByManipulationMode(
  mode: ManipulationMode,
  scope: ReadScope = 'public',
): Promise<Reference[]> {
  return (await getAllReferences(scope)).filter((r) => r.manipulationMode === mode);
}

export async function getReferencesByPatternKind(kind: PatternKind, scope: ReadScope = 'public'): Promise<Reference[]> {
  return (await getAllReferences(scope)).filter((r) => r.patternKind === kind);
}

export async function getReferencesByPillar(pillar: Pillar, scope: ReadScope = 'public'): Promise<Reference[]> {
  return (await getAllReferences(scope)).filter((r) => r.pillars.includes(pillar));
}

export async function getReferencesByAxis(axis: StructuralAxisName, scope: ReadScope = 'public'): Promise<Reference[]> {
  return (await getAllReferences(scope)).filter((r) => r.axes.some((a) => a.name === axis));
}

export async function getReferencesByOperationGoal(goal: OperationGoal, scope: ReadScope = 'public'): Promise<Reference[]> {
  return (await getAllReferences(scope)).filter((r) => r.operationGoals.includes(goal));
}

export async function getReferencesByAssetFunction(fn: AssetFunction, scope: ReadScope = 'public'): Promise<Reference[]> {
  return (await getAllReferences(scope)).filter((r) => r.assets.some((a) => a.function === fn));
}

/* -------------------------------------------------------------------------- */
/* Aggregation helpers                                                        */
/* -------------------------------------------------------------------------- */

export interface FacetCount<T extends string | number> {
  value: T;
  label: string;
  slug: string;
  count: number;
}

export async function listBrands(scope: ReadScope = 'public'): Promise<FacetCount<string>[]> {
  return facet((await getAllReferences(scope)).map((r) => r.brandEmitter));
}

export async function listAgencies(scope: ReadScope = 'public'): Promise<FacetCount<string>[]> {
  return facet(
    (await getAllReferences(scope))
      .map((r) => r.agencyCreator)
      .filter((a): a is string => Boolean(a)),
  );
}

export async function listMarkets(scope: ReadScope = 'public'): Promise<FacetCount<string>[]> {
  return facet(
    (await getAllReferences(scope)).flatMap((r) => [r.marketPrimary, ...r.marketsSecondary]),
  );
}

export async function listYears(scope: ReadScope = 'public'): Promise<FacetCount<number>[]> {
  const counts = new Map<number, number>();
  for (const r of await getAllReferences(scope)) {
    counts.set(r.emissionYear, (counts.get(r.emissionYear) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([year, count]) => ({
      value: year,
      label: String(year),
      slug: String(year),
      count,
    }))
    .sort((a, b) => b.value - a.value);
}

export async function listSectors(scope: ReadScope = 'public'): Promise<FacetCount<string>[]> {
  return facet((await getAllReferences(scope)).map((r) => r.sector));
}

export async function listAwards(scope: ReadScope = 'public'): Promise<FacetCount<VictoryType>[]> {
  const counts = new Map<VictoryType, number>();
  for (const r of await getAllReferences(scope)) {
    for (const v of r.victoryTypes) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([award, count]) => ({
      value: award,
      label: award,
      slug: slugify(award),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export async function listManipulationModes(scope: ReadScope = 'public'): Promise<FacetCount<ManipulationMode>[]> {
  const counts = new Map<ManipulationMode, number>();
  for (const r of await getAllReferences(scope)) {
    counts.set(r.manipulationMode, (counts.get(r.manipulationMode) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([mode, count]) => ({
    value: mode,
    label: mode,
    slug: slugify(mode),
    count,
  }));
}

export async function listPatternKinds(scope: ReadScope = 'public'): Promise<FacetCount<PatternKind>[]> {
  const counts = new Map<PatternKind, number>();
  for (const r of await getAllReferences(scope)) {
    counts.set(r.patternKind, (counts.get(r.patternKind) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([kind, count]) => ({
    value: kind,
    label: kind,
    slug: slugify(kind),
    count,
  }));
}

export async function listStructuralAxes(scope: ReadScope = 'public'): Promise<FacetCount<StructuralAxisName>[]> {
  const counts = new Map<StructuralAxisName, number>();
  for (const r of await getAllReferences(scope)) {
    for (const axis of r.axes) {
      counts.set(axis.name, (counts.get(axis.name) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({
      value: name,
      label: name,
      slug: slugify(name),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export async function listOperationGoals(scope: ReadScope = 'public'): Promise<FacetCount<OperationGoal>[]> {
  const counts = new Map<OperationGoal, number>();
  for (const r of await getAllReferences(scope)) {
    for (const goal of r.operationGoals) {
      counts.set(goal, (counts.get(goal) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries()).map(([goal, count]) => ({
    value: goal,
    label: goal,
    slug: slugify(goal),
    count,
  }));
}

export async function listAssetFunctions(scope: ReadScope = 'public'): Promise<FacetCount<AssetFunction>[]> {
  const counts = new Map<AssetFunction, number>();
  for (const r of await getAllReferences(scope)) {
    for (const a of r.assets) {
      counts.set(a.function, (counts.get(a.function) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([fn, count]) => ({
      value: fn,
      label: fn,
      slug: slugify(fn),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

/* -------------------------------------------------------------------------- */
/* Asset-level surface                                                        */
/* -------------------------------------------------------------------------- */

export interface AssetWithRef {
  asset: Asset;
  reference: Pick<Reference, 'slug' | 'title' | 'brandEmitter' | 'sector' | 'emissionYear'>;
}

export async function getAllAssets(scope: ReadScope = 'public'): Promise<AssetWithRef[]> {
  const all: AssetWithRef[] = [];
  for (const r of await getAllReferences(scope)) {
    for (const a of r.assets) {
      all.push({
        asset: a,
        reference: {
          slug: r.slug,
          title: r.title,
          brandEmitter: r.brandEmitter,
          sector: r.sector,
          emissionYear: r.emissionYear,
        },
      });
    }
  }
  return all;
}

export async function getAssetsByFunction(fn: AssetFunction, scope: ReadScope = 'public'): Promise<AssetWithRef[]> {
  return (await getAllAssets(scope)).filter((a) => a.asset.function === fn);
}

export async function getAssetById(
  id: string,
  scope: ReadScope = 'public',
): Promise<{ asset: Asset; reference: Reference } | undefined> {
  for (const r of await getAllReferences(scope)) {
    const a = r.assets.find((a) => a.id === id);
    if (a) return { asset: a, reference: r };
  }
  return undefined;
}

export async function countResearchSources(scope: ReadScope = 'public'): Promise<number> {
  noStore();
  return prisma.researchSource.count({ where: { reference: visibilityWhere(scope) } });
}

/* -------------------------------------------------------------------------- */
/* Sectors — meta (description, top brands, emerging patterns) stays in the   */
/* mock dataset for now ; DB table for editorial sector meta comes later.     */
/* -------------------------------------------------------------------------- */

export function getSectorMeta(sectorSlug: string): SectorMeta | undefined {
  return MOCK_SECTORS.find((s) => s.slug === sectorSlug);
}

export function listSectorMeta(): SectorMeta[] {
  return MOCK_SECTORS;
}

/* -------------------------------------------------------------------------- */

function facet(values: string[]): FacetCount<string>[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({
      value,
      label: value,
      slug: slugify(value),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}
