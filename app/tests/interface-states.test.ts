import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FreshTime } from '../src/components/fresh-time';
import { buildArticleJsonLd } from '../src/lib/article-json-ld';
import { describeHttpFailure, describeNetworkFailure, isRetryableStatus } from '../src/lib/fetch-failure';
import { freshness, latestTimestamp } from '../src/lib/freshness';
import type { Reference } from '../src/lib/types';

test('a gateway page is described by its HTTP status, never by a JSON parser message', () => {
  const failure = describeHttpFailure('Envoi du dossier', 502, '<html><body>Bad gateway</body></html>');
  assert.match(failure.message, /^Envoi du dossier : le serveur a répondu HTTP 502\./);
  assert.doesNotMatch(failure.message, /Unexpected token|JSON|SyntaxError/);
  assert.equal(failure.retryable, true);
});

test('server issues are kept with their paths, and known codes read in French', () => {
  const refused = describeHttpFailure('Envoi du dossier', 422, JSON.stringify({ ok: false, error: 'INVALID_DOSSIER',
    issues: [{ path: 'assets.0.url', message: 'URL invalide' }, { path: '', message: 42 }] }));
  assert.deepEqual(refused.issues, [{ path: 'assets.0.url', message: 'URL invalide' }, { path: '(dossier)', message: 'Valeur refusée.' }]);
  assert.match(refused.message, /refusé le dossier/);
  assert.equal(refused.retryable, false);
  // A parser text from the server is replaced by its French wording; other server messages are kept.
  assert.match(describeHttpFailure('Envoi', 400, JSON.stringify({ error: 'INVALID_JSON', message: 'Unexpected token x' })).message, /n’a pas pu lire le JSON/);
  assert.match(describeHttpFailure('Envoi', 409, JSON.stringify({ error: 'VERSION_CONFLICT', message: 'Version périmée.' })).message, /Version périmée\./);
  assert.match(describeHttpFailure('Chargement', 404, JSON.stringify({ error: 'NOT_FOUND' })).message, /Aucune référence/);
});

test('a missing network response is a retryable network failure, not an empty result', () => {
  const failure = describeNetworkFailure('Chargement de l’exemple');
  assert.match(failure.message, /réseau n’a pas répondu/);
  assert.equal(failure.retryable, true);
  assert.deepEqual([408, 429, 500, 503].map(isRetryableStatus), [true, true, true, true]);
  assert.deepEqual([400, 401, 404, 409, 422].map(isRetryableStatus), [false, false, false, false, false]);
});

test('stored dates are labelled in French without invention or timezone drift', () => {
  assert.deepEqual(freshness('2026-03-18'), { dateTime: '2026-03-18', label: '18 mars 2026' });
  assert.deepEqual(freshness('2023-12'), { dateTime: '2023-12', label: 'décembre 2023' });
  assert.deepEqual(freshness('2026-11-11T23:30:00.000Z'), { dateTime: '2026-11-11T23:30:00.000Z', label: '11 novembre 2026' });
  for (const absent of [undefined, null, '', '2026-02-30', 'hier', '2026']) assert.equal(freshness(absent), null);
  assert.equal(latestTimestamp(['2026-01-02T00:00:00.000Z', undefined, 'n/a', '2026-03-01T10:00:00.000Z']), '2026-03-01T10:00:00.000Z');
  assert.equal(latestTimestamp([undefined, null]), null);
});

test('a date is rendered as <time> when readable, as stored text otherwise, and not at all when absent', () => {
  assert.equal(renderToStaticMarkup(createElement(FreshTime, { value: '2026-03-18', prefix: 'consulté le' })),
    '<span>consulté le <time dateTime="2026-03-18">18 mars 2026</time></span>');
  assert.equal(renderToStaticMarkup(createElement(FreshTime, { value: 'printemps 2019' })), '<span>printemps 2019</span>');
  assert.equal(renderToStaticMarkup(createElement(FreshTime, { value: undefined, prefix: 'Mis à jour le' })), '');
});

test('structured data carries the stored dates and invents none', () => {
  const reference = {
    slug: 'synthetic', title: 'Synthetic', brandEmitter: 'Synthetic', sector: 'test', summary: 'Synthetic.',
    patternKind: 'TEXT', manipulationMode: 'FACILITATOR', victoryTypes: [], operationGoals: [], assets: [],
    researchSources: [], updatedAt: '2025-06-01T08:00:00.000Z',
  } as unknown as Reference;
  const withoutResearch = buildArticleJsonLd(reference, 'https://example.test');
  assert.equal(withoutResearch.dateModified, '2025-06-01T08:00:00.000Z');
  assert.equal('datePublished' in withoutResearch, false, 'No research date: no guessed publication date.');
  const documented = buildArticleJsonLd({ ...reference, researchDate: '2025-05-20' }, 'https://example.test');
  assert.equal(documented.datePublished, '2025-05-20');
  const unversioned = buildArticleJsonLd({ ...reference, updatedAt: undefined }, 'https://example.test');
  assert.equal('dateModified' in unversioned, false, 'No stored version: no "today".');
});
