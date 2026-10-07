// Prisma client + Reference deserialiser.
//
// The DB stores enum-like values as plain strings (provider-agnostic) and array
// fields as JSON strings. This module owns the (de)serialisation so the rest of
// the app keeps consuming the clean Reference type from ./types.

import { PrismaClient, type Prisma } from '@prisma/client';
import type {
  Asset,
  AssetExtractionMethod,
  AssetFunction,
  AssetKind,
  AssetRole,
  AttributionConfidence,
  ConfidenceLevel,
  FunnelStage,
  ManipulationMode,
  OperationGoal,
  PatternKind,
  PerformanceMetric,
  PerformanceMetricKind,
  Pillar,
  Reference,
  StructuralAxis,
  StructuralAxisName,
  VictoryType,
} from './types';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error', 'warn'] });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * The shape of a Reference row loaded with all its relations.
 * Mirrors `prisma.reference.findX({ include: REFERENCE_INCLUDE })`.
 */
export const REFERENCE_INCLUDE = {
  assets: { orderBy: { position: 'asc' } },
  axes: true,
  metrics: true,
  sources: { orderBy: { id: 'asc' } },
  filiationsFrom: {
    include: {
      toRef: {
        select: { id: true, slug: true, title: true, brandEmitter: true, emissionYear: true },
      },
    },
  },
  filiationsTo: {
    include: {
      fromRef: {
        select: { id: true, slug: true, title: true, brandEmitter: true, emissionYear: true },
      },
    },
  },
} satisfies Prisma.ReferenceInclude;

type ReferenceRow = Prisma.ReferenceGetPayload<{
  include: typeof REFERENCE_INCLUDE;
}>;

export function dbToReference(row: ReferenceRow): Reference {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    brandEmitter: row.brandEmitter,
    agencyCreator: row.agencyCreator ?? undefined,
    sector: row.sector,
    marketPrimary: row.marketPrimary,
    marketsSecondary: parseJsonArray<string>(row.marketsSecondaryJson),
    emissionYear: row.emissionYear,
    campaignParent: row.campaignParent ?? undefined,
    patternKind: row.patternKind as PatternKind,
    manipulationMode: row.manipulationMode as ManipulationMode,
    funnelStage: row.funnelStage as FunnelStage,
    pillars: parseJsonArray<Pillar>(row.pillarsJson),
    operationGoals: parseJsonArray<OperationGoal>(row.operationGoalsJson),
    victoryTypes: parseJsonArray<VictoryType>(row.victoryTypesJson),
    confidence: row.confidence as ConfidenceLevel,
    summary: row.summary,
    patternObservation: row.patternObservation ?? undefined,
    significance: row.significance ?? undefined,
    axes: row.axes.map(dbToAxis),
    assets: row.assets.map(dbToAsset),
    performance: {
      composite: row.performanceComposite,
      primaryGoals: parseJsonArray<OperationGoal>(row.performancePrimaryGoalsJson),
      metrics: row.metrics.map(dbToMetric),
      overallAttribution: row.performanceOverallAttribution as AttributionConfidence,
      rationale: row.performanceRationale ?? undefined,
    },
    researcherName: row.researcherName ?? undefined,
    researcherToolUsed: row.researcherToolUsed ?? undefined,
    researchDate: row.researchDate ?? undefined,
    ingestPath: row.ingestPath ?? undefined,
    researchSources: row.sources.map((s) => ({
      url: s.url,
      title: s.title,
      publisher: s.publisher ?? undefined,
      publishedDate: s.publishedDate ?? undefined,
      accessedDate: s.accessedDate ?? undefined,
      license: s.license,
      excerpt: s.excerpt ?? undefined,
      role: s.role,
    })),
    filiations: [
      ...row.filiationsFrom.map((f) => ({
        type: 'inspires' as const,
        refId: f.toRef.id,
        refSlug: f.toRef.slug,
        refTitle: f.toRef.title,
        refYear: f.toRef.emissionYear,
        refBrand: f.toRef.brandEmitter,
        relationshipType: f.type,
        evidence: f.evidence ?? undefined,
        confidence: f.confidence,
      })),
      ...row.filiationsTo.map((f) => ({
        type: 'inspired_by' as const,
        refId: f.fromRef.id,
        refSlug: f.fromRef.slug,
        refTitle: f.fromRef.title,
        refYear: f.fromRef.emissionYear,
        refBrand: f.fromRef.brandEmitter,
        relationshipType: f.type,
        evidence: f.evidence ?? undefined,
        confidence: f.confidence,
      })),
    ],
  };
}

function dbToAxis(row: ReferenceRow['axes'][number]): StructuralAxis {
  return {
    name: row.name as StructuralAxisName,
    value: row.value,
    confidence: row.confidence,
    evidence: row.evidence ?? undefined,
    sourceUrl: row.sourceUrl ?? undefined,
  };
}

function dbToAsset(row: ReferenceRow['assets'][number]): Asset {
  return {
    id: row.id,
    kind: row.kind as AssetKind,
    function: row.function as AssetFunction,
    role: row.role as AssetRole,
    url: row.url,
    posterUrl: row.posterUrl ?? undefined,
    aspectRatio: row.aspectRatio as Asset['aspectRatio'],
    text: row.text ?? undefined,
    caption: row.caption ?? undefined,
    alt: row.alt ?? undefined,
    durationSec: row.durationSec ?? undefined,
    format: row.format ?? undefined,
    extractionMethod: (row.extractionMethod ?? undefined) as AssetExtractionMethod | undefined,
    derivedFromAssetId: row.derivedFromAssetId ?? undefined,
  };
}

function dbToMetric(row: ReferenceRow['metrics'][number]): PerformanceMetric {
  return {
    kind: row.kind as PerformanceMetricKind,
    value: row.value,
    displayValue: row.displayValue ?? undefined,
    goal: row.goal as OperationGoal,
    scope: row.scope as 'OPERATION' | 'ASSET',
    scopedAssetId: row.scopedAssetId ?? undefined,
    attribution: row.attribution as AttributionConfidence,
    source: row.source,
    sourceUrl: row.sourceUrl ?? undefined,
    measuredAtYearMonth: row.measuredAtYearMonth ?? undefined,
  };
}

function parseJsonArray<T>(json: string): T[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}
