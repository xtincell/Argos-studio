import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { ResearchDossierSchema, dossierToReference } from '../src/lib/research-dossier';

// Every write is confined to this disposable database. Never seed/reset a user's database.
const directory = mkdtempSync(join(tmpdir(), 'argos-integrity-'));
writeFileSync(join(directory, 'receipt.db'), '');
process.env.DATABASE_URL = `file:${join(directory, 'receipt.db')}`;
const { prisma, dbToReference, REFERENCE_INCLUDE } = await import('../src/lib/db');
const { ingestDossier } = await import('../src/server/ingest');
const { POST } = await import('../src/app/api/v1/ingest/dossier/route');
const { NextRequest } = await import('next/server');
const { GET: listReferences } = await import('../src/app/api/v1/references/route');

function dossier(title: string) {
  const input = JSON.parse(readFileSync('public/dossier-example.json', 'utf8'));
  input.operation.title = title;
  input.operation.brandEmitter = 'Synthetic receipt';
  input.researcher.contact = 'private-researcher@example.test';
  input.filiations = [];
  return ResearchDossierSchema.parse(input);
}

function required<T>(value: T | undefined): T {
  assert.ok(value !== undefined, 'The synthetic fixture must contain this record.');
  return value;
}

before(() => {
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: process.env,
    stdio: 'pipe',
  });
});

after(async () => {
  await prisma.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

test('a transformed dossier carries the exact citations, without the private contact', () => {
  const input = dossier('Sources intactes');
  const { reference } = dossierToReference(input);
  assert.deepEqual(reference.researchSources, input.sources);
  assert.equal(reference.researcherName, input.researcher.name);
  assert.equal(reference.researcherContact, undefined);
});

test('an asset-specific unknown license cannot be published through a licensed source', () => {
  const input = dossier('Licence à vérifier');
  required(input.assets[0]).sourceLicense = 'unknown';
  assert.equal(ResearchDossierSchema.safeParse(input).success, false);
});

test('a metric cannot cite a source outside its dossier', () => {
  const input = dossier('Source inexistante');
  assert.ok(input.performance.metrics.length > 0);
  required(input.performance.metrics[0]).sourceIndex = input.sources.length;
  assert.equal(ResearchDossierSchema.safeParse(input).success, false);
});

test('stored axes and metrics retain the URL of their cited source', async () => {
  const input = dossier('Preuve attribuée');
  required(input.axes[0]).sourceIndex = 0;
  required(input.performance.metrics[0]).sourceIndex = 0;
  const receipt = await ingestDossier(input);
  const axis = await prisma.structuralAxis.findFirst({
    where: { referenceId: receipt.result.reference.id },
  });
  const metric = await prisma.performanceMetric.findFirst({
    where: { referenceId: receipt.result.reference.id },
  });
  assert.equal(axis?.sourceUrl, required(input.sources[0]).url);
  assert.equal(metric?.sourceUrl, required(input.sources[0]).url);
});

test('amending a dossier clears an explicitly removed optional field', async () => {
  const input = dossier('Amendement fidèle');
  input.operation.agencyCreator = 'Agence de recette';
  await ingestDossier(input);
  input.operation.agencyCreator = undefined;
  const receipt = await ingestDossier(input);
  const row = await prisma.reference.findUniqueOrThrow({
    where: { id: receipt.result.reference.id },
  });
  assert.equal(row.agencyCreator, null);
});

test('manual ingestion preserves declared filiations and exact replay does not duplicate them', async () => {
  const parent = await ingestDossier(dossier('Référence antérieure'));
  const input = dossier('Référence héritière');
  input.filiations = [
    {
      direction: 'inspired_by',
      targetSlug: parent.result.reference.slug,
      relationshipType: 'CITATION_EXPLICIT',
      evidence: 'Filiation synthétique explicite pour cette recette.',
      confidence: 0.8,
    },
  ];
  const first = await ingestDossier(input);
  const second = await ingestDossier(input);
  assert.equal(first.newlyCreated, true);
  assert.equal(second.newlyCreated, false);
  const edges = await prisma.filiation.findMany({ where: { toRefId: first.result.reference.id } });
  assert.equal(edges.length, 1);
  assert.equal(edges[0]?.fromRefId, parent.result.reference.id);
  assert.equal(edges[0]?.evidence, input.filiations[0]?.evidence);
});

test('a public library DTO omits the stored private researcher contact', async () => {
  const receipt = await ingestDossier(dossier('Contact privé'));
  const row = await prisma.reference.findUniqueOrThrow({
    where: { id: receipt.result.reference.id },
    include: REFERENCE_INCLUDE,
  });
  assert.equal(row.researcherContact, 'private-researcher@example.test');
  assert.equal(dbToReference(row).researcherContact, undefined);
});

test('an unresolved filiation returns 422 and rolls back every part of the dossier', async () => {
  const input = dossier('Filiation à résoudre');
  input.filiations = [
    {
      direction: 'inspired_by',
      targetSlug: 'missing-synthetic-reference',
      relationshipType: 'CITATION_EXPLICIT',
    },
  ];
  const before = await prisma.reference.count();
  const response = await POST(
    new NextRequest('http://argos.example.test/api/v1/ingest/dossier', {
      method: 'POST',
      body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error, 'INVALID_FILIATION');
  assert.equal(await prisma.reference.count(), before);
  const id = dossierToReference(input).reference.id;
  assert.equal(await prisma.asset.count({ where: { referenceId: id } }), 0);
});

test('loading the bundled corpus never deletes a reference or annotation entered by an operator', async () => {
  const receipt = await ingestDossier(dossier('Dossier hors du corpus fourni'));
  const referenceId = receipt.result.reference.id;
  const annotation = await prisma.expertAnnotation.create({
    data: {
      referenceId,
      annotatorName: 'Synthetic operator',
      type: 'COUNTER_READING',
      content: 'Analyse synthétique à conserver lors de la reprise du corpus.',
    },
  });
  execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts'], {
    env: process.env,
    stdio: 'pipe',
  });
  assert.ok(await prisma.reference.findUnique({ where: { id: referenceId } }));
  assert.ok(await prisma.expertAnnotation.findUnique({ where: { id: annotation.id } }));
});

test('two operations whose titles collide after truncation cannot overwrite one another', async () => {
  const prefix =
    'Une opération au titre exceptionnellement long pour cette recette synthétique '.repeat(2);
  const first = dossier(`${prefix}A`);
  const second = dossier(`${prefix}B`);
  const stored = await ingestDossier(first);
  assert.equal(dossierToReference(first).reference.id, dossierToReference(second).reference.id);
  await assert.rejects(ingestDossier(second), /different operation/);
  const row = await prisma.reference.findUniqueOrThrow({
    where: { id: stored.result.reference.id },
  });
  assert.equal(row.title, first.operation.title);
});

test('the public search API returns the stored dossier and citations without the private contact', async () => {
  const input = dossier('Recherche ciblée unique de recette');
  const receipt = await ingestDossier(input);
  const params = new URLSearchParams({
    q: input.operation.title,
    brand: 'synthetic-receipt',
    limit: '1',
  });
  const response = await listReferences(
    new NextRequest(`http://argos.example.test/api/v1/references?${params}`),
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.meta.pagination.total, 1);
  assert.equal(payload.data[0].id, receipt.result.reference.id);
  assert.deepEqual(payload.data[0].researchSources, input.sources);
  assert.equal(payload.data[0].researcherContact, undefined);
});
