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
  console.info(JSON.stringify({ builtRuntime: true, anonymousWrite401: true, newReference200: true, unknownComposite: null, assetLicencePreserved: true, privateContactExcluded: true, amendmentFreshWithoutBuild: true, staleVersion409: true, adminPageWithoutSession303: true, signedSessionCookie: true, sessionWrite201: true, sessionWriteWithoutOrigin403: true, publicReads200: true }));
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
