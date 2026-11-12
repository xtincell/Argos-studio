// An address the library cannot serve answers HTTP 404, not only with the not-found page.
//
// Next sends the status with the first byte of the response. A `loading.tsx` opens a Suspense
// boundary that starts the response with its skeleton; a `notFound()` thrown behind it can no
// longer change the status (HTTP 200 with the not-found page). Rule: no loading boundary
// encloses a page that can answer not found, unless the layout of the boundary's own segment —
// rendered before it — has already resolved the existence (ADR-0010: a private dossier read
// without the key answers exactly like an unknown address, so with the same 404).
//
// Static guard of the structure; the statuses themselves are received on the built server
// (tests/production-flow.mjs, tests/ui-reception.mjs) and in the image (docker/recette.sh).

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import test from 'node:test';

const APP = join('src', 'app');
const CONVENTION = ['tsx', 'ts', 'jsx', 'js'];

function pageFiles(dir: string = APP): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pageFiles(path);
    return /^page\.(tsx|ts|jsx|js)$/.test(name) ? [path] : [];
  });
}

const relativeToApp = (path: string) => relative(APP, path).split(sep).join('/');
/** URL pattern of a page: its directories, without route groups `(name)`. */
const routeOf = (page: string) =>
  `/${relativeToApp(dirname(page)).split('/').filter((part) => part && !/^\(.+\)$/.test(part)).join('/')}`;
const conventionFile = (dir: string, name: string) =>
  CONVENTION.map((extension) => join(dir, `${name}.${extension}`)).find((path) => existsSync(path));
const callsNotFound = (file: string) => /\bnotFound\(\)/.test(readFileSync(file, 'utf8'));
/** Segments from the application root down to `dir`, inclusive. */
function segmentChain(dir: string): string[] {
  const parts = relativeToApp(dir).split('/').filter(Boolean);
  return [APP, ...parts.map((_, index) => join(APP, ...parts.slice(0, index + 1)))];
}

const pages = pageFiles();
const pageOf = (route: string) => {
  const page = pages.find((candidate) => routeOf(candidate) === route);
  assert.ok(page, `No page serves ${route}.`);
  return page;
};

test('no loading boundary starts the response before a page can answer not found', () => {
  const enclosing: string[] = [];
  for (const page of pages.filter(callsNotFound)) {
    for (const segment of segmentChain(dirname(page))) {
      const loading = conventionFile(segment, 'loading');
      if (!loading) continue;
      const layout = conventionFile(segment, 'layout');
      if (layout && callsNotFound(layout)) continue; // existence resolved before the boundary
      enclosing.push(`${relativeToApp(loading)} → ${relativeToApp(page)}`);
    }
  }
  assert.deepEqual(enclosing, [], 'A not-found page streamed behind a loading boundary answers HTTP 200.');
});

test('every kind of page that can answer not found is probed on the built server', () => {
  // A new kind of dynamic page must join the 404 probes of tests/production-flow.mjs.
  assert.deepEqual(pages.filter(callsNotFound).map(routeOf).sort(), [
    '/agency/[slug]',
    '/asset/[id]',
    '/award/[slug]',
    '/brand/[slug]',
    '/by/[dimension]/[value]',
    '/market/[slug]',
    '/sector/[slug]',
    '/work/[slug]',
    '/work/[slug]/inspect',
    '/year/[year]',
  ]);
});

test('the library lists, the dossier and the asset keep their loading skeleton', () => {
  const kept = ['/', '/works', '/search', '/browse', '/assets', '/patterns', '/glossary', '/brand', '/agency',
    '/market', '/sector', '/year', '/award', '/work/[slug]', '/work/[slug]/inspect', '/asset/[id]'];
  const without = kept.filter((route) => !segmentChain(dirname(pageOf(route))).some((segment) => conventionFile(segment, 'loading')));
  assert.deepEqual(without, []);
});
