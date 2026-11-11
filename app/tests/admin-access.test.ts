// Single administration key (arbitrage 5.8): writes, administration pages and routes require
// ARGOS_ADMIN_KEY, by Bearer header or by a signed browser session; public reads stay public.
// Every write is confined to this disposable database.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { after, before, test } from 'node:test';

const directory = mkdtempSync(join(tmpdir(), 'argos-admin-'));
writeFileSync(join(directory, 'admin.db'), '');
process.env.DATABASE_URL = `file:${join(directory, 'admin.db')}`;
const KEY = 'synthetic-single-admin-key-ar3-20261111';
process.env.ARGOS_ADMIN_KEY = KEY;
Reflect.deleteProperty(process.env, 'ARGOS_INGEST_API_KEY');
Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_SITE_URL');
const { NextRequest } = await import('next/server');
const { prisma } = await import('../src/lib/db');

const SITE = 'http://argos.example.test';
const ingestRoute = () => import('../src/app/api/v1/ingest/dossier/route');
const loginRoute = () => import('../src/app/api/admin/login/route');
const access = () => import('../src/server/admin-access');

before(() => {
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: process.env, stdio: 'pipe' });
});

after(async () => {
  await prisma.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

function withEnv<T>(values: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
  const previous = Object.fromEntries(Object.keys(values).map((name) => [name, process.env[name]]));
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) Reflect.deleteProperty(process.env, name);
    else process.env[name] = value;
  }
  return run().finally(() => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) Reflect.deleteProperty(process.env, name);
      else process.env[name] = value;
    }
  });
}

function dossier(title: string): string {
  const input = JSON.parse(readFileSync('public/dossier-example.json', 'utf8'));
  input.operation.title = title;
  input.operation.brandEmitter = 'Synthetic admin receipt';
  input.filiations = [];
  return JSON.stringify(input);
}

function write(headers: Record<string, string>, body = 'not-json') {
  return new NextRequest(`${SITE}/api/v1/ingest/dossier`, { method: 'POST', headers, body });
}

function loginForm(key: string, next = '/admin/ingest', headers: Record<string, string> = { Origin: SITE }) {
  return new NextRequest(`${SITE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams({ key, next }).toString(),
  });
}

async function openSession(): Promise<string> {
  const { POST } = await loginRoute();
  const response = await POST(loginForm(KEY));
  assert.equal(response.status, 303);
  const cookie = response.cookies.get('argos_admin');
  assert.ok(cookie?.value, 'A valid key must open a session.');
  return cookie.value;
}

test('ARGOS_ADMIN_KEY authorises a write by Bearer header, checked before the body', async () => {
  const { POST } = await ingestRoute();
  assert.equal((await POST(write({ Authorization: `Bearer ${KEY}` }))).status, 400, 'Authorised: the invalid body is then refused.');
  const created = await POST(write({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, dossier('Clé unique par en-tête')));
  assert.equal(created.status, 201);
  const before = await prisma.reference.count();
  const refusals: Record<string, string>[] = [{}, { Authorization: 'Bearer wrong-synthetic-admin-key-000000' }, { Authorization: KEY }];
  for (const headers of refusals) {
    const refused = await POST(write(headers, dossier('Écriture refusée')));
    assert.equal(refused.status, 401);
    assert.equal((await refused.json()).error, 'ADMIN_UNAUTHORIZED');
  }
  assert.equal(await prisma.reference.count(), before, 'A refused write has no effect.');
});

test('the former ARGOS_INGEST_API_KEY alone leaves administration closed', async () => {
  await withEnv({ ARGOS_ADMIN_KEY: undefined, ARGOS_INGEST_API_KEY: KEY }, async () => {
    const { POST } = await ingestRoute();
    const refused = await POST(write({ Authorization: `Bearer ${KEY}` }));
    assert.equal(refused.status, 503);
    assert.equal((await refused.json()).error, 'ADMIN_NOT_CONFIGURED');
  });
});

test('without a configured key (or with a short one) administration is closed, never open', async () => {
  for (const configured of [undefined, '', 'short-key-under-24'] as const) {
    await withEnv({ ARGOS_ADMIN_KEY: configured }, async () => {
      const { POST } = await ingestRoute();
      assert.equal((await POST(write({}))).status, 503);
      assert.equal((await POST(write({ Authorization: `Bearer ${configured ?? ''}` }))).status, 503);
      const login = await loginRoute();
      const refused = await login.POST(loginForm(configured ?? ''));
      assert.equal(refused.status, 303);
      assert.match(refused.headers.get('location') ?? '', /^\/admin\/login\?erreur=fermee/);
      assert.equal(refused.cookies.get('argos_admin'), undefined, 'A closed administration opens no session.');
    });
  }
});

test('the login form opens an HttpOnly, Secure, SameSite=Strict signed session without the key', async () => {
  const { POST } = await loginRoute();
  const response = await POST(loginForm(KEY, '/admin/ingest?slug=reference-a-corriger'));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/admin/ingest?slug=reference-a-corriger');
  const header = response.headers.get('set-cookie') ?? '';
  assert.match(header, /^argos_admin=/);
  for (const attribute of [/;\s*HttpOnly/i, /;\s*Secure/i, /;\s*SameSite=strict/i, /;\s*Path=\//i, /;\s*Max-Age=28800/i]) {
    assert.match(header, attribute);
  }
  const value = response.cookies.get('argos_admin')?.value ?? '';
  assert.equal(value.includes(KEY), false, 'The cookie never carries the key.');
  const { verifyAdminSession } = await access();
  assert.equal(verifyAdminSession(value, KEY), true);
});

test('an oversized login request is refused without reading it whole', async () => {
  const { POST } = await loginRoute();
  const oversized = await POST(new NextRequest(`${SITE}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: SITE },
    body: new URLSearchParams({ key: KEY, padding: 'x'.repeat(10_000) }).toString(),
  }));
  assert.equal(oversized.cookies.get('argos_admin'), undefined);
  assert.match(oversized.headers.get('location') ?? '', /^\/admin\/login\?erreur=formulaire/);
});

