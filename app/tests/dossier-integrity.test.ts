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
process.env.ARGOS_INGEST_API_KEY = 'synthetic-editorial-library-receipt-key-20261019';
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
  const first = await ingestDossier(input);
  input.operation.agencyCreator = undefined;
  const receipt = await ingestDossier(input, first.updatedAt);
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
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ARGOS_INGEST_API_KEY}` },
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

test('no metric and no declared composite stays unknown through transform and storage', async () => {
  for (const confidence of ['HIGH', 'MEDIUM', 'LOW', 'ESTIMATED'] as const) {
    const input = dossier(`Sans mesure ${confidence}`);
    input.confidence = confidence;
    input.performance.metrics = [];
    input.performance.composite = undefined;
    const transformed = dossierToReference(input);
    assert.equal(transformed.reference.performance.composite, null);
    assert.equal(transformed.audit.compositeScoreSource, 'not-measured');
    const stored = await ingestDossier(input);
    const row = await prisma.reference.findUniqueOrThrow({ where: { id: stored.result.reference.id }, include: REFERENCE_INCLUDE });
    assert.equal(row.performanceComposite, null);
    assert.equal(dbToReference(row).performance.composite, null);
    assert.equal(row.performanceCompositeSource, 'not-measured');
  }
  const zero = dossier('Zéro expressément déclaré');
  zero.performance.metrics = [];
  zero.performance.composite = 0;
  assert.equal(dossierToReference(zero).reference.performance.composite, 0);
  assert.equal(dossierToReference(zero).audit.compositeScoreSource, 'provided-by-researcher');
});

test('each stored asset retains its own citation and licence without filling missing provenance', async () => {
  const input = dossier('Preuves par actif');
  const asset = required(input.assets[0]);
  asset.sourceIndex = 0;
  asset.sourceLicense = 'fair-use';
  if (input.assets[1]) { input.assets[1].sourceIndex = undefined; input.assets[1].sourceLicense = undefined; }
  const receipt = await ingestDossier(input);
  const row = await prisma.reference.findUniqueOrThrow({ where: { id: receipt.result.reference.id }, include: REFERENCE_INCLUDE });
  const stored = required(dbToReference(row).assets[0]);
  assert.equal(stored.sourceUrl, required(input.sources[0]).url);
  assert.equal(stored.sourceLicense, 'fair-use');
  if (row.assets[1]) { assert.equal(row.assets[1].sourceUrl, null); assert.equal(row.assets[1].sourceLicense, null); }
});

test('version refusal, immutable previous snapshot and public dossier return preserve the private contact', async () => {
  const input = dossier('Reprise versionnée');
  const first = await ingestDossier(input);
  const prior = await prisma.reference.findUniqueOrThrow({ where: { id: first.result.reference.id }, include: REFERENCE_INCLUDE });
  input.summary += ' Modification documentaire explicite.';
  await assert.rejects(ingestDossier(input), { code: 'VERSION_CONFLICT' });
  const amended = await ingestDossier(input, first.updatedAt);
  assert.notEqual(amended.updatedAt, first.updatedAt);
  const revision = await prisma.referenceRevision.findFirstOrThrow({ where: { referenceId: first.result.reference.id } });
  const previous = JSON.parse(revision.snapshotJson);
  assert.equal(previous.summary, prior.summary);
  assert.equal(previous.assets.length, prior.assets.length);
  assert.equal(previous.researcherContact, 'private-researcher@example.test');
  await ingestDossier(input); // Identical replay is harmless and needs no fresh version.
  assert.equal(await prisma.referenceRevision.count({ where: { referenceId: prior.id } }), 1);
  const { GET } = await import('../src/app/api/v1/references/[slug]/route');
  const exported = await GET(new NextRequest(`http://localhost/api/v1/references/${prior.slug}?format=dossier`), { params: Promise.resolve({ slug: prior.slug }) });
  assert.equal(exported.status, 200);
  assert.equal(exported.headers.get('ETag'), JSON.stringify(amended.updatedAt));
  const publicDossier = await exported.json();
  assert.equal(publicDossier.researcher.contact, undefined);
  assert.equal(JSON.stringify(publicDossier).includes('private-researcher@example.test'), false);
  assert.deepEqual(publicDossier.assets, input.assets);
  publicDossier.summary += ' Correction depuis le dossier public.';
  const current = await ingestDossier(ResearchDossierSchema.parse(publicDossier), amended.updatedAt);
  assert.notEqual(current.updatedAt, amended.updatedAt);
  assert.equal((await prisma.reference.findUniqueOrThrow({ where: { id: prior.id } })).researcherContact, prior.researcherContact);
  input.summary += ' Version devenue périmée.';
  await assert.rejects(ingestDossier(input, first.updatedAt), { code: 'VERSION_CONFLICT' });
  assert.equal(await prisma.referenceRevision.count({ where: { referenceId: prior.id } }), 2);
});

test('write access is checked before parsing and rejected requests have no data effect', async () => {
  const before = await prisma.reference.count();
  const key = process.env.ARGOS_INGEST_API_KEY;
  const request = (headers: Record<string, string> = {}) => new NextRequest('http://localhost/api/v1/ingest/dossier', { method: 'POST', headers, body: 'invalid-json' });
  assert.equal((await POST(request())).status, 401);
  assert.equal((await POST(request({ Authorization: 'Bearer wrong-synthetic-key' }))).status, 401);
  assert.equal((await POST(request({ Authorization: `Bearer ${key}`, Origin: 'https://foreign.example.test' }))).status, 403);
  try {
    process.env.ARGOS_INGEST_API_KEY = '';
    assert.equal((await POST(request())).status, 503);
  } finally { process.env.ARGOS_INGEST_API_KEY = key; }
  assert.equal(await prisma.reference.count(), before);
});

test('source pointers reject executable or credential-bearing URLs', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', 'https://user:password@example.test', 'not a URL', 'https://[invalid']) {
    const input = dossier('Pointeur public sûr');
    required(input.sources[0]).url = url;
    assert.equal(ResearchDossierSchema.safeParse(input).success, false);
  }
});
