// Seed the DB with all known references, in priority order :
//   1. Real research dossiers from app/public/dossier-*.json (authoritative)
//   2. Snapshots from .argos-store/ingested/*.json (previous ingests)
//   3. In-memory mock dataset for slugs not yet covered
//
// Idempotent : re-running won't duplicate. Uses upsert by id.
//
// Run with : npm run db:seed

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { MOCK_REFERENCES } from '../src/data/mock-references';
import {
  ResearchDossierSchema,
  dossierToReference,
} from '../src/lib/research-dossier';
import type { Reference } from '../src/lib/types';

const prisma = new PrismaClient();

const PUBLIC_DIR = join(process.cwd(), 'public');
const STORE_DIR = join(process.cwd(), '.argos-store', 'ingested');

/** Buffer of filiations to resolve after all references are upserted. */
interface PendingFiliation {
  fromSlug: string;
  toSlug: string;
  relationshipType: string;
  evidence?: string;
  confidence: number;
}
const pendingFiliations: PendingFiliation[] = [];

async function main() {
  console.log('═══ Argos DB seed ═══\n');

  // The corpus is a bootstrap, not a restore: preserve operator work and annotations.
  const existing = await prisma.reference.findMany({ select: { slug: true } });
  const seededSlugs = new Set(existing.map((reference) => reference.slug));

  // 1) Real research dossiers (the authoritative source)
  console.log('\nLoading real research dossiers from public/dossier-*.json …');
  const publicFiles = readdirSync(PUBLIC_DIR).filter(
    (f) => f.startsWith('dossier-') && f.endsWith('.json') && !f.includes('template') && !f.includes('example'),
  );
  let dossierCount = 0;
  for (const file of publicFiles) {
    try {
      const raw = readFileSync(join(PUBLIC_DIR, file), 'utf8');
      const json = JSON.parse(raw);
      const parsed = ResearchDossierSchema.safeParse(json);
      if (!parsed.success) {
        console.warn(
          `  ! Skipped ${file}: ${parsed.error.issues.length} schema issues — ${parsed.error.issues[0]?.message ?? 'unknown'}`,
        );
        continue;
      }
      const { reference } = dossierToReference(parsed.data);
      if (seededSlugs.has(reference.slug)) {
        console.log(`  Preserved existing reference: ${reference.slug}`);
        continue;
      }
      await upsertReference(reference, {
        ingestPath: 'manual-dossier',
        researcherName: parsed.data.researcher.name,
        researcherContact: parsed.data.researcher.contact,
        researcherToolUsed: parsed.data.researcher.toolUsed,
        researchDate: parsed.data.researchDate,
        sources: parsed.data.sources.map((s) => ({
          url: s.url,
          title: s.title,
          publisher: s.publisher,
          publishedDate: s.publishedDate,
          accessedDate: s.accessedDate,
          license: s.license,
          excerpt: s.excerpt,
          role: s.role,
        })),
      });

      // Buffer filiations for second-pass resolution
      for (const f of parsed.data.filiations) {
        const fromSlug = f.direction === 'inspires' ? reference.slug : f.targetSlug;
        const toSlug = f.direction === 'inspires' ? f.targetSlug : reference.slug;
        pendingFiliations.push({
          fromSlug,
          toSlug,
          relationshipType: f.relationshipType,
          evidence: f.evidence,
          confidence: f.confidence ?? 0.7,
        });
      }

      seededSlugs.add(reference.slug);
      dossierCount++;
      console.log(`  ✓ ${file} → ${reference.slug}`);
    } catch (err) {
      console.warn(`  ! Skipped ${file}: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`  Total dossiers seeded : ${dossierCount}`);

  // 2) Previous ingestion snapshots in .argos-store/ingested/
  let snapshotCount = 0;
  try {
    const files = readdirSync(STORE_DIR).filter((f) => f.endsWith('.json'));
    console.log(
      `\nLoading ingested store (${files.length} snapshot${files.length > 1 ? 's' : ''} in .argos-store/ingested/) …`,
    );
    for (const file of files) {
      try {
        const snapshot = JSON.parse(readFileSync(join(STORE_DIR, file), 'utf8'));
        if (!snapshot.reference) continue;
        if (seededSlugs.has(snapshot.reference.slug)) {
          // Already covered by a public dossier
          continue;
        }
        const ingestPath =
          snapshot.source?.ingestPath ?? (snapshot.dossier ? 'manual-dossier' : 'mock');
        await upsertReference(snapshot.reference, {
          ingestPath,
          researcherName: snapshot.dossier?.researcher?.name,
          researcherContact: snapshot.dossier?.researcher?.contact,
          researcherToolUsed: snapshot.dossier?.researcher?.toolUsed,
          researchDate: snapshot.dossier?.researchDate,
          ingestedAt: snapshot.ingestedAt,
          sources: snapshot.dossier?.sources,
        });
        seededSlugs.add(snapshot.reference.slug);
        snapshotCount++;
      } catch (err) {
        console.warn(`  ! Skipped ${file}: ${err instanceof Error ? err.message : err}`);
      }
    }
    console.log(`  Total snapshots seeded : ${snapshotCount}`);
  } catch {
    console.log('\nNo .argos-store/ingested/ directory.');
  }

  // 3) Mock dataset — for slugs not yet covered
  console.log(`\nLoading mock dataset (${MOCK_REFERENCES.length} candidates) …`);
  let mockSeeded = 0;
  let mockSkipped = 0;
  for (const ref of MOCK_REFERENCES) {
    if (seededSlugs.has(ref.slug)) {
      mockSkipped++;
      continue;
    }
    await upsertReference(ref, { ingestPath: 'mock' });
    mockSeeded++;
  }
  console.log(
    `  Mock seeded : ${mockSeeded}${mockSkipped > 0 ? ` (${mockSkipped} skipped — covered upstream)` : ''}`,
  );

  // 4) Filiations — second pass, resolves slugs → refIds
  if (pendingFiliations.length > 0) {
    console.log(`\nResolving ${pendingFiliations.length} filiation edge(s) …`);
    let resolved = 0;
    let skippedDuplicates = 0;
    let skippedMissing = 0;
    const seen = new Set<string>();
    for (const f of pendingFiliations) {
      const key = `${f.fromSlug}→${f.toSlug}`;
      if (seen.has(key)) {
        skippedDuplicates++;
        continue;
      }
      seen.add(key);
      const [from, to] = await Promise.all([
        prisma.reference.findUnique({ where: { slug: f.fromSlug }, select: { id: true } }),
        prisma.reference.findUnique({ where: { slug: f.toSlug }, select: { id: true } }),
      ]);
      if (!from || !to) {
        console.warn(`  ! Skipped filiation: ${f.fromSlug} → ${f.toSlug} (one side missing)`);
        skippedMissing++;
        continue;
      }
      await prisma.filiation.upsert({
        where: { fromRefId_toRefId: { fromRefId: from.id, toRefId: to.id } },
        create: {
          fromRefId: from.id,
          toRefId: to.id,
          type: f.relationshipType,
          evidence: f.evidence,
          confidence: f.confidence,
        },
        update: {
          type: f.relationshipType,
          evidence: f.evidence,
          confidence: f.confidence,
        },
      });
      resolved++;
    }
    console.log(`  Resolved ${resolved} edges${skippedDuplicates ? ` (${skippedDuplicates} dedup)` : ''}${skippedMissing ? ` (${skippedMissing} missing side)` : ''}`);
  }

  // Summary
  const counts = await Promise.all([
    prisma.reference.count(),
    prisma.asset.count(),
    prisma.structuralAxis.count(),
    prisma.performanceMetric.count(),
    prisma.researchSource.count(),
    prisma.filiation.count(),
  ]);
  console.log(`\n═══ Seed complete ═══`);
  console.log(`  references:       ${counts[0]}`);
  console.log(`  assets:           ${counts[1]}`);
  console.log(`  structural axes:  ${counts[2]}`);
  console.log(`  metrics:          ${counts[3]}`);
  console.log(`  research sources: ${counts[4]}`);
  console.log(`  filiations:       ${counts[5]}`);
}

interface UpsertExtras {
  ingestPath: string;
  researcherName?: string;
  researcherContact?: string;
  researcherToolUsed?: string;
  researchDate?: string;
  ingestedAt?: string;
  sources?: Array<{
    url: string;
    title: string;
    publisher?: string;
    publishedDate?: string;
    accessedDate: string;
    license: string;
    excerpt?: string;
    role: string;
  }>;
}

async function upsertReference(ref: Reference, extras: UpsertExtras) {
  const data = {
    id: ref.id,
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
    ingestPath: extras.ingestPath,
    researcherName: extras.researcherName,
    researcherContact: extras.researcherContact,
    researcherToolUsed: extras.researcherToolUsed,
    researchDate: extras.researchDate,
    ingestedAt: extras.ingestedAt ? new Date(extras.ingestedAt) : new Date(),
  };

  await prisma.reference.upsert({
    where: { id: ref.id },
    create: data,
    update: data,
  });

  // Assets — two passes for self-references
  for (const [i, asset] of ref.assets.entries()) {
    await prisma.asset.upsert({
      where: { id: asset.id },
      create: {
        id: asset.id,
        referenceId: ref.id,
        kind: asset.kind,
        function: asset.function,
        role: asset.role,
        url: asset.url,
        posterUrl: asset.posterUrl,
        aspectRatio: asset.aspectRatio,
        text: asset.text,
        caption: asset.caption,
        alt: asset.alt,
        durationSec: asset.durationSec,
        format: asset.format,
        extractionMethod: asset.extractionMethod,
        position: i,
      },
      update: {
        kind: asset.kind,
        function: asset.function,
        role: asset.role,
        url: asset.url,
        posterUrl: asset.posterUrl,
        aspectRatio: asset.aspectRatio,
        text: asset.text,
        caption: asset.caption,
        alt: asset.alt,
        durationSec: asset.durationSec,
        format: asset.format,
        extractionMethod: asset.extractionMethod,
        position: i,
      },
    });
  }
  for (const asset of ref.assets) {
    if (asset.derivedFromAssetId) {
      await prisma.asset.update({
        where: { id: asset.id },
        data: { derivedFromAssetId: asset.derivedFromAssetId },
      });
    }
  }

  // Axes / metrics / sources : wipe-and-rewrite
  await prisma.structuralAxis.deleteMany({ where: { referenceId: ref.id } });
  for (const axis of ref.axes) {
    await prisma.structuralAxis.create({
      data: {
        referenceId: ref.id,
        name: axis.name,
        value: axis.value,
        confidence: axis.confidence,
        evidence: axis.evidence,
      },
    });
  }

  await prisma.performanceMetric.deleteMany({ where: { referenceId: ref.id } });
  for (const m of ref.performance.metrics) {
    await prisma.performanceMetric.create({
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

  if (extras.sources && extras.sources.length > 0) {
    await prisma.researchSource.deleteMany({ where: { referenceId: ref.id } });
    for (const s of extras.sources) {
      await prisma.researchSource.create({
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
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
