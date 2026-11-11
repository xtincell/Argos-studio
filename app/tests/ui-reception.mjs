// Browser receipt of the built interface: errors, keyboard/focus, 390 px mobile and freshness.
// Runs after `npm run build`, on its own disposable SQLite database and its own server.
// No operator database, no model provider and no external host are reached: the browser
// aborts every request outside the owned origin and serves image optimisation locally.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';

const directory = await mkdtemp(join(tmpdir(), 'argos-ui-'));
const database = join(directory, 'ui.db');
const key = 'synthetic-editorial-library-ui-receipt-key';
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
let origin;
let server;
let logs = '';
let browser;
const corpus = {};
// Page content, with or without the <main> landmark (kept valid for the pre-correction run).
const C = ':is(main, body > section.view)';
const content = (page) => page.locator(C).first();

async function freePort() {
  const listener = createServer();
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const { port } = listener.address();
  await new Promise((resolve) => listener.close(resolve));
  return port;
}

before(async () => {
  const port = await freePort();
  origin = `http://127.0.0.1:${port}`;
  const env = { ...process.env, DATABASE_URL: `file:${database}`, ARGOS_INGEST_API_KEY: key,
    NEXT_PUBLIC_SITE_URL: origin, ANTHROPIC_API_KEY: '', VOYAGE_API_KEY: '', NEXT_TELEMETRY_DISABLED: '1' };
  await writeFile(database, '');
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env, stdio: 'pipe' });
  corpus.env = env;
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (chunk) => { logs = (logs + chunk).slice(-8000); });
  server.stderr.on('data', (chunk) => { logs = (logs + chunk).slice(-8000); });
  let ready = false;
  for (let attempt = 0; attempt < 150 && !ready; attempt++) {
    if (server.exitCode !== null) throw new Error(`Owned runtime exited before readiness.\n${logs}`);
    try { ready = (await fetch(`${origin}/api/v1`)).ok; } catch { /* not listening yet */ }
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Built server must become ready.');
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  if (server && server.exitCode === null) {
    const exited = new Promise((resolve) => server.once('exit', resolve));
    server.kill('SIGTERM');
    const deadline = setTimeout(() => server.kill('SIGKILL'), 10000);
    await exited;
    clearTimeout(deadline);
  }
  await rm(directory, { recursive: true, force: true });
});

/** A page whose network is confined to the owned origin. */
async function openPage(viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport, locale: 'fr-FR', timezoneId: 'Africa/Abidjan' });
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(`${origin}/_next/image`)) return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
    if (url.startsWith(origin) || url.startsWith('data:')) return route.continue();
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.on('close', () => context.close().catch(() => {}));
  return page;
}

/** Navigate, let the client hydrate, and wait for the streamed content (the loading skeleton has no heading). */
async function visit(page, route, options = {}) {
  const response = await page.goto(`${origin}${route}`, { waitUntil: 'networkidle', ...options });
  await page.locator('h1').first().waitFor({ state: 'visible', timeout: 15000 });
  return response;
}

async function waitFor(page, predicate, arg, label, timeout = 8000) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeout) {
    last = await page.evaluate(predicate, arg).catch((error) => String(error));
    if (last === true) return;
    await page.waitForTimeout(100);
  }
  assert.fail(`${label} (last observation: ${JSON.stringify(last)})`);
}

