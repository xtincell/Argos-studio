// Exercise the built server after its build, on a new owned database.
// This catches routes which build successfully but freeze/reject new references.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const directory = await mkdtemp(join(tmpdir(), 'argos-runtime-'));
const listener = createServer();
await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
const port = listener.address().port;
await new Promise(resolve => listener.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const key = 'synthetic-editorial-library-runtime-receipt-key';
const env = { ...process.env, DATABASE_URL: `file:${join(directory, 'receipt.db')}`,
  ARGOS_ADMIN_KEY: key, NEXT_PUBLIC_SITE_URL: origin,
  ANTHROPIC_API_KEY: '', VOYAGE_API_KEY: '', NEXT_TELEMETRY_DISABLED: '1' };
let server;
let logs = '';
try {
  await writeFile(join(directory, 'receipt.db'), '');
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env, stdio: 'pipe' });
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', chunk => { logs = (logs + chunk).slice(-5000); });
  server.stderr.on('data', chunk => { logs = (logs + chunk).slice(-5000); });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error('Owned runtime exited before readiness.');
    try { ready = (await fetch(`${origin}/api/v1`)).ok; } catch { /* not listening yet */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Built server must become ready.');
  const post = (body, version, authorized = true) => fetch(`${origin}/api/v1/ingest/dossier`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin,
      ...(authorized ? { Authorization: `Bearer ${key}` } : {}), ...(version ? { 'If-Match': JSON.stringify(version) } : {}) }, body: JSON.stringify(body),
  });
  assert.equal((await post({}, undefined, false)).status, 401);
  const dossier = JSON.parse(await readFile('public/dossier-example.json', 'utf8'));
  Object.assign(dossier.operation, { title: 'Synthetic runtime receipt', brandEmitter: 'Synthetic receipt' });
  dossier.researcher = { name: 'Synthetic receipt only', contact: 'private-receipt@example.test' };
  dossier.sources = [{ url: 'https://example.test/receipt', title: 'Synthetic citation', accessedDate: '2026-10-19', license: 'fair-use', role: 'primary' }];
  dossier.assets = [{ kind: 'TEXT', function: 'HEADLINE', role: 'HERO', url: '', text: 'Synthetic exact text', aspectRatio: '16:9', sourceIndex: 0, sourceLicense: 'fair-use' }];
  dossier.axes = [{ name: 'PROMISE_STRATEGY', value: 'Synthetic observation', confidence: 0.5, evidence: 'Synthetic exact text', sourceIndex: 0 }];
  dossier.performance = { metrics: [] };
  dossier.patternObservation = undefined;
  dossier.significance = undefined;
  dossier.victoryTypes = [];
  dossier.filiations = [];
  dossier.summary = 'Synthetic public reference for receipt of the built server.';
  const created = await post(dossier);
  assert.equal(created.status, 201);
  const receipt = await created.json();
  const route = `${origin}/work/${receipt.slug}`;
  const first = await fetch(route);
  assert.equal(first.status, 200, 'A reference admitted after build must open.');
  const firstHtml = await first.text();
  assert.ok(firstHtml.includes(dossier.summary));
  for (const invented of ['Casting non-professionnel', 'On ne vend rien.', 'la posture choisie paye commercialement', 'Performance solide sur toute la ligne']) assert.ok(!firstHtml.includes(invented), 'Missing analysis must never become a template claim.');
  const current = await (await fetch(`${origin}/api/v1/references/${receipt.slug}`)).json();
  assert.equal(current.data.performance.composite, null);
  assert.equal(current.data.assets[0].sourceLicense, 'fair-use');
  const exported = await fetch(`${origin}/api/v1/references/${receipt.slug}?format=dossier`);
  assert.equal(exported.status, 200);
  const publicDossier = await exported.json();
  assert.equal(publicDossier.researcher.contact, undefined);
  assert.deepEqual(publicDossier.assets, dossier.assets);
  publicDossier.summary = 'Amended synthetic reference visible without rebuilding the server.';
  const amended = await post(publicDossier, receipt.updatedAt);
  assert.equal(amended.status, 200);
  assert.ok((await (await fetch(route)).text()).includes(publicDossier.summary));
  publicDossier.summary = 'Stale competing amendment must never replace current editorial work.';
  assert.equal((await post(publicDossier, receipt.updatedAt)).status, 409);
  assert.equal((await (await fetch(`${origin}/api/v1/references/${receipt.slug}`)).json()).data.summary, 'Amended synthetic reference visible without rebuilding the server.');
  // Single administration key: pages need a session, the session is a signed cookie, reads stay public.
  const manual = { redirect: 'manual' };
  const anonymousAdmin = await fetch(`${origin}/admin/ingest?slug=${receipt.slug}`, manual);
  assert.equal(anonymousAdmin.status, 303, 'An administration page without session is not rendered.');
  // Next names every loopback address `localhost`; behind the proxy the forwarded public host is kept.
  const loginLocation = new URL(anonymousAdmin.headers.get('location'));
  assert.equal(`${loginLocation.pathname}${loginLocation.search}`, `/admin/login?next=${encodeURIComponent(`/admin/ingest?slug=${receipt.slug}`)}`);
  assert.ok(!(await anonymousAdmin.text()).includes('Soumettre le dossier'));
  const loginPage = await fetch(`${origin}/admin/login`, manual);
  assert.equal(loginPage.status, 200);
  assert.ok((await loginPage.text()).includes('name="key"'));
  const login = (value) => fetch(`${origin}/api/admin/login`, { ...manual, method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: origin }, body: new URLSearchParams({ key: value, next: '/admin/ingest' }) });
  const refusedLogin = await login('wrong-synthetic-runtime-key-0000000');
  assert.equal(refusedLogin.status, 303);
  assert.match(refusedLogin.headers.get('location') ?? '', /^\/admin\/login\?erreur=cle/);
  assert.equal(refusedLogin.headers.get('set-cookie'), null);
  const opened = await login(key);
  assert.equal(opened.status, 303);
  const setCookie = opened.headers.get('set-cookie') ?? '';
  for (const attribute of [/HttpOnly/i, /Secure/i, /SameSite=Strict/i, /Path=\//i]) assert.match(setCookie, attribute);
  assert.ok(!setCookie.includes(key), 'The key never travels back in the cookie.');
  const session = setCookie.split(';')[0];
  const adminPage = await fetch(`${origin}/admin/ingest`, { ...manual, headers: { Cookie: session } });
  assert.equal(adminPage.status, 200);
  assert.ok((await adminPage.text()).includes('Fermer la session'));
  const sessionPost = (headers, title) => fetch(`${origin}/api/v1/ingest/dossier`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: session, ...headers },
    body: JSON.stringify({ ...dossier, operation: { ...dossier.operation, title } }) });
  assert.equal((await sessionPost({ Origin: origin }, 'Synthetic runtime session write')).status, 201);
  assert.equal((await sessionPost({}, 'Synthetic cookie write without origin')).status, 403);
  const closed = await fetch(`${origin}/api/admin/logout`, { ...manual, method: 'POST', headers: { Origin: origin, Cookie: session } });
  assert.equal(closed.status, 303);
  assert.match(closed.headers.get('set-cookie') ?? '', /argos_admin=;.*Max-Age=0/i);
  for (const route of ['/api/v1', '/api/v1/references', `/api/v1/references/${receipt.slug}`, `/work/${receipt.slug}`]) {
    assert.equal((await fetch(`${origin}${route}`)).status, 200, `${route} stays public.`);
  }
  // An address the library cannot serve answers HTTP 404 with the not-found page, on every kind
  // of dynamic page — not 200, which a crawler, a link checker or a cache reads as a page.
  const notFoundPage = 'Pas encore dans la';
  for (const route of ['/work/operation-inconnue-temoin', '/work/operation-inconnue-temoin/inspect',
    '/asset/a_operation-inconnue-temoin_00_headline', '/brand/marque-inconnue-temoin', '/agency/agence-inconnue-temoin',
    '/market/marche-inconnu-temoin', '/sector/secteur-inconnu-temoin', '/year/1906', '/year/annee-inconnue',
    '/award/victoire-inconnue', '/award/cannes-lions-gold', '/by/dimension-inconnue/valeur', '/by/axis/axe-inconnu',
    '/by/pillar/x', '/route-absente-temoin']) {
    const response = await fetch(`${origin}${route}`);
    assert.equal(response.status, 404, `${route} answers HTTP 404.`);
    assert.ok((await response.text()).includes(notFoundPage), `${route} renders the not-found page.`);
  }
  const known = [`/work/${receipt.slug}/inspect`, `/asset/a_${receipt.slug}_00_headline`, `/brand/${dossier.operation.brandEmitter.toLowerCase().replaceAll(' ', '-')}`];
  for (const route of known) assert.equal((await fetch(`${origin}${route}`)).status, 200, `${route} opens.`);
  // Private space (ADR-0010): without the key a private dossier does not exist, on any surface.
  const marker = 'Opération confidentielle témoin';
  const markerBrand = 'Marque confidentielle témoin';
  const privateDossier = { ...dossier, operation: { ...dossier.operation, title: marker, brandEmitter: markerBrand,
    agencyCreator: 'Agence confidentielle témoin', sector: 'Secteur confidentiel témoin', marketPrimary: 'Marché confidentiel témoin',
    marketsSecondary: [], emissionYear: 1907 } };
  const before = {};
  const surfaces = ['/', '/works', '/browse', '/patterns', '/glossary', '/assets', '/brand', '/sector', '/market', '/agency', '/year',
    '/award', `/search?q=${encodeURIComponent('confidentielle')}`, '/sitemap.xml', '/api/v1/references?limit=100',
    `/api/v1/references?limit=100&q=${encodeURIComponent('confidentielle')}`, '/api/v1/brands', '/api/v1/years', '/api/v1/assets?limit=200'];
  for (const route of surfaces) before[route] = await (await fetch(`${origin}${route}`)).text();
  const createdPrivate = await fetch(`${origin}/api/v1/ingest/dossier?visibility=private`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(privateDossier) });
  assert.equal(createdPrivate.status, 201);
  const privateReceipt = await createdPrivate.json();
  assert.equal(privateReceipt.visibility, 'private');
  const ps = privateReceipt.slug;
  const asset = (receiptSlug) => `a_${receiptSlug}_00_${privateDossier.assets[0].function.toLowerCase()}`;
  const unknown = 'operation-inconnue-de-la-bibliotheque-privee';
  // A page is streamed: its chunks may interleave differently from one request to the next. It
  // is compared by what it says — status, title, robots, RSC rows and visible words — not by the
  // order in which the server flushed them. JSON and images are compared byte for byte.
  const canonical = (body, type) => {
    if (!(type ?? '').includes('text/html')) return body;
    const rows = [...body.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)]
      .map((match) => JSON.parse(match[1])).join('').split('\n').filter(Boolean).sort();
    const markup = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
    return { title: /<title>([^<]*)<\/title>/.exec(markup)?.[1], robots: /<meta name="robots" content="([^"]*)"/.exec(markup)?.[1],
      rows, words: markup.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).sort(),
      notFound: rows.some((row) => row.includes('NEXT_HTTP_ERROR_FALLBACK;404')) && rows.some((row) => row.includes('Pas encore dans la')) };
  };
  const normalised = async (response, slug) => {
    const type = response.headers.get('content-type');
    const body = Buffer.from(await response.arrayBuffer()).toString('latin1').replaceAll(slug, '<slug>');
    return { status: response.status, type, body: canonical(body, type) };
  };
  for (const [hidden, absent] of [
    [`/work/${ps}`, `/work/${unknown}`], [`/work/${ps}/inspect`, `/work/${unknown}/inspect`],
    [`/asset/${asset(ps)}`, `/asset/${asset(unknown)}`], [`/work/${ps}/opengraph-image`, `/work/${unknown}/opengraph-image`],
    [`/api/v1/references/${ps}`, `/api/v1/references/${unknown}`], [`/api/v1/references/${ps}?format=dossier`, `/api/v1/references/${unknown}?format=dossier`],
    ['/brand/marque-confidentielle-temoin', '/brand/marque-inconnue-temoin'], ['/year/1907', '/year/1906'],
    ['/agency/agence-confidentielle-temoin', '/agency/agence-inconnue-temoin'],
    ['/sector/secteur-confidentiel-temoin', '/sector/secteur-inconnu-temoin'],
    ['/market/marche-confidentiel-temoin', '/market/marche-inconnu-temoin'],
  ]) {
    const slugOf = (route) => (route.includes(ps) ? ps : route.includes(unknown) ? unknown : '');
    const a = await normalised(await fetch(`${origin}${hidden}`), slugOf(hidden) || hidden.split('/').pop());
    const b = await normalised(await fetch(`${origin}${absent}`), slugOf(absent) || absent.split('/').pop());
    assert.deepEqual(a, b, `${hidden} answers exactly like ${absent}.`);
    // The API and the pages answer HTTP 404; a page with the not-found page of an unknown
    // address. The Open Graph image stays the generic card of an unknown slug.
    if (hidden.includes('opengraph-image')) continue;
    assert.equal(a.status, 404, `${hidden} is not found without the key.`);
    if (!hidden.startsWith('/api/')) assert.equal(a.body.notFound, true, `${hidden} renders the not-found page.`);
  }
  for (const route of surfaces) {
    const text = await (await fetch(`${origin}${route}`)).text();
    for (const secret of [ps, marker, markerBrand]) assert.ok(!text.includes(secret), `${route} must not reveal the private dossier.`);
    // Search echoes its query and the sitemap dates itself per request: absence is checked above.
    if (!route.startsWith('/search') && !['/', '/sitemap.xml'].includes(route)) assert.equal(text, before[route], `${route} is unchanged by a private dossier.`);
  }
  // The key reads it: Bearer for a server client, the session for a browser.
  const keyRead = await fetch(`${origin}/api/v1/references/${ps}`, { headers: { Authorization: `Bearer ${key}` } });
  assert.equal(keyRead.status, 200);
  assert.match(keyRead.headers.get('cache-control') ?? '', /private, no-store/);
  assert.equal((await keyRead.json()).data.visibility, 'private');
  const reopened = (await login(key)).headers.get('set-cookie').split(';')[0];
  const adminRead = await fetch(`${origin}/work/${ps}`, { ...manual, headers: { Cookie: reopened } });
  assert.equal(adminRead.status, 200);
  assert.match(adminRead.headers.get('cache-control') ?? '', /no-store/);
  const adminHtml = await adminRead.text();
  for (const expected of [marker, 'Publier le dossier', 'Purge prévue le', 'noindex']) assert.ok(adminHtml.includes(expected), `The session reads ${expected}.`);
  // Every page of the private dossier opens for the session (existence resolved in its scope).
  for (const route of [`/work/${ps}/inspect`, `/asset/${asset(ps)}`, '/brand/marque-confidentielle-temoin', '/year/1907',
    '/agency/agence-confidentielle-temoin', '/sector/secteur-confidentiel-temoin', '/market/marche-confidentiel-temoin']) {
    const read = await fetch(`${origin}${route}`, { ...manual, headers: { Cookie: reopened } });
    assert.equal(read.status, 200, `${route} opens for the session.`);
    assert.ok((await read.text()).includes(marker), `${route} shows the private dossier to the session.`);
  }
  for (const route of ['/works', `/search?q=${encodeURIComponent('confidentielle')}`, '/admin/prive']) {
    assert.ok((await (await fetch(`${origin}${route}`, { headers: { Cookie: reopened } })).text()).includes(marker), `${route} lists it for the session.`);
  }
  assert.ok(!(await (await fetch(`${origin}/sitemap.xml`, { headers: { Cookie: reopened } })).text()).includes(ps), 'The sitemap never lists a private dossier.');
  // Retention purge: explicit, with a dry-run that changes nothing.
  const purgeCommand = (args) => execFileSync(process.execPath, ['../docker/purge-private.cjs', ...args],
    { env: { ...env, ARGOS_URL: origin }, encoding: 'utf8' });
  assert.match(purgeCommand(['--dry-run']), /aperçu/i);
  assert.equal((await fetch(`${origin}/api/v1/references/${ps}`, { headers: { Authorization: `Bearer ${key}` } })).status, 200);
  assert.throws(() => execFileSync(process.execPath, ['../docker/purge-private.cjs'], { env: { ...env, ARGOS_URL: origin }, stdio: 'pipe' }),
    'Without an explicit mode the command refuses.');
  // Explicit publication from the dossier page, then readable by all.
  const published = await fetch(`${origin}/api/v1/references/${ps}/visibility`, { ...manual, method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: origin, Cookie: reopened },
    body: new URLSearchParams({ visibility: 'public', version: privateReceipt.updatedAt }) });
  assert.equal(published.status, 303);
  assert.equal(published.headers.get('location'), `/work/${ps}?visibilite=publique`);
  const publicRead = await fetch(`${origin}/work/${ps}`);
  assert.equal(publicRead.status, 200);
  assert.ok((await publicRead.text()).includes(marker));
  console.info(JSON.stringify({ builtRuntime: true, anonymousWrite401: true, newReference200: true, unknownComposite: null, assetLicencePreserved: true, privateContactExcluded: true, amendmentFreshWithoutBuild: true, staleVersion409: true, adminPageWithoutSession303: true, signedSessionCookie: true, sessionWrite201: true, sessionWriteWithoutOrigin403: true, publicReads200: true, unknownPages404: true,
    privateLikeUnknown: true, privatePagesWithSession200: true, privateAbsentFromAnonymousSurfaces: true, privateReadWithKey: true, purgeDryRun: true, explicitPublication303: true }));
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  if (server && server.exitCode === null) {
    const exited = new Promise(resolve => server.once('exit', resolve));
    server.kill('SIGTERM');
    const deadline = setTimeout(() => server.kill('SIGKILL'), 10000);
    await exited;
    clearTimeout(deadline);
  }
  await rm(directory, { recursive: true, force: true });
}
