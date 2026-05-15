// Reusable server-side function : take a validated ResearchDossier, write the
// resulting Reference + Asset + axes + metrics + sources into the DB, and
// return the transform audit.
//
// Used by the POST /api/v1/ingest/dossier route.

import { prisma } from '@/lib/db';
import { dossierToReference, type ResearchDossier, type TransformResult } from '@/lib/research-dossier';

export interface IngestRecord {
  result: TransformResult;
  newlyCreated: boolean;
}

export async function ingestDossier(dossier: ResearchDossier): Promise<IngestRecord> {
  const result = dossierToReference(dossier);
  const ref = result.reference;

  const existing = await prisma.reference.findUnique({ where: { id: ref.id } });
  const newlyCreated = !existing;

  await prisma.$transaction(async (tx) => {
    // Upsert the Reference row
    const data = {
      slug: ref.slug,
      title: ref.title,
      brandEmitter: ref.brandEmitter,
      agencyCreator: ref.agencyCreator,
      sector: ref.sector,
      marketPrimary: ref.marketPrimary,
      marketsSecondaryJson: JSON.stringify(ref.marketsSecondary),
      emissionYear: ref.emissionYear,
      campaignParent: ref.campaignParent,
      patternKind: ref.patternKind,
      manipulationMode: ref.manipulationMode,
      funnelStage: ref.funnelStage,
      pillarsJson: JSON.stringify(ref.pillars),
      operationGoalsJson: JSON.stringify(ref.operationGoals),
      victoryTypesJson: JSON.stringify(ref.victoryTypes),
      confidence: ref.confidence,
      summary: ref.summary,
      patternObservation: ref.patternObservation,
      significance: ref.significance,
      performanceComposite: Math.round(ref.performance.composite),
      performancePrimaryGoalsJson: JSON.stringify(ref.performance.primaryGoals),
      performanceOverallAttribution: ref.performance.overallAttribution,
      performanceRationale: ref.performance.rationale,
      ingestPath: 'manual-dossier',
      researcherName: dossier.researcher.name,
      researcherContact: dossier.researcher.contact,
      researcherToolUsed: dossier.researcher.toolUsed,
      researchDate: dossier.researchDate,
    };
    await tx.reference.upsert({
      where: { id: ref.id },
      create: { id: ref.id, ...data },
      update: data,
    });

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
  });

  return { result, newlyCreated };
}