const activeDescription = (page) => page.evaluate(() => {
  const element = document.activeElement;
  if (!element || element === document.body) return 'body';
  return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}[${(element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 40)}]`;
});

async function alertText(page) {
  // Scoped to main: Next's route announcer is also an alert, inside a shadow root.
  const alert = content(page).getByRole('alert').filter({ hasText: /\S/ }).first();
  await alert.waitFor({ state: 'visible', timeout: 8000 });
  return alert.innerText();
}

// ---------------------------------------------------------------------------------------------
// Empty library: an empty list must say so, distinctly from an error.

test('une bibliothèque vide le dit au lieu de laisser une liste muette', async () => {
  const page = await openPage();
  try {
    await visit(page, '/works');
    const works = await content(page).innerText();
    assert.match(works, /aucune opération/i, '/works must state that the library is empty.');
    await visit(page, '/');
    const home = await content(page).innerText();
    assert.match(home, /aucun dossier/i, 'The featured panel must state that nothing is admitted yet.');
    assert.doesNotMatch(home, /cassé|indisponible/i, 'Empty is not an error.');
  } finally { await page.close(); }
});

test('admission du corpus de recette (seed du dépôt et dossier synthétique)', async () => {
  execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'prisma/seed.ts'], { env: corpus.env, stdio: 'pipe' });
  const dossier = JSON.parse(await readFile('public/dossier-example.json', 'utf8'));
  Object.assign(dossier.operation, { title: 'Synthetic interface receipt', brandEmitter: 'Synthetic UI' });
  dossier.researcher = { name: 'Synthetic receipt only', contact: 'private-ui@example.test' };
  const created = await fetch(`${origin}/api/v1/ingest/dossier`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, Origin: origin }, body: JSON.stringify(dossier) });
  assert.equal(created.status, 201);
  const receipt = await created.json();
  corpus.slug = receipt.slug;
  corpus.updatedAt = receipt.updatedAt;
  corpus.researchDate = dossier.researchDate;
  corpus.accessedDate = dossier.sources[0].accessedDate;
  const references = (await (await fetch(`${origin}/api/v1/references?limit=100`)).json()).data;
  assert.ok(references.length > 1, 'The repository seed must provide several references.');
  corpus.seededSlug = references.find((reference) => reference.slug !== corpus.slug).slug;
  const assets = (await (await fetch(`${origin}/api/v1/assets`)).json()).data;
  corpus.assetId = assets[0].asset.id;
});

// ---------------------------------------------------------------------------------------------
// Mobile 390 px.

const MOBILE = { width: 390, height: 844 };

function routes() {
  return ['/', '/browse', '/search', '/search?q=nike', '/assets', '/patterns', '/about', '/glossary',
    `/work/${corpus.slug}`, `/work/${corpus.slug}/inspect`, `/work/${corpus.seededSlug}`, `/work/${corpus.seededSlug}/inspect`,
    '/brand', '/brand/nike', '/sector', '/market', '/award', '/year', '/agency', '/works', '/admin/ingest',
    `/admin/ingest?slug=${corpus.slug}`, '/docs/api', '/docs/research-dossier-spec', '/sign-in', '/privacy', '/terms',
    '/route-absente', `/asset/${corpus.assetId}`];
}

test('à 390 px, aucune page ne défile horizontalement et aucun contenu n’est masqué pour y parvenir', async () => {
  const page = await openPage(MOBILE);
  const offenders = [];
  try {
    for (const route of routes()) {
      await visit(page, route);
      const report = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        const masked = ['html', 'body'].filter((tag) => ['hidden', 'clip'].includes(getComputedStyle(document.querySelector(tag)).overflowX));
        const outside = [];
        const clipped = (element) => {
          // Content inside its own scroll/clip container does not widen the page.
          for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
            if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(node).overflowX)
              && node.getBoundingClientRect().right <= width + 1) return true;
          }
          return false;
        };
        for (const element of document.querySelectorAll('body *')) {
          const box = element.getBoundingClientRect();
          if (box.width === 0 || box.height === 0 || box.right <= width + 1) continue;
          if (outside.some((parent) => parent.contains(element)) || clipped(element)) continue;
          outside.push(element);
        }
        return { width, scrollWidth: document.documentElement.scrollWidth, masked,
          outside: outside.slice(0, 4).map((element) => `${element.tagName.toLowerCase()}.${String(element.className).split(' ')[0]}`) };
      });
      if (report.scrollWidth > report.width || report.masked.length || report.outside.length) {
        offenders.push(`${route} → ${report.scrollWidth}/${report.width} masqué:${report.masked.join(',') || '-'} ${report.outside.join(' ')}`);
      }
    }
  } finally { await page.close(); }
  assert.deepEqual(offenders, []);
});

async function targetSizes(page, locators) {
  const small = [];
  for (const [label, locator] of locators) {
    const count = await locator.count();
    if (count === 0) small.push(`${label} absent`);
    for (let index = 0; index < count; index++) {
      const box = await locator.nth(index).boundingBox();
      if (!box) { small.push(`${label}#${index} non rendu`); continue; }
      if (box.height < 43.5 || box.width < 43.5) small.push(`${label}#${index} ${Math.round(box.width)}×${Math.round(box.height)}`);
      if (box.x < 0 || box.x + box.width > MOBILE.width + 1) small.push(`${label}#${index} hors écran`);
    }
  }
  return small;
}

