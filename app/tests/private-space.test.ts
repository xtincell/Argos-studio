// Private space of the library (owner decision, 12 November 2026): a dossier is public or
// private. A private dossier belongs to UPgraders and is read only with the administration key;
// anonymous readers never see it, its existence, its count or its assets. It is purged 24 months
// after its last modification unless it has been made public.
// Every write is confined to this disposable database; no provider, no operator database.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { after, before, test } from 'node:test';

const directory = mkdtempSync(join(tmpdir(), 'argos-private-'));
writeFileSync(join(directory, 'private.db'), '');
process.env.DATABASE_URL = `file:${join(directory, 'private.db')}`;
const KEY = 'synthetic-private-space-receipt-key-20261112';
process.env.ARGOS_ADMIN_KEY = KEY;
Reflect.deleteProperty(process.env, 'ARGOS_INGEST_API_KEY');
Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_SITE_URL');
const { NextRequest } = await import('next/server');
const { prisma } = await import('../src/lib/db');

const SITE = 'http://argos.example.test';
type Params = { params: Promise<Record<string, string>> };
type Handler = (request: InstanceType<typeof NextRequest>, context: Params) => Promise<Response>;

before(() => {
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: process.env, stdio: 'pipe' });
});

after(async () => {
  await prisma.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

/* ------------------------------------------------------------------------------------------ */
/* Fixtures                                                                                   */

const BUNDLED = readdirSync('public')
  .filter((name) => name.startsWith('dossier-') && name.endsWith('.json') && !name.includes('template') && !name.includes('example'))
  .sort();

/** A private dossier whose every facet (brand, sector, markets, year, agency) is its own. */
const MARKER = {
  title: 'Opération témoin privée',
  brandEmitter: 'Témoin Espace Privé',
  agencyCreator: 'Agence témoin privée',
  sector: 'Secteur témoin privé',
  marketPrimary: 'Marché témoin privé',
  marketsSecondary: ['Marché secondaire témoin'],
  emissionYear: 1903,
};

function dossier(operation: Partial<typeof MARKER> & { title: string }, filiations: unknown[] = []) {
  const input = JSON.parse(readFileSync('public/dossier-example.json', 'utf8'));
  input.operation = { ...input.operation, brandEmitter: 'Synthetic private receipt', ...operation };
  input.researcher = { name: 'Synthetic receipt only', contact: 'private-space@example.test' };
  input.filiations = filiations;
  return input;
}

const bearer = { Authorization: `Bearer ${KEY}` };

function request(path: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  return new NextRequest(`${SITE}${path}`, init);
}

async function call(load: () => Promise<{ GET?: Handler; POST?: Handler }>, method: 'GET' | 'POST', path: string,
  params: Record<string, string> = {}, init: { headers?: Record<string, string>; body?: string } = {}) {
  const handler = (await load())[method];
  assert.ok(handler, `${method} ${path} must exist.`);
  return handler(request(path, { method, ...init }), { params: Promise.resolve(params) });
}

const ingestRoute = () => import('../src/app/api/v1/ingest/dossier/route') as unknown as Promise<{ POST: Handler }>;
const detailRoute = () => import('../src/app/api/v1/references/[slug]/route') as unknown as Promise<{ GET: Handler }>;
const listRoute = () => import('../src/app/api/v1/references/route') as unknown as Promise<{ GET: Handler }>;
const visibilityRoute = () => import('../src/app/api/v1/references/[slug]/visibility/route') as unknown as Promise<{ POST: Handler }>;
const purgeRoute = () => import('../src/app/api/admin/private-purge/route') as unknown as Promise<{ POST: Handler }>;

async function admit(input: unknown, query = '', headers: Record<string, string> = bearer) {
  return call(ingestRoute, 'POST', `/api/v1/ingest/dossier${query}`, {}, {
    headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(input),
  });
}

async function openSession(): Promise<string> {
  const { POST } = await import('../src/app/api/admin/login/route');
  const response = await POST(request('/api/admin/login', { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: SITE },
    body: new URLSearchParams({ key: KEY, next: '/admin/ingest' }).toString() }));
  const value = response.cookies.get('argos_admin')?.value;
  assert.ok(value, 'The single key must open a session.');
  return `argos_admin=${value}`;
}

/** The eight bundled public dossiers, admitted by the governed route in dependency order. */
const bundled: { slugs: string[] } = { slugs: [] };
async function admitBundled(): Promise<string[]> {
  if (bundled.slugs.length) return bundled.slugs;
  let pending = BUNDLED.map((name) => JSON.parse(readFileSync(join('public', name), 'utf8')));
  const slugs: string[] = [];
  while (pending.length) {
    const refused: unknown[] = [];
    for (const input of pending) {
      const response = await admit(input);
      if (response.status === 201) slugs.push((await response.json()).slug);
      else if (response.status === 422) refused.push(input); // filiation target admitted later
      else assert.fail(`Bundled dossier refused: HTTP ${response.status}`);
    }
    assert.ok(refused.length < pending.length, 'Every bundled filiation must resolve.');
    pending = refused;
  }
  bundled.slugs = slugs.sort();
  return bundled.slugs;
}

/** The marker private dossier, admitted once with `?visibility=private`. */
const marker: { slug?: string; assetIds?: string[] } = {};
async function admitMarker() {
  if (marker.slug) return marker as { slug: string; assetIds: string[] };
  const response = await admit(dossier(MARKER), '?visibility=private');
  assert.equal(response.status, 201);
  const receipt = await response.json();
  assert.equal(receipt.visibility, 'private', 'The admission must answer the visibility it stored.');
  marker.slug = receipt.slug;
  marker.assetIds = (await prisma.asset.findMany({ where: { reference: { slug: receipt.slug } }, select: { id: true } })).map((a) => a.id);
  return marker as { slug: string; assetIds: string[] };
}

/** Every anonymous read surface of the API, as JSON. */
const ANONYMOUS_ROUTES: [string, () => Promise<{ GET: Handler }>, Record<string, string>][] = [
  ['/api/v1/references?limit=100', listRoute, {}],
  [`/api/v1/references?limit=100&q=${encodeURIComponent('témoin privée')}`, listRoute, {}],
  ['/api/v1/references?limit=100&brand=temoin-espace-prive', listRoute, {}],
  ['/api/v1/references?limit=100&year=1903', listRoute, {}],
  ['/api/v1/brands', () => import('../src/app/api/v1/brands/route') as unknown as Promise<{ GET: Handler }>, {}],
  ['/api/v1/brands/temoin-espace-prive', () => import('../src/app/api/v1/brands/[slug]/route') as unknown as Promise<{ GET: Handler }>, { slug: 'temoin-espace-prive' }],
  ['/api/v1/sectors', () => import('../src/app/api/v1/sectors/route') as unknown as Promise<{ GET: Handler }>, {}],
  ['/api/v1/sectors/secteur-temoin-prive', () => import('../src/app/api/v1/sectors/[slug]/route') as unknown as Promise<{ GET: Handler }>, { slug: 'secteur-temoin-prive' }],
  ['/api/v1/markets', () => import('../src/app/api/v1/markets/route') as unknown as Promise<{ GET: Handler }>, {}],
  ['/api/v1/markets/marche-temoin-prive', () => import('../src/app/api/v1/markets/[slug]/route') as unknown as Promise<{ GET: Handler }>, { slug: 'marche-temoin-prive' }],
  ['/api/v1/agencies', () => import('../src/app/api/v1/agencies/route') as unknown as Promise<{ GET: Handler }>, {}],
  ['/api/v1/agencies/agence-temoin-privee', () => import('../src/app/api/v1/agencies/[slug]/route') as unknown as Promise<{ GET: Handler }>, { slug: 'agence-temoin-privee' }],
  ['/api/v1/years', () => import('../src/app/api/v1/years/route') as unknown as Promise<{ GET: Handler }>, {}],
  ['/api/v1/years/1903', () => import('../src/app/api/v1/years/[year]/route') as unknown as Promise<{ GET: Handler }>, { year: '1903' }],
  ['/api/v1/awards', () => import('../src/app/api/v1/awards/route') as unknown as Promise<{ GET: Handler }>, {}],
  ['/api/v1/assets?limit=200', () => import('../src/app/api/v1/assets/route') as unknown as Promise<{ GET: Handler }>, {}],
  ['/api/v1/asset-functions', () => import('../src/app/api/v1/asset-functions/route') as unknown as Promise<{ GET: Handler }>, {}],
];

async function anonymousSnapshot(headers: Record<string, string> = {}) {
  const snapshot: Record<string, unknown> = {};
  for (const [path, load, params] of ANONYMOUS_ROUTES) {
    const response = await call(load, 'GET', path, params, { headers });
    snapshot[path] = { status: response.status, body: await response.json() };
  }
  const library = await import('../src/lib/library');
  snapshot.library = {
    references: await library.getAllReferences(),
    assets: await library.getAllAssets(),
    brands: await library.listBrands(),
    sectors: await library.listSectors(),
    markets: await library.listMarkets(),
    years: await library.listYears(),
    sources: await library.countResearchSources(),
  };
  return snapshot;
}

/** What an unknown slug answers, with the slug itself replaced: the reference for a private one. */
async function normalised(response: Response, slug: string) {
  const body = (await response.text()).replaceAll(slug, '<slug>');
  const headers = Object.fromEntries(['content-type', 'cache-control', 'vary', 'etag', 'content-disposition']
    .map((name) => [name, response.headers.get(name)?.replaceAll(slug, '<slug>') ?? null]));
  return { status: response.status, headers, body };
}

/* ------------------------------------------------------------------------------------------ */
/* Library and anonymous isolation                                                            */

test('the eight bundled public dossiers are admitted public and listed to anonymous readers', async () => {
  const slugs = await admitBundled();
  assert.equal(slugs.length, 8);
  const response = await call(listRoute, 'GET', '/api/v1/references?limit=100');
  const payload = await response.json();
  assert.deepEqual(payload.data.map((r: { slug: string }) => r.slug).sort(), slugs);
  assert.equal(payload.meta.pagination.total, 8);
});

test('a private dossier changes nothing an anonymous reader can list, search or count', async () => {
  await admitBundled();
  const before = await anonymousSnapshot();
  const { slug } = await admitMarker();
  assert.deepEqual(await anonymousSnapshot(), before, 'Anonymous lists, searches, facets and counts stay identical.');
  // A wrong key is an anonymous reader, not an error.
  assert.deepEqual(await anonymousSnapshot({ Authorization: 'Bearer wrong-synthetic-private-key-0000000' }), before);
  const text = JSON.stringify(await anonymousSnapshot());
  for (const secret of [slug, MARKER.title, MARKER.brandEmitter, MARKER.sector, MARKER.agencyCreator]) {
    assert.equal(text.includes(secret), false, `${secret} must not appear in any anonymous read.`);
  }
});

test('anonymous detail and export of a private dossier answer exactly like an unknown slug', async () => {
  const { slug } = await admitMarker();
  const unknown = 'reference-absente-de-la-bibliotheque';
  for (const suffix of ['', '?format=dossier']) {
    const hidden = await normalised(await call(detailRoute, 'GET', `/api/v1/references/${slug}${suffix}`, { slug }), slug);
    const absent = await normalised(await call(detailRoute, 'GET', `/api/v1/references/${unknown}${suffix}`, { slug: unknown }), unknown);
    assert.equal(hidden.status, 404);
    assert.deepEqual(hidden, absent, `GET ${suffix || 'detail'}: same status, headers and body as an unknown slug.`);
    const wrongKey = await call(detailRoute, 'GET', `/api/v1/references/${slug}${suffix}`, { slug }, { headers: { Authorization: 'Bearer wrong-synthetic-private-key-0000000' } });
    assert.deepEqual(await normalised(wrongKey, slug), absent, 'A refused key reads as anonymous.');
  }
  const library = await import('../src/lib/library');
  assert.equal(await library.getReferenceBySlug(slug), undefined, 'The library reads the public scope by default.');
  assert.equal(await library.getAssetById(marker.assetIds?.[0] ?? ''), undefined);
});

test('the administration key reads, lists, searches and counts private dossiers', async () => {
  const { slug, assetIds } = await admitMarker();
  const session = await openSession();
  for (const headers of [bearer, { Cookie: session }]) {
    const detail = await call(detailRoute, 'GET', `/api/v1/references/${slug}`, { slug }, { headers });
    assert.equal(detail.status, 200);
    assert.match(detail.headers.get('cache-control') ?? '', /private/);
    assert.match(detail.headers.get('cache-control') ?? '', /no-store/);
    const { data } = await detail.json();
    assert.equal(data.visibility, 'private');
    assert.equal(data.title, MARKER.title);
    const due = new Date(data.updatedAt);
    due.setUTCMonth(due.getUTCMonth() + 24);
    assert.equal(data.purgeDueAt, due.toISOString(), 'The purge date is 24 months after the last modification.');
    const exported = await call(detailRoute, 'GET', `/api/v1/references/${slug}?format=dossier`, { slug }, { headers });
    assert.equal(exported.status, 200);
    assert.equal((await exported.json()).operation.title, MARKER.title);
    const search = await call(listRoute, 'GET', `/api/v1/references?limit=100&q=${encodeURIComponent('témoin privée')}`, {}, { headers });
    assert.deepEqual((await search.json()).data.map((r: { slug: string }) => r.slug), [slug]);
    const listed = await (await call(listRoute, 'GET', '/api/v1/references?limit=100', {}, { headers })).json();
    assert.equal(listed.meta.pagination.total, await prisma.reference.count(), 'The key counts every dossier.');
    const brand = await call(() => import('../src/app/api/v1/brands/[slug]/route') as unknown as Promise<{ GET: Handler }>, 'GET',
      '/api/v1/brands/temoin-espace-prive', { slug: 'temoin-espace-prive' }, { headers });
    assert.equal((await brand.json()).data.operationsCount, 1);
  }
  const library = await import('../src/lib/library');
  assert.equal((await library.getReferenceBySlug(slug, 'admin'))?.visibility, 'private');
  assert.equal((await library.getAssetById(assetIds[0] ?? '', 'admin'))?.reference.slug, slug);
  assert.equal(await library.countResearchSources('admin'), await prisma.researchSource.count());
});

test('a public dossier never reveals its filiation to a private one', async () => {
  const { slug } = await admitMarker();
  const heir = dossier({ title: 'Héritière publique du témoin privé' }, [
    { direction: 'inspired_by', targetSlug: slug, targetTitle: MARKER.title, relationshipType: 'CITATION_EXPLICIT', evidence: 'Lien synthétique vers un dossier privé.' },
    { direction: 'inspired_by', targetSlug: 'apple-1984-1984', relationshipType: 'CITATION_IMPLICIT' },
  ]);
  await admitBundled();
  const created = await admit(heir);
  assert.equal(created.status, 201);
  const heirSlug = (await created.json()).slug;
  const anonymous = await call(detailRoute, 'GET', `/api/v1/references/${heirSlug}`, { slug: heirSlug });
  const anonymousText = await anonymous.text();
  for (const secret of [slug, MARKER.title]) assert.equal(anonymousText.includes(secret), false);
  assert.deepEqual(JSON.parse(anonymousText).data.filiations.map((f: { refSlug: string }) => f.refSlug), ['apple-1984-1984']);
  const exported = await (await call(detailRoute, 'GET', `/api/v1/references/${heirSlug}?format=dossier`, { slug: heirSlug })).text();
  for (const secret of [slug, MARKER.title]) assert.equal(exported.includes(secret), false, 'The public export drops the private target.');
  assert.deepEqual(JSON.parse(exported).filiations.map((f: { targetSlug: string }) => f.targetSlug), ['apple-1984-1984']);
  const admin = await (await call(detailRoute, 'GET', `/api/v1/references/${heirSlug}`, { slug: heirSlug }, { headers: bearer })).json();
  assert.deepEqual(admin.data.filiations.map((f: { refSlug: string }) => f.refSlug).sort(), ['apple-1984-1984', slug].sort());
  // The private dossier's own anonymous counterpart view (the public target) does not list it either.
  const target = await (await call(detailRoute, 'GET', '/api/v1/references/apple-1984-1984', { slug: 'apple-1984-1984' })).text();
  assert.equal(target.includes(slug), false);
});

/* ------------------------------------------------------------------------------------------ */
/* Admission and explicit visibility changes                                                  */

test('visibility is chosen at admission and kept by every later amendment', async () => {
  const before = await prisma.reference.count();
  const refused = await admit(dossier({ title: 'Visibilité inconnue' }), '?visibility=secret');
  assert.equal(refused.status, 422);
  assert.equal((await refused.json()).error, 'INVALID_VISIBILITY');
  assert.equal(await prisma.reference.count(), before, 'A refused visibility has no effect.');

  const input = dossier({ title: 'Privé conservé par amendement' });
  const created = await admit(input, '?visibility=private');
  assert.equal(created.status, 201);
  const receipt = await created.json();
  input.summary += ' Amendement synthétique sans paramètre de visibilité.';
  const amended = await admit(input, '', { ...bearer, 'If-Match': JSON.stringify(receipt.updatedAt) });
  assert.equal(amended.status, 200);
  assert.equal((await amended.json()).visibility, 'private', 'An amendment keeps the stored visibility.');
  assert.equal((await admit(input)).status, 200, 'An identical replay is harmless.');
  const publish = await admit(input, '?visibility=public');
  assert.equal(publish.status, 409);
  assert.equal((await publish.json()).error, 'VISIBILITY_CONFLICT', 'Publication is a separate, explicit action.');
  const row = await prisma.reference.findUniqueOrThrow({ where: { slug: receipt.slug } });
  assert.equal(row.visibility, 'private');
  assert.equal(row.visibilityChangedAt, null);
});

test('only the administration key changes visibility, and each change records who and when', async () => {
  const created = await admit(dossier({ title: 'Publication explicite' }), '?visibility=private');
  const { slug, updatedAt } = await created.json();
  const path = `/api/v1/references/${slug}/visibility`;
  const json = (visibility: string, headers: Record<string, string> = {}) =>
    call(visibilityRoute, 'POST', path, { slug }, { headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ visibility }) });

  for (const headers of [{}, { Authorization: 'Bearer wrong-synthetic-private-key-0000000' }] as Record<string, string>[]) {
    const refused = await json('public', headers);
    assert.equal(refused.status, 401, 'Without the key nothing is said about the dossier.');
  }
  const session = await openSession();
  assert.equal((await json('public', { Cookie: session, Origin: 'https://foreign.example.test' })).status, 403);
  assert.equal((await prisma.reference.findUniqueOrThrow({ where: { slug } })).visibility, 'private');
  assert.equal((await json('secret', bearer)).status, 422);
  assert.equal((await json('public', { ...bearer, 'If-Match': JSON.stringify('2000-01-01T00:00:00.000Z') })).status, 409, 'A stale version is refused.');

  const started = Date.now();
  const published = await json('public', { ...bearer, 'If-Match': JSON.stringify(updatedAt) });
  assert.equal(published.status, 200);
  const receipt = await published.json();
  assert.deepEqual([receipt.visibility, receipt.changed, receipt.changedBy], ['public', true, 'admin-bearer']);
  const row = await prisma.reference.findUniqueOrThrow({ where: { slug } });
  assert.equal(row.visibility, 'public');
  assert.equal(row.visibilityChangedBy, 'admin-bearer');
  assert.ok(row.visibilityChangedAt && row.visibilityChangedAt.getTime() >= started - 1000);
  assert.equal(row.updatedAt.toISOString(), updatedAt, 'A visibility change keeps the content version (ETag).');
  assert.equal((await call(detailRoute, 'GET', `/api/v1/references/${slug}`, { slug })).status, 200, 'Published: public again.');
  const anonymousView = (await (await call(detailRoute, 'GET', `/api/v1/references/${slug}`, { slug })).json()).data;
  assert.equal(anonymousView.visibilityChangedBy, undefined, 'Administration metadata stays with the key.');

  // A browser form with the session: back to the dossier page, change recorded as the session's.
  const form = await call(visibilityRoute, 'POST', path, { slug }, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: session, Origin: SITE },
    body: new URLSearchParams({ visibility: 'private' }).toString() });
  assert.equal(form.status, 303);
  assert.equal(form.headers.get('location'), `/work/${slug}?visibilite=privee`);
  assert.equal((await prisma.reference.findUniqueOrThrow({ where: { slug } })).visibilityChangedBy, 'admin-session');
  assert.equal((await call(detailRoute, 'GET', `/api/v1/references/${slug}`, { slug })).status, 404);

  const unchanged = await json('private', bearer);
  assert.equal((await unchanged.json()).changed, false);
  const history = await prisma.visibilityChange.findMany({ where: { reference: { slug } }, orderBy: { changedAt: 'asc' } });
  assert.deepEqual(history.map((h) => [h.fromVisibility, h.toVisibility, h.changedBy]),
    [['private', 'public', 'admin-bearer'], ['public', 'private', 'admin-session']]);
  assert.equal((await call(visibilityRoute, 'POST', '/api/v1/references/absente/visibility', { slug: 'absente' }, {
    headers: { 'Content-Type': 'application/json', ...bearer }, body: JSON.stringify({ visibility: 'public' }) })).status, 404);
});