test('a refused key opens no session, by form or by JSON', async () => {
  const { POST } = await loginRoute();
  const form = await POST(loginForm('wrong-synthetic-admin-key-000000'));
  assert.equal(form.status, 303);
  assert.match(form.headers.get('location') ?? '', /^\/admin\/login\?erreur=cle/);
  assert.equal(form.cookies.get('argos_admin'), undefined);
  const json = await POST(new NextRequest(`${SITE}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'wrong-synthetic-admin-key-000000' }),
  }));
  assert.equal(json.status, 401);
  assert.equal(json.cookies.get('argos_admin'), undefined);
  const foreign = await POST(loginForm(KEY, '/admin/ingest', { Origin: 'https://foreign.example.test' }));
  assert.match(foreign.headers.get('location') ?? '', /erreur=origine/);
  assert.equal(foreign.cookies.get('argos_admin'), undefined);
});

test('a session authorises a browser write from this library only', async () => {
  const session = await openSession();
  const { POST } = await ingestRoute();
  const cookie = `argos_admin=${session}`;
  const created = await POST(write({ Cookie: cookie, Origin: SITE, 'Content-Type': 'application/json' }, dossier('Écriture par session')));
  assert.equal(created.status, 201);
  const before = await prisma.reference.count();
  const withoutOrigin = await POST(write({ Cookie: cookie, 'Content-Type': 'application/json' }, dossier('Session sans origine')));
  assert.equal(withoutOrigin.status, 403);
  const foreign = await POST(write({ Cookie: cookie, Origin: 'https://foreign.example.test' }, dossier('Session étrangère')));
  assert.equal(foreign.status, 403);
  assert.equal(await prisma.reference.count(), before);
});

test('a tampered, expired, future or rotated session is refused', async () => {
  const { createAdminSession, verifyAdminSession, ADMIN_SESSION_MAX_AGE } = await access();
  const now = Date.now();
  const { value } = createAdminSession(KEY, now);
  const tampered = `${value.slice(0, -1)}${value.endsWith('A') ? 'B' : 'A'}`;
  assert.equal(verifyAdminSession(tampered, KEY, now), false);
  assert.equal(verifyAdminSession(value, KEY, now + (ADMIN_SESSION_MAX_AGE + 1) * 1000), false, 'Expired.');
  assert.equal(verifyAdminSession(createAdminSession(KEY, now + 3600_000).value, KEY, now), false, 'Further than one lifetime ahead.');
  assert.equal(verifyAdminSession(value, 'another-synthetic-admin-key-rotated', now), false, 'Rotating the key ends the session.');
  assert.equal(verifyAdminSession(`${value}x`, KEY, now), false);
  const { POST } = await ingestRoute();
  const refused = await POST(write({ Cookie: `argos_admin=${tampered}`, Origin: SITE }));
  assert.equal(refused.status, 401);
});

test('the key comparison refuses prefixes, empty values and lookalikes', async () => {
  const { isAdminKey } = await access();
  assert.equal(isAdminKey(KEY, KEY), true);
  for (const candidate of ['', KEY.slice(0, -1), `${KEY} `, KEY.toUpperCase(), null, undefined]) {
    assert.equal(isAdminKey(candidate, KEY), false);
  }
});

test('a login only leads to an administration page of this library', async () => {
  const { safeAdminPath } = await access();
  assert.equal(safeAdminPath('/admin/ingest?slug=a'), '/admin/ingest?slug=a');
  assert.equal(safeAdminPath('/admin'), '/admin');
  for (const unsafe of ['https://evil.example/admin', '//evil.example/admin', '/\\evil.example', '/works', '/admin/login', '/admin/login?next=/admin',
    '/admin//evil', '/admin/../works', '/admin/%2e%2e/works', 'admin/ingest', '/admin\nLocation: x', undefined, 42]) {
    assert.equal(safeAdminPath(unsafe), '/admin/ingest');
  }
});

test('administration pages send a browser without session to the login page', async () => {
  const { middleware } = await import('../src/middleware');
  const anonymous = middleware(new NextRequest(`${SITE}/admin/ingest?slug=reference-a-corriger`));
  assert.equal(anonymous.status, 303);
  assert.equal(anonymous.headers.get('location'), `${SITE}/admin/login?next=${encodeURIComponent('/admin/ingest?slug=reference-a-corriger')}`);
  // Behind the TLS proxy the public address is the forwarded one, not the internal listener.
  const proxied = middleware(new NextRequest('http://0.0.0.0:3000/admin/ingest', {
    headers: { Host: '0.0.0.0:3000', 'X-Forwarded-Host': 'argos.example.org', 'X-Forwarded-Proto': 'https' },
  }));
  assert.equal(proxied.headers.get('location'), `https://argos.example.org/admin/login?next=${encodeURIComponent('/admin/ingest')}`);
  const session = await openSession();
  const open = middleware(new NextRequest(`${SITE}/admin/ingest`, { headers: { Cookie: `argos_admin=${session}` } }));
  assert.equal(open.headers.get('x-middleware-next'), '1');
  const login = middleware(new NextRequest(`${SITE}/admin/login`));
  assert.equal(login.headers.get('x-middleware-next'), '1', 'The login page itself stays reachable.');
  await withEnv({ ARGOS_ADMIN_KEY: undefined }, async () => {
    const closed = middleware(new NextRequest(`${SITE}/admin/ingest`, { headers: { Cookie: `argos_admin=${session}` } }));
    assert.equal(closed.status, 303, 'A session outlives no key.');
  });
});

test('public reads stay public, without key, session or configuration', async () => {
  const { ingestDossier } = await import('../src/server/ingest');
  const { ResearchDossierSchema } = await import('../src/lib/research-dossier');
  await ingestDossier(ResearchDossierSchema.parse(JSON.parse(dossier('Lecture publique sans clé'))));
  await withEnv({ ARGOS_ADMIN_KEY: undefined }, async () => {
    const { GET: list } = await import('../src/app/api/v1/references/route');
    const listed = await list(new NextRequest(`${SITE}/api/v1/references?limit=5`));
    assert.equal(listed.status, 200);
    const payload = await listed.json();
    assert.ok(payload.meta.pagination.total >= 1);
    const slug = payload.data[0].slug;
    const { GET: detail } = await import('../src/app/api/v1/references/[slug]/route');
    const read = await detail(new NextRequest(`${SITE}/api/v1/references/${slug}`), { params: Promise.resolve({ slug }) });
    assert.equal(read.status, 200);
    const missing = await detail(new NextRequest(`${SITE}/api/v1/references/absente`), { params: Promise.resolve({ slug: 'absente' }) });
    assert.equal(missing.status, 404);
    assert.deepEqual(Object.keys(await missing.json()).slice(0, 2), ['ok', 'error']);
    const { GET: descriptor } = await ingestRoute();
    assert.equal((await descriptor()).status, 200);
  });
});

// Static check: a write route or an administration page that forgets the key fails here.
function files(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

test('every write route and every administration page goes through the single key', () => {
  const app = join('src', 'app');
  // Public on purpose: the newsletter stub subscribes anyone; login and logout are the key's own gate.
  const publicWrites = new Map([
    ['api/newsletter/route.ts', 'inscription publique à la newsletter (bouchon sans stockage)'],
    ['api/admin/login/route.ts', 'ouvre la session en vérifiant la clé'],
    ['api/admin/logout/route.ts', 'ferme la session de ce navigateur'],
  ]);
  const unguarded: string[] = [];
  for (const path of files(app)) {
    const name = relative(app, path).split(sep).join('/');
    const source = readFileSync(path, 'utf8');
    if (name.endsWith('route.ts') && /export\s+(?:async\s+)?function\s+(?:POST|PUT|PATCH|DELETE)\b/.test(source)) {
      if (!publicWrites.has(name) && !/requireAdmin\(request\)/.test(source)) unguarded.push(name);
    }
    if (name.startsWith('admin/') && name.endsWith('page.tsx') && name !== 'admin/login/page.tsx') {
      if (!/await requireAdminPage\(/.test(source)) unguarded.push(name);
    }
  }
  assert.deepEqual(unguarded, []);
  const middleware = readFileSync(join('src', 'middleware.ts'), 'utf8');
  assert.match(middleware, /'\/admin\/:path\*'/);
});