test('à 390 px, les commandes principales sont visibles et mesurent au moins 44 px', async () => {
  const page = await openPage(MOBILE);
  const small = [];
  try {
    await visit(page, '/');
    small.push(...await targetSizes(page, [
      ['accueil', page.locator('header.topbar a.brand')],
      ['navigation', page.locator('header.topbar nav a')],
      ['newsletter', page.locator('header.topbar a.newsletter-btn')],
      ['recherche accueil', page.locator(`${C} form[action="/assets"] input[name="q"]`)],
      ['chercher accueil', page.locator(`${C} form[action="/assets"] button[type="submit"]`)],
    ]));
    await page.keyboard.press('Tab');
    small.push(...await targetSizes(page, [['lien d’évitement', page.locator('a[href="#contenu"]')]]));
    await visit(page, '/search?q=nike');
    small.push(...await targetSizes(page, [
      ['recherche', page.locator(`${C} form[action="/search"] input[name="q"]`).first()],
      ['chercher', page.locator(`${C} form[action="/search"] button[type="submit"]`).first()],
      ['mode de recherche', page.locator(`${C} .mode a`)],
    ]));
    await visit(page, '/assets');
    small.push(...await targetSizes(page, [
      ['recherche d’actifs', page.locator(`${C} form[action="/assets"] input[name="q"]`)],
      ['chercher un actif', page.locator(`${C} form[action="/assets"] button[type="submit"]`)],
    ]));
    await visit(page, `/work/${corpus.slug}`);
    small.push(...await targetSizes(page, [
      ['vues de la fiche', page.locator(`${C} a.tab`)],
      ['actifs du bundle', page.locator(`${C} .doss-essay .grid a`)],
      ['modifier', page.getByRole('link', { name: 'Modifier le dossier' })],
      ['exporter', page.getByRole('link', { name: /Exporter/ })],
      ['copier le lien', page.getByRole('button', { name: 'Copier le lien' })],
      ['imprimer', page.getByRole('button', { name: 'Imprimer' })],
    ]));
    await visit(page, '/admin/ingest');
    await page.getByRole('button', { name: /Charger l[’']exemple/ }).click();
    await page.getByRole('button', { name: 'Soumettre le dossier' }).waitFor();
    small.push(...await targetSizes(page, [
      ['charger l’exemple', page.getByRole('button', { name: /Charger l[’']exemple/ })],
      ['copier le modèle', page.getByRole('button', { name: /Copier le (modèle|template)/ })],
      ['télécharger le modèle', page.getByRole('link', { name: /Télécharger le (modèle|template)/ })],
      ['importer un fichier', page.locator(`${C} label:has(input[type="file"])`)],
      ['clé d’admission', page.locator(`${C} input[type="password"]`)],
      ['soumettre', page.getByRole('button', { name: 'Soumettre le dossier' })],
    ]));
    await visit(page, '/route-absente');
    small.push(...await targetSizes(page, [['actions 404', page.locator(`${C} a.pill`)]]));
    await visit(page, '/sign-in');
    small.push(...await targetSizes(page, [
      ['email', page.locator(`${C} input[type="email"]`)],
      ['inscription', page.locator(`${C} button[type="submit"]`)],
    ]));
  } finally { await page.close(); }
  assert.deepEqual(small, []);
});

// ---------------------------------------------------------------------------------------------
// Keyboard and focus.

test('la page est déclarée en français', async () => {
  const page = await openPage();
  try {
    await visit(page, '/');
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'fr');
  } finally { await page.close(); }
});

test('un lien d’évitement visible au clavier mène au contenu principal', async () => {
  const page = await openPage();
  try {
    await visit(page, '/');
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => {
      const element = document.activeElement;
      const box = element.getBoundingClientRect();
      return { href: element.getAttribute('href'), text: element.textContent.trim(), visible: box.width > 1 && box.height > 1 && box.top >= 0 };
    });
    assert.deepEqual(first, { href: '#contenu', text: 'Aller au contenu', visible: true });
    await page.keyboard.press('Enter');
    await waitFor(page, () => document.activeElement?.id === 'contenu' || document.activeElement?.closest('#contenu') !== null,
      undefined, 'Activating the skip link must focus the main content.');
    assert.equal(await page.evaluate(() => document.activeElement.closest('main')?.id), 'contenu');
  } finally { await page.close(); }
});

test('après une navigation au clavier, le focus est porté par le titre de la nouvelle page', async () => {
  const page = await openPage();
  try {
    await visit(page, '/');
    await page.keyboard.press('Tab');
    await page.locator('header.topbar nav a', { hasText: 'Assets' }).focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(`${origin}/assets`);
    await waitFor(page, () => document.activeElement?.tagName === 'H1' && document.activeElement.closest('main, body > section.view') !== null,
      undefined, 'Focus must move to the title of the new page.');
    assert.match(await page.evaluate(() => document.activeElement.textContent), /Chercher un asset/);
    // The active section is exposed, not only coloured.
    assert.equal(await page.locator('header.topbar nav a[aria-current="page"]').innerText(), 'Assets');
  } finally { await page.close(); }
});

async function focusIndicatorChanges(page, selector) {
  return page.evaluate((target) => {
    const element = document.querySelector(target);
    if (!element) return `absent: ${target}`;
    const chain = [element, element.parentElement, element.parentElement?.parentElement].filter(Boolean);
    // An outline only counts when it can be seen: Tailwind's outline-none is a transparent outline.
    const transparent = (color) => color === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(color);
    const snapshot = () => chain.map((node) => {
      const style = getComputedStyle(node);
      const outline = style.outlineStyle === 'none' || Number.parseFloat(style.outlineWidth) === 0 || transparent(style.outlineColor)
        ? 'none' : `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`;
      return [outline, style.boxShadow, style.borderColor, style.backgroundColor].join(' | ');
    });
    element.blur();
    const blurred = snapshot();
    element.focus();
    const focused = snapshot();
    const visible = element.matches(':focus-visible') || element.matches(':focus');
    return visible && focused.some((value, index) => value !== blurred[index]);
  }, selector);
}

test('chaque commande atteinte au clavier montre un focus visible', async () => {
  const page = await openPage();
  const invisible = [];
  try {
    const checks = [
      ['/', ['header.topbar a.brand', 'header.topbar nav a', 'header.topbar a.newsletter-btn',
        `${C} form[action="/assets"] input[name="q"]`, `${C} form[action="/assets"] button[type="submit"]`, `${C} a.pill`]],
      ['/search?q=nike', [`${C} form[action="/search"] input[name="q"]`, `${C} .mode a`]],
      ['/assets', [`${C} form[action="/assets"] input[name="q"]`]],
      [`/work/${corpus.slug}`, [`${C} a.tab`, `${C} button.pill`, `${C} .doss-essay .grid a`]],
      ['/admin/ingest', [`${C} button`, `${C} input[type="file"]`, `${C} input[type="password"]`, `${C} textarea`]],
      ['/sign-in', [`${C} input[type="email"]`, `${C} button[type="submit"]`]],
    ];
    for (const [route, selectors] of checks) {
      await visit(page, `${route}`);
      await page.keyboard.press('Tab'); // keyboard modality, as a keyboard user would arrive
      for (const selector of selectors) {
        const result = await focusIndicatorChanges(page, selector);
        if (result !== true) invisible.push(`${route} ${selector}: ${result}`);
      }
    }
  } finally { await page.close(); }
  assert.deepEqual(invisible, []);
});

test('les modes de recherche ne simulent pas des onglets dépourvus de leur comportement clavier', async () => {
  const page = await openPage();
  try {
    await visit(page, '/search?q=nike');
    assert.equal(await page.locator('[role="tab"]:not([aria-selected])').count(), 0);
    assert.equal(await page.locator(`${C} .mode a[aria-current="page"]`).innerText(), 'Simple');
  } finally { await page.close(); }
});

test('l’aperçu d’un actif piège le focus, se ferme par Échap et rend le focus à son déclencheur', async () => {
  const page = await openPage();
  try {
    await visit(page, '/admin/ingest');
    await page.getByRole('button', { name: /Charger l[’']exemple/ }).click();
    // The gallery thumbnails of the preview open the asset dialog.
    const trigger = page.locator(`${C} button[aria-haspopup="dialog"], ${C} button[aria-label^="Open"]`).first();
    await trigger.waitFor();
    await trigger.evaluate((element) => element.setAttribute('data-receipt-trigger', ''));
    await page.keyboard.press('Tab');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await page.locator('dialog[open]').waitFor();
    const keys = ['Tab', 'Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab'];
    for (const [step, keyName] of keys.entries()) {
      assert.ok(await page.evaluate(() => document.querySelector('dialog[open]')?.contains(document.activeElement)),
        `Focus must stay inside the dialog (step ${step}, on ${await activeDescription(page)}).`);
      await page.keyboard.press(keyName);
    }
    assert.ok(await page.evaluate(() => document.querySelector('dialog[open]')?.contains(document.activeElement)),
      `Focus must stay inside the dialog (on ${await activeDescription(page)}).`);
    await page.keyboard.press('Escape');
    await page.locator('dialog').waitFor({ state: 'detached' });
    await waitFor(page, () => document.activeElement?.hasAttribute('data-receipt-trigger') === true, undefined,
      'Closing must return focus to the asset that opened the preview.');
  } finally { await page.close(); }
});

// ---------------------------------------------------------------------------------------------
// Errors: readable, actionable, distinct from empty.

test('une panne de lecture serveur est lisible et « Réessayer » relit réellement la bibliothèque', async () => {
  const page = await openPage();
  const db = new DatabaseSync(database);
  let hidden = false;
  try {
    db.exec('ALTER TABLE "Reference" RENAME TO "Reference_ui_receipt_hidden"');
    hidden = true;
    await visit(page, '/works');
    const retry = page.getByRole('button', { name: 'Réessayer' });
    await retry.waitFor();
    assert.match(await content(page).innerText(), /indisponible/i);
    db.exec('ALTER TABLE "Reference_ui_receipt_hidden" RENAME TO "Reference"');
    hidden = false;
    await retry.click();
    await page.locator(`${C} h1`, { hasText: 'Chaque opération' }).waitFor({ timeout: 10000 });
    assert.match(await content(page).innerText(), /Synthetic interface receipt/);
  } finally {
    if (hidden) db.exec('ALTER TABLE "Reference_ui_receipt_hidden" RENAME TO "Reference"');
    db.close();
    await page.close();
  }
});

test('l’échec de chargement de l’exemple est annoncé et peut être réessayé', async () => {
  const page = await openPage();
  try {
    await visit(page, '/admin/ingest');
    await page.route('**/dossier-example.json', (route) => route.fulfill({ status: 503, contentType: 'text/plain', body: 'Service Unavailable' }));
    await page.getByRole('button', { name: /Charger l[’']exemple/ }).click();
    const message = await alertText(page);
    assert.match(message, /exemple/i);
    assert.match(message, /503/);
    assert.equal(await page.locator(`${C} textarea`).inputValue(), '', 'An error body must never become the dossier.');
    await page.unroute('**/dossier-example.json');
    await content(page).getByRole('alert').getByRole('button', { name: 'Réessayer' }).click();
    await waitFor(page, () => document.querySelector('textarea')?.value.includes('research-dossier-v1'), undefined, 'Retry must load the example.');
  } finally { await page.close(); }
});

async function loadExampleWithKey(page) {
  await visit(page, '/admin/ingest');
  await page.getByRole('button', { name: /Charger l[’']exemple/ }).click();
  await page.locator(`${C} input[type="password"]`).fill(key);
  await page.getByRole('button', { name: 'Soumettre le dossier' }).waitFor();
}

test('une coupure réseau à l’envoi est décrite en français, sans perdre le dossier saisi', async () => {
  const page = await openPage();
  try {
    await loadExampleWithKey(page);
    await page.route('**/api/v1/ingest/dossier', (route) => route.abort('internetdisconnected'));
    await page.getByRole('button', { name: 'Soumettre le dossier' }).click();
    const message = await alertText(page);
    assert.match(message, /réseau/i);
    assert.doesNotMatch(message, /Failed to fetch|TypeError/);
    assert.ok((await page.locator(`${C} textarea`).inputValue()).includes('research-dossier-v1'));
    assert.equal(await page.getByRole('button', { name: 'Soumettre le dossier' }).isEnabled(), true, 'The operator can resubmit.');
  } finally { await page.close(); }
});

test('une réponse de passerelle non JSON est décrite par son statut, pas par une erreur d’analyse', async () => {
  const page = await openPage();
  try {
    await loadExampleWithKey(page);
    await page.route('**/api/v1/ingest/dossier', (route) => route.fulfill({ status: 502, contentType: 'text/html', body: '<html><body>Bad gateway</body></html>' }));
    await page.getByRole('button', { name: 'Soumettre le dossier' }).click();
    const message = await alertText(page);
    assert.match(message, /502/);
    assert.doesNotMatch(message, /Unexpected token|JSON|SyntaxError/);
  } finally { await page.close(); }
});

test('un dossier refusé par le serveur liste les problèmes renvoyés', async () => {
  const page = await openPage();
  try {
    await loadExampleWithKey(page);
    await page.route('**/api/v1/ingest/dossier', (route) => route.fulfill({ status: 422, contentType: 'application/json',
      body: JSON.stringify({ ok: false, error: 'INVALID_DOSSIER', issues: [{ path: 'assets.0.url', message: 'URL invalide' }] }) }));
    await page.getByRole('button', { name: 'Soumettre le dossier' }).click();
    const message = await alertText(page);
    assert.match(message, /assets\.0\.url/);
    assert.match(message, /URL invalide/);
  } finally { await page.close(); }
});

test('une référence inconnue est dite absente, pas privée de son dossier d’origine', async () => {
  const page = await openPage();
  try {
    await visit(page, '/admin/ingest?slug=reference-inconnue-ui');
    const message = await alertText(page);
    assert.match(message, /aucune référence/i);
    assert.doesNotMatch(message, /dossier d’origine manque/);
  } finally { await page.close(); }
});

test('le chargement du dossier courant est annoncé, et son échec réseau propose de réessayer', async () => {
  const page = await openPage();
  try {
    let release;
    const held = new Promise((resolve) => { release = resolve; });
    await page.route(`**/api/v1/references/${corpus.slug}?format=dossier`, async (route) => { await held; await route.abort('internetdisconnected'); });
    await visit(page, `/admin/ingest?slug=${corpus.slug}`, { waitUntil: 'load' });
    const status = content(page).getByRole('status').filter({ hasText: /Chargement du dossier/ });
    await status.waitFor();
    release();
    const message = await alertText(page);
    assert.match(message, /réseau/i);
    await page.unroute(`**/api/v1/references/${corpus.slug}?format=dossier`);
    await content(page).getByRole('alert').getByRole('button', { name: 'Réessayer' }).click();
    await waitFor(page, (title) => document.querySelector('textarea')?.value.includes(title), 'Synthetic interface receipt', 'Retry must load the current dossier.');
  } finally { await page.close(); }
});

test('la copie du modèle signale son échec au lieu de rester silencieuse', async () => {
  const page = await openPage();
  try {
    await visit(page, '/admin/ingest');
    await page.route('**/dossier-template.json', (route) => route.fulfill({ status: 500, body: 'error' }));
    await page.getByRole('button', { name: /Copier le (modèle|template)/ }).click();
    assert.match(await alertText(page), /modèle/i);
  } finally { await page.close(); }
});

test('une adresse refusée par le serveur revient sur la page d’inscription avec un message lisible', async () => {
  const page = await openPage();
  try {
    await visit(page, '/sign-in');
    await page.locator(`${C} input[type="email"]`).fill('a@b'); // accepted by the browser, refused by the server
    await page.locator(`${C} button[type="submit"]`).click();
    await page.waitForURL(/\/sign-in/);
    assert.match(await alertText(page), /adresse.*invalide/i);
    assert.doesNotMatch(await page.content(), /"error":"INVALID_EMAIL"/);
  } finally { await page.close(); }
});

// ---------------------------------------------------------------------------------------------
// Freshness: shown where the data carries it, never invented.

const dateOnly = (iso) => iso.slice(0, 10);

test('la fiche affiche sa date de mise à jour réelle et la date du dossier', async () => {
  const page = await openPage();
  try {
    await visit(page, `/work/${corpus.slug}`);
    const updated = page.locator(`${C} time[datetime="${corpus.updatedAt}"]`);
    assert.equal(await updated.count(), 1, 'The current version date must be shown as a machine-readable time.');
    assert.match(await updated.locator('xpath=..').innerText(), /mis à jour/i);
    assert.equal(await page.locator(`${C} time[datetime="${corpus.researchDate}"]`).count() >= 1, true);
  } finally { await page.close(); }
});

test('les données structurées reprennent les dates enregistrées sans en inventer', async () => {
  for (const slug of [corpus.slug, corpus.seededSlug]) {
    const reference = (await (await fetch(`${origin}/api/v1/references/${slug}`)).json()).data;
    const html = await (await fetch(`${origin}/work/${slug}`)).text();
    const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(block, `${slug} must carry its JSON-LD.`);
    const data = JSON.parse(block[1]);
    assert.equal(data.dateModified, reference.updatedAt, `${slug}: dateModified is the stored version date.`);
    if (reference.researchDate) assert.equal(data.datePublished, reference.researchDate);
    else assert.equal(data.datePublished, undefined, `${slug}: no research date, no invented publication date.`);
  }
});

test('la vue analytique et la page d’actif montrent les dates de consultation et de mise à jour', async () => {
  const page = await openPage();
  try {
    await visit(page, `/work/${corpus.slug}/inspect`);
    assert.ok(await page.locator(`${C} time[datetime="${corpus.accessedDate}"]`).count() >= 1, 'Source access dates must be shown.');
    assert.equal(await page.locator(`${C} time[datetime="${corpus.updatedAt}"]`).count(), 1);
    const asset = (await (await fetch(`${origin}/api/v1/references/${corpus.slug}`)).json()).data.assets[0].id;
    await visit(page, `/asset/${asset}`);
    assert.equal(await page.locator(`${C} time[datetime="${corpus.updatedAt}"]`).count(), 1);
  } finally { await page.close(); }
});

test('l’accueil date la dernière mise à jour de la bibliothèque', async () => {
  const references = (await (await fetch(`${origin}/api/v1/references?limit=100`)).json()).data;
  const latest = references.map((reference) => reference.updatedAt).sort().at(-1);
  const page = await openPage();
  try {
    await visit(page, '/');
    const time = page.locator(`${C} time[datetime="${latest}"]`);
    assert.equal(await time.count(), 1);
    assert.match(await time.locator('xpath=..').innerText(), /mise à jour/i);
  } finally { await page.close(); }
});

process.on('exit', (code) => { if (code !== 0 && logs) console.error(logs); });