test('publishing applies the admission rules to the stored dossier', async () => {
  const created = await admit(dossier({ title: 'Publication refusée' }), '?visibility=private');
  const { slug } = await created.json();
  const publish = () => call(visibilityRoute, 'POST', `/api/v1/references/${slug}/visibility`, { slug }, {
    headers: { 'Content-Type': 'application/json', ...bearer }, body: JSON.stringify({ visibility: 'public' }) });
  const stored = (await prisma.reference.findUniqueOrThrow({ where: { slug } })).sourceDossierJson ?? '';
  const invalid = JSON.parse(stored);
  invalid.sources[0].license = 'unknown';
  await prisma.reference.update({ where: { slug }, data: { sourceDossierJson: JSON.stringify(invalid) } });
  const refused = await publish();
  assert.equal(refused.status, 409);
  assert.equal((await refused.json()).error, 'PUBLICATION_REFUSED');
  await prisma.reference.update({ where: { slug }, data: { sourceDossierJson: null } });
  assert.equal((await publish()).status, 409, 'Without its canonical dossier, a reference is re-admitted before publication.');
  const row = await prisma.reference.findUniqueOrThrow({ where: { slug } });
  assert.equal(row.visibility, 'private');
  assert.equal(row.visibilityChangedAt, null);
});

