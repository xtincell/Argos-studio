// Unified library access layer — DB-backed.
//
// Reads from PostgreSQL/SQLite via Prisma. The public surface stays identical
// to the previous filesystem-backed implementation so all the entity pages,
// /search, /works, /assets, /browse keep working.
//
// All functions are async now (the FS-backed ones were sync). React's `cache`
// dedupes calls within a single render pass, so the per-page cost is one DB
// round-trip even if many helpers ask for the full reference set.

import { cache } from 'react';
import { prisma, REFERENCE_INCLUDE, dbToReference } from './db';
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

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* -------------------------------------------------------------------------- */
/* Reference access                                                           */
/* -------------------------------------------------------------------------- */

export const getAllReferences = cache(async (): Promise<Reference[]> => {
  const rows = await prisma.reference.findMany({
    include: REFERENCE_INCLUDE,
    orderBy: { emissionYear: 'desc' },
  });
  return rows.map(dbToReference);
});

export async function getReferenceBySlug(slug: string): Promise<Reference | undefined> {
  const row = await prisma.reference.findUnique({
    where: { slug },
    include: REFERENCE_INCLUDE,
  });
  return row ? dbToReference(row) : undefined;
}

/* -------------------------------------------------------------------------- */
/* Entity lookups                                                              */
/* -------------------------------------------------------------------------- */

export async function getReferencesByBrand(brandSlug: string): Promise<Reference[]> {
  return (await getAllReferences()).filter((r) => slugify(r.brandEmitter) === brandSlug);
}

export async function getReferencesByAgency(agencySlug: string): Promise<Reference[]> {
  return (await getAllReferences()).filter(
    (r) => r.agencyCreator && slugify(r.agencyCreator) === agencySlug,
  );
}

export async function getReferencesByMarket(marketSlug: string): Promise<Reference[]> {
  return (await getAllReferences()).filter(
    (r) =>
      slugify(r.marketPrimary) === marketSlug ||
      r.marketsSecondary.some((m) => slugify(m) === marketSlug),
  );
}

export async function getReferencesByYear(year: number): Promise<Reference[]> {
  return (await getAllReferences()).filter((r) => r.emissionYear === year);
}

export async function getReferencesByAward(awardKey: VictoryType): Promise<Reference[]> {
  return (await getAllReferences()).filter((r) => r.victoryTypes.includes(awardKey));
}

export async function getReferencesBySector(sectorSlug: string): Promise<Reference[]> {
  return (await getAllReferences()).filter((r) => slugify(r.sector) === sectorSlug);
}

export async function getReferencesByManipulationMode(
  mode: ManipulationMode,
): Promise<Reference[]> {
  return (await getAllReferences()).filter((r) => r.manipulationMode === mode);
}

export async function getReferencesByPatternKind(kind: PatternKind): Promise<Reference[]> {
  return (await getAllReferences()).filter((r) => r.patternKind === kind);
}

export async function getReferencesByPillar(pillar: Pillar): Promise<Reference[]> {
  return (await getAllReferences()).filter((r) => r.pillars.includes(pillar));
}

export async function getReferencesByAxis(axis: StructuralAxisName): Promise<Reference[]> {
  return (await getAllReferences()).filter((r) => r.axes.some((a) => a.name === axis));
}

export async function getReferencesByOperationGoal(goal: OperationGoal): Promise<Reference[]> {
  return (await getAllReferences()).filter((r) => r.operationGoals.includes(goal));
}

export async function getReferencesByAssetFunction(fn: AssetFunction): Promise<Reference[]> {
  return (await getAllReferences()).filter((r) => r.assets.some((a) => a.function === fn));
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

export async function listBrands(): Promise<FacetCount<string>[]> {
  return facet((await getAllReferences()).map((r) => r.brandEmitter));
}

export async function listAgencies(): Promise<FacetCount<string>[]> {
  return facet(
    (await getAllReferences())
      .map((r) => r.agencyCreator)
      .filter((a): a is string => Boolean(a)),
  );
}

export async function listMarkets(): Promise<FacetCount<string>[]> {
  return facet(
    (await getAllReferences()).flatMap((r) => [r.marketPrimary, ...r.marketsSecondary]),
  );
}

export async function listYears(): Promise<FacetCount<number>[]> {
  const counts = new Map<number, number>();
  for (const r of await getAllReferences()) {
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

export async function listSectors(): Promise<FacetCount<string>[]> {
  return facet((await getAllReferences()).map((r) => r.sector));
}

export async function listAwards(): Promise<FacetCount<VictoryType>[]> {
  const counts = new Map<VictoryType, number>();
  for (const r of await getAllReferences()) {
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

export async function listManipulationModes(): Promise<FacetCount<ManipulationMode>[]> {
  const counts = new Map<ManipulationMode, number>();
  for (const r of await getAllReferences()) {
    counts.set(r.manipulationMode, (counts.get(r.manipulationMode) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([mode, count]) => ({
    value: mode,
    label: mode,
    slug: slugify(mode),
    count,
  }));
}

export async function listPatternKinds(): Promise<FacetCount<PatternKind>[]> {
  const counts = new Map<PatternKind, number>();
  for (const r of await getAllReferences()) {
    counts.set(r.patternKind, (counts.get(r.patternKind) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([kind, count]) => ({
    value: kind,
    label: kind,
    slug: slugify(kind),
    count,
  }));
}

export async function listStructuralAxes(): Promise<FacetCount<StructuralAxisName>[]> {
  const counts = new Map<StructuralAxisName, number>();
  for (const r of await getAllReferences()) {
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

export async function listOperationGoals(): Promise<FacetCount<OperationGoal>[]> {
  const counts = new Map<OperationGoal, number>();
  for (const r of await getAllReferences()) {
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

export async function listAssetFunctions(): Promise<FacetCount<AssetFunction>[]> {
  const counts = new Map<AssetFunction, number>();
  for (const r of await getAllReferences()) {
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

export async function getAllAssets(): Promise<AssetWithRef[]> {
  const all: AssetWithRef[] = [];
  for (const r of await getAllReferences()) {
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

export async function getAssetsByFunction(fn: AssetFunction): Promise<AssetWithRef[]> {
  return (await getAllAssets()).filter((a) => a.asset.function === fn);
}

export async function getAssetById(
  id: string,
): Promise<{ asset: Asset; reference: Reference } | undefined> {
  for (const r of await getAllReferences()) {
    const a = r.assets.find((a) => a.id === id);
    if (a) return { asset: a, reference: r };
  }
  return undefined;
}

export async function countResearchSources(): Promise<number> {
  return prisma.researchSource.count();
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
