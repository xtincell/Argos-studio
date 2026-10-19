// Reusable server-side function : take a validated ResearchDossier, write the
// resulting Reference + Asset + axes + metrics + sources into the DB, and
// return the transform audit.
//
// Used by the POST /api/v1/ingest/dossier route.

import { prisma, REFERENCE_INCLUDE } from '@/lib/db';
import {
  dossierToReference,
  type ResearchDossier,
  type TransformResult,
} from '@/lib/research-dossier';

export interface IngestRecord {
  result: TransformResult;
  newlyCreated: boolean;
  updatedAt: string;
}

export async function ingestDossier(dossier: ResearchDossier, expectedUpdatedAt?: string): Promise<IngestRecord> {
  const result = dossierToReference(dossier);
  const ref = result.reference;

  const outcome = await prisma.$transaction(async (tx) => {
    const existing = await tx.reference.findUnique({ where: { id: ref.id }, include: REFERENCE_INCLUDE });
    if (
      existing &&
      (existing.title !== ref.title ||
        existing.brandEmitter !== ref.brandEmitter ||
        existing.emissionYear !== ref.emissionYear)
    ) {
      throw new IngestValidationError(
        'The generated identifier belongs to a different operation.',
        'IDENTITY_CONFLICT',
      );
    }
    const retainedDossier = { ...dossier, researcher: { ...dossier.researcher, ...(dossier.researcher.contact === undefined && existing?.researcherContact ? { contact: existing.researcherContact } : {}) } };
    const canonicalDossier = JSON.stringify(retainedDossier);
    if (existing?.sourceDossierJson === canonicalDossier) {
      return { newlyCreated: false, updatedAt: existing.updatedAt.toISOString() };
    }
    if (existing && existing.updatedAt.toISOString() !== expectedUpdatedAt) {
      throw new IngestValidationError('La référence a une version existante. Rechargez le dossier avant de modifier.', 'VERSION_CONFLICT');
    }
    // Upsert the Reference row
    const data = {
      updatedAt: new Date(Math.max(Date.now(), existing ? existing.updatedAt.getTime() + 1 : 0)),
      slug: ref.slug,
      title: ref.title,
      brandEmitter: ref.brandEmitter,
      agencyCreator: ref.agencyCreator ?? null,
      sector: ref.sector,
      marketPrimary: ref.marketPrimary,
      marketsSecondaryJson: JSON.stringify(ref.marketsSecondary),
      emissionYear: ref.emissionYear,
      campaignParent: ref.campaignParent ?? null,
      patternKind: ref.patternKind,
      manipulationMode: ref.manipulationMode,
      funnelStage: ref.funnelStage,
      pillarsJson: JSON.stringify(ref.pillars),
      operationGoalsJson: JSON.stringify(ref.operationGoals),
      victoryTypesJson: JSON.stringify(ref.victoryTypes),
      confidence: ref.confidence,
      summary: ref.summary,
      patternObservation: ref.patternObservation ?? null,
      significance: ref.significance ?? null,
      performanceComposite: ref.performance.composite === null ? null : Math.round(ref.performance.composite),
      performanceCompositeSource: ref.performance.compositeSource,
      sourceDossierJson: canonicalDossier,
      performancePrimaryGoalsJson: JSON.stringify(ref.performance.primaryGoals),
      performanceOverallAttribution: ref.performance.overallAttribution,
      performanceRationale: ref.performance.rationale ?? null,
      ingestPath: 'manual-dossier',
      researcherName: dossier.researcher.name,
      researcherContact: retainedDossier.researcher.contact ?? null,
      researcherToolUsed: dossier.researcher.toolUsed ?? null,
      researchDate: dossier.researchDate,
    };
    let updatedAt: string;
    if (existing) {
      await tx.referenceRevision.create({ data: { referenceId: ref.id, versionAt: existing.updatedAt, snapshotJson: JSON.stringify(existing) } });
      const update = await tx.reference.updateMany({
        where: { id: ref.id, updatedAt: existing.updatedAt }, data,
      });
      if (update.count !== 1) throw new IngestValidationError('La référence a changé. Rechargez-la avant de modifier.', 'VERSION_CONFLICT');
      updatedAt = (await tx.reference.findUniqueOrThrow({ where: { id: ref.id } })).updatedAt.toISOString();
    } else {
      updatedAt = (await tx.reference.create({ data: { id: ref.id, ...data } })).updatedAt.toISOString();
    }

    // Replace children atomically. Wipe-and-rewrite is fine because IDs are
    // deterministic from the dossier transform (slug-derived).
    await tx.asset.deleteMany({ where: { referenceId: ref.id } });
    await tx.structuralAxis.deleteMany({ where: { referenceId: ref.id } });
    await tx.performanceMetric.deleteMany({ where: { referenceId: ref.id } });
    await tx.researchSource.deleteMany({ where: { referenceId: ref.id } });

    // Pass 1 : assets without self-ref
    for (const [i, a] of ref.assets.entries()) {
      await tx.asset.create({
        data: {
          id: a.id,
          referenceId: ref.id,
          kind: a.kind,
          function: a.function,
          role: a.role,
          url: a.url,
          posterUrl: a.posterUrl,
          aspectRatio: a.aspectRatio,
          text: a.text,
          caption: a.caption,
          alt: a.alt,
          durationSec: a.durationSec,
          format: a.format,
          sourceUrl: a.sourceUrl,
          sourceLicense: a.sourceLicense,
          extractionMethod: a.extractionMethod,
          position: i,
        },
      });
    }
    // Pass 2 : self-references (derivedFromAssetId)
    for (const a of ref.assets) {
      if (a.derivedFromAssetId) {
        await tx.asset.update({
          where: { id: a.id },
          data: { derivedFromAssetId: a.derivedFromAssetId },
        });
      }
    }

    for (const axis of ref.axes) {
      await tx.structuralAxis.create({
        data: {
          referenceId: ref.id,
          name: axis.name,
          value: axis.value,
          confidence: axis.confidence,
          evidence: axis.evidence,
          sourceUrl: axis.sourceUrl,
        },
      });
    }

    for (const m of ref.performance.metrics) {
      await tx.performanceMetric.create({
        data: {
          referenceId: ref.id,
          kind: m.kind,
          value: m.value,
          displayValue: m.displayValue,
          goal: m.goal,
          scope: m.scope,
          scopedAssetId: m.scopedAssetId,
          attribution: m.attribution,
          source: m.source,
          sourceUrl: m.sourceUrl,
          measuredAtYearMonth: m.measuredAtYearMonth,
        },
      });
    }

    for (const s of dossier.sources) {
      await tx.researchSource.create({
        data: {
          referenceId: ref.id,
          url: s.url,
          title: s.title,
          publisher: s.publisher,
          publishedDate: s.publishedDate,
          accessedDate: s.accessedDate,
          license: s.license,
          excerpt: s.excerpt,
          role: s.role,
        },
      });
    }

    for (const filiation of dossier.filiations) {
      const target = await tx.reference.findUnique({ where: { slug: filiation.targetSlug } });
      if (!target || target.id === ref.id) {
        throw new IngestValidationError('Filiation target is missing or refers to this dossier.');
      }
      const fromRefId = filiation.direction === 'inspires' ? ref.id : target.id;
      const toRefId = filiation.direction === 'inspires' ? target.id : ref.id;
      await tx.filiation.upsert({
        where: { fromRefId_toRefId: { fromRefId, toRefId } },
        create: {
          fromRefId,
          toRefId,
          type: filiation.relationshipType,
          evidence: filiation.evidence,
          confidence: filiation.confidence ?? 0.7,
        },
        update: {
          type: filiation.relationshipType,
          evidence: filiation.evidence ?? null,
          confidence: filiation.confidence ?? 0.7,
        },
      });
    }
    return { newlyCreated: !existing, updatedAt };
  });

  return { result, ...outcome };
}

// A typed error aborts Prisma's transaction before the route renders a refusal.
export class IngestValidationError extends Error {
  constructor(
    message: string,
    readonly code = 'INVALID_FILIATION',
  ) {
    super(message);
  }
}