/* ------------------------------------------------------------------------------------------ */
/* Retention                                                                                  */

function monthsBefore(now: Date, months: number, extraMs = 0) {
  const date = new Date(now.getTime());
  date.setUTCMonth(date.getUTCMonth() - months);
  return new Date(date.getTime() + extraMs);
}

async function databaseState() {
  const tables = ['reference', 'asset', 'structuralAxis', 'performanceMetric', 'researchSource', 'filiation',
    'expertAnnotation', 'referenceRevision', 'visibilityChange', 'privatePurgeRun'] as const;
  const counts: Record<string, number> = {};
  for (const table of tables) counts[table] = await (prisma[table] as unknown as { count(): Promise<number> }).count();
  const references = await prisma.reference.findMany({ orderBy: { id: 'asc' } });
  return { counts, references };
}

test('the retention purge removes only private dossiers untouched for 24 months; dry-run changes nothing', async () => {
  const retention = await import('../src/server/private-retention');
  await admitBundled();
  const now = new Date(Math.floor(Date.now() / 1000) * 1000);
  const make = async (title: string, query: string) => {
    const created = await admit(dossier({ title }), query);
    assert.equal(created.status, 201);
    return (await created.json()).slug as string;
  };
  // Expired: private, last modified 25 months ago, with every kind of dependent record.
  const expired = await make('Privé échu', '');
  await admit(dossier({ title: 'Privé échu' }, [{ direction: 'inspired_by', targetSlug: 'apple-1984-1984', relationshipType: 'CITATION_IMPLICIT' }]), '',
    { ...bearer, 'If-Match': JSON.stringify((await prisma.reference.findUniqueOrThrow({ where: { slug: expired } })).updatedAt.toISOString()) });
  await call(visibilityRoute, 'POST', `/api/v1/references/${expired}/visibility`, { slug: expired }, {
    headers: { 'Content-Type': 'application/json', ...bearer }, body: JSON.stringify({ visibility: 'private' }) });
  await prisma.expertAnnotation.create({ data: { referenceId: `ref_${expired}`, annotatorName: 'Synthetic', type: 'CRITIQUE', content: 'Annotation synthétique à purger.' } });
  await prisma.reference.update({ where: { slug: expired }, data: { updatedAt: monthsBefore(now, 25), visibilityChangedAt: monthsBefore(now, 25) } });
  await prisma.visibilityChange.updateMany({ where: { referenceId: `ref_${expired}` }, data: { changedAt: monthsBefore(now, 25) } });
  // Due exactly now: purged ("24 months after its last modification").
  const due = await make('Privé à échéance', '?visibility=private');
  await prisma.reference.update({ where: { slug: due }, data: { updatedAt: monthsBefore(now, 24) } });
  // Kept: one minute short of 24 months; recently made private; old but public.
  const recent = await make('Privé récent', '?visibility=private');
  await prisma.reference.update({ where: { slug: recent }, data: { updatedAt: monthsBefore(now, 24, 60_000) } });
  const madePrivate = await make('Rendu privé récemment', '');
  await prisma.reference.update({ where: { slug: madePrivate }, data: { updatedAt: monthsBefore(now, 30) } });
  const change = await call(visibilityRoute, 'POST', `/api/v1/references/${madePrivate}/visibility`, { slug: madePrivate }, {
    headers: { 'Content-Type': 'application/json', ...bearer }, body: JSON.stringify({ visibility: 'private' }) });
  assert.equal(change.status, 200);
  const oldPublic = await make('Public ancien', '');
  await prisma.reference.update({ where: { slug: oldPublic }, data: { updatedAt: monthsBefore(now, 30) } });
  const legacyPublic = 'apple-1984-1984';
  await prisma.reference.update({ where: { slug: legacyPublic }, data: { updatedAt: monthsBefore(now, 40) } });

  const before = await databaseState();
  const preview = await retention.purgeExpiredPrivateDossiers({ mode: 'dry-run', now, trigger: 'test' });
  assert.equal(preview.mode, 'dry-run');
  assert.equal(preview.retentionMonths, 24);
  assert.deepEqual(preview.candidates.map((c) => c.slug).sort(), [due, expired].sort());
  assert.equal(preview.purgedCount, 0);
  assert.deepEqual(await databaseState(), before, 'A dry-run writes nothing, not even its own log.');

  const report = await retention.purgeExpiredPrivateDossiers({ mode: 'purge', now, trigger: 'test' });
  assert.equal(report.purgedCount, 2);
  for (const slug of [expired, due]) {
    const id = `ref_${slug}`;
    assert.equal(await prisma.reference.count({ where: { id } }), 0);
    for (const table of ['asset', 'structuralAxis', 'performanceMetric', 'researchSource', 'expertAnnotation', 'referenceRevision', 'visibilityChange'] as const) {
      assert.equal(await (prisma[table] as unknown as { count(args: unknown): Promise<number> }).count({ where: { referenceId: id } }), 0, `${table} of ${slug}`);
    }
    assert.equal(await prisma.filiation.count({ where: { OR: [{ fromRefId: id }, { toRefId: id }] } }), 0);
  }
  for (const slug of [recent, madePrivate, oldPublic, legacyPublic, ...bundled.slugs]) {
    assert.equal(await prisma.reference.count({ where: { slug } }), 1, `${slug} is kept.`);
  }
  const runs = await prisma.privatePurgeRun.findMany();
  assert.equal(runs.length, 1, 'Each real purge is logged once.');
  assert.deepEqual([runs[0]?.purgedCount, runs[0]?.trigger, runs[0]?.retentionMonths], [2, 'test', 24]);
  assert.equal(JSON.stringify(runs).includes(expired), false, 'The log keeps no trace of the purged dossier.');
  assert.equal((await retention.purgeExpiredPrivateDossiers({ mode: 'purge', now, trigger: 'test' })).purgedCount, 0);
  const listed = await (await call(listRoute, 'GET', '/api/v1/references?limit=100')).json();
  for (const slug of bundled.slugs) assert.ok(listed.data.some((r: { slug: string }) => r.slug === slug), `${slug} still listed.`);
});

