import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JsonLd } from '../src/components/json-ld';
import { metricEvidenceKey } from '../src/lib/types';
import type { PerformanceMetric } from '../src/lib/types';
import { slugify } from '../src/lib/utils';

test('imported dossier text cannot terminate its JSON-LD script or inject an element', () => {
  const data = { headline: '</script><script>alert("synthetic")</script>',
    description: '<img src=x onerror="synthetic"> & "quotes"' };
  const html = renderToStaticMarkup(createElement(JsonLd, { data }));
  assert.equal(html.match(/<script/g)?.length, 1);
  assert.equal(html.match(/<\/script>/g)?.length, 1);
  assert.doesNotMatch(html, /<img|onerror="/);
  const body = html.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
  assert.deepEqual(JSON.parse(body), data);
});

test('accent normalization preserves the existing slug identity', () => {
  assert.equal(slugify('Crème brûlée — été 2026'), 'creme-brulee-ete-2026');
  assert.equal(slugify('e\u0301'), slugify('é'));
});

test('display keys distinguish evidence from different sources, dates and values', () => {
  const metric: PerformanceMetric = { kind: 'REACH_PERSONS', value: 10,
    goal: 'AWARENESS', scope: 'OPERATION', attribution: 'CLAIMED', source: 'Synthetic A' };
  const variants = [metric, { ...metric, source: 'Synthetic B' },
    { ...metric, measuredAtYearMonth: '2026-02' }, { ...metric, value: 20 }];
  assert.equal(new Set(variants.map(metricEvidenceKey)).size, 4);
  assert.equal(metricEvidenceKey({ ...metric }), metricEvidenceKey(metric));
});