test('the purge date is 24 calendar months after the last modification', async () => {
  const { privatePurgeDueAt, lastModificationOf } = await import('../src/server/private-retention');
  assert.equal(privatePurgeDueAt(new Date('2026-11-12T08:30:00.000Z')).toISOString(), '2028-11-12T08:30:00.000Z');
  assert.equal(privatePurgeDueAt(new Date('2028-02-29T00:00:00.000Z')).toISOString(), '2030-02-28T00:00:00.000Z');
  const updatedAt = new Date('2025-01-01T00:00:00.000Z');
  const changed = new Date('2026-06-01T00:00:00.000Z');
  assert.equal(lastModificationOf({ updatedAt, visibilityChangedAt: changed }).toISOString(), changed.toISOString());
  assert.equal(lastModificationOf({ updatedAt: changed, visibilityChangedAt: updatedAt }).toISOString(), changed.toISOString());
  assert.equal(lastModificationOf({ updatedAt, visibilityChangedAt: null }).toISOString(), updatedAt.toISOString());
});

test('the purge is an administration action, explicit about its mode', async () => {
  const before = await databaseState();
  const post = (body: unknown, headers: Record<string, string> = bearer) =>
    call(purgeRoute, 'POST', '/api/admin/private-purge', {}, { headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  assert.equal((await post({ mode: 'purge' }, {})).status, 401);
  const missing = await post({});
  assert.equal(missing.status, 422);
  assert.equal((await missing.json()).error, 'MODE_REQUIRED');
  const preview = await post({ mode: 'dry-run' });
  assert.equal(preview.status, 200);
  assert.equal((await preview.json()).mode, 'dry-run');
  assert.deepEqual(await databaseState(), before);
  const purged = await post({ mode: 'purge' });
  assert.equal(purged.status, 200);
  const report = await purged.json();
  assert.equal(report.trigger, 'admin-bearer');
  assert.equal(await prisma.privatePurgeRun.count(), (before.counts.privatePurgeRun ?? 0) + 1);
});

test('the daily purge runs inside the server unless switched off', async () => {
  const { startPrivatePurgeSchedule } = await import('../src/server/private-purge-schedule');
  const timers: { kind: string; delay: number; run: () => void }[] = [];
  const fake = {
    setTimeout: (run: () => void, delay: number) => { timers.push({ kind: 'timeout', delay, run }); return { unref() {} }; },
    setInterval: (run: () => void, delay: number) => { timers.push({ kind: 'interval', delay, run }); return { unref() {} }; },
    clearTimeout: () => {}, clearInterval: () => {},
  };
  const runs: unknown[] = [];
  const off = startPrivatePurgeSchedule({ env: { ARGOS_PRIVATE_PURGE: 'off' }, timers: fake, run: async (options) => { runs.push(options); }, log: () => {} });
  assert.equal(off.enabled, false);
  assert.equal(timers.length, 0);
  const on = startPrivatePurgeSchedule({ env: {}, timers: fake, run: async (options) => { runs.push(options); }, log: () => {} });
  assert.equal(on.enabled, true);
  const first = timers.find((t) => t.kind === 'timeout');
  assert.ok(first && first.delay > 0);
  first.run();
  await new Promise((resolve) => setImmediate(resolve));
  const daily = timers.find((t) => t.kind === 'interval');
  assert.equal(daily?.delay, 24 * 60 * 60 * 1000);
  assert.deepEqual(runs, [{ mode: 'purge', trigger: 'scheduler' }]);
  on.stop();
});

/* ------------------------------------------------------------------------------------------ */
/* Static guard                                                                               */

function files(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

test('pages and routes read the library through its visibility scope only', () => {
  const app = join('src', 'app');
  const direct: string[] = [];
  for (const path of files(app)) {
    const source = readFileSync(path, 'utf8');
    if (/from ['"]@\/lib\/db['"]/.test(source) || /\bprisma\./.test(source)) direct.push(relative(app, path).split(sep).join('/'));
  }
  assert.deepEqual(direct, [], 'The database is read through src/lib/library.ts, whose default scope is public.');
  // Crawler-facing surfaces never use the administration scope, even for an open session.
  for (const crawler of ['sitemap.ts', 'robots.ts', 'work/[slug]/opengraph-image.tsx']) {
    const source = readFileSync(join(app, crawler), 'utf8');
    assert.doesNotMatch(source, /'admin'|ReadScope|readScope/, `${crawler} reads the public scope only.`);
  }
});
