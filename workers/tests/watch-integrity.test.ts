import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { bundleSignals } from '../src/lib/bundle.js';
import { cannesLionsCrawler } from '../src/sources/cannes-lions.js';
import { collectSources } from '../src/lib/collect.js';
import { appleBrandWatch } from '../src/watches/apple.js';
import { crawlNewsroomLive } from '../src/sources/apple-newsroom.js';
import type { FetchResult } from '../src/lib/fetcher.js';
import type { ParsedSignal, Reference } from '../src/lib/types.js';

function signal(id: string, change: Partial<Reference> = {}): ParsedSignal {
  const reference = JSON.parse(readFileSync('tests/fixtures/llm-output-think-different-25th.json', 'utf8')) as Reference;
  return {
    signal: { id, sourceName: 'synthetic-test', perimeter: 'BRAND_OWNED',
      capturedAt: '2026-10-07T00:00:00Z', signalType: 'NEW_OPERATION',
      payload: { kind: 'TEXT', content: 'Synthetic operation for integrity testing' } },
    reference: { ...reference, ...change }, extractionConfidence: 0.8, notes: [],
  };
}

test('live Cannes never substitutes a fixture for an unavailable source', async () => {
  await assert.rejects(cannesLionsCrawler.crawl({ useFixtures: false }), /SOURCE_UNAVAILABLE/);
});

test('two operations in the same brand/year/umbrella remain distinct', () => {
  const a = signal('a', { id: 'op-a', slug: 'operation-a', campaignParent: 'Shared umbrella' });
  const b = signal('b', { id: 'op-b', slug: 'operation-b', campaignParent: 'Shared umbrella' });
  assert.equal(bundleSignals([a, b]).operations.length, 2);
});

test('an operation slug collision does not merge different reference identities', () => {
  assert.equal(bundleSignals([signal('a', { id: 'op-a' }), signal('b', { id: 'op-b' })]).operations.length, 2);
});

test('metrics from different sources and dates survive a same-operation merge', () => {
  const metric = { kind: 'REACH_PERSONS' as const, value: 10, goal: 'AWARENESS' as const,
    scope: 'OPERATION' as const, attribution: 'CLAIMED' as const, source: 'Source A', measuredAtYearMonth: '2026-01' };
  const a = signal('a'); const b = signal('b');
  assert.ok(a.reference && b.reference);
  a.reference.performance.metrics = [metric];
  b.reference.performance.metrics = [
    { ...metric, source: 'Source B' }, { ...metric, measuredAtYearMonth: '2026-02', value: 20 },
  ];
  assert.equal(bundleSignals([a, b]).operations[0]?.performance.metrics.length, 3);
});

test('identical evidence replay does not duplicate a metric', () => {
  const a = signal('a'); const b = signal('a-replayed');
  assert.ok(a.reference);
  assert.equal(bundleSignals([a, b]).operations[0]?.performance.metrics.length,
    a.reference.performance.metrics.length);
});

test('a misspelled dry-run flag is rejected before selecting live mode', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/run-apple-watch.ts', '--dry-rnu'], {
    encoding: 'utf8', timeout: 10_000,
    env: { ...process.env, ANTHROPIC_API_KEY: '', DOTENV_CONFIG_PATH: '/dev/null' },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown option: --dry-rnu/);
  assert.doesNotMatch(result.stdout, /Apple watch CLI|calling Claude/);
});

test('one unavailable and one failed source preserve the other source observations', async () => {
  const raw = signal('observed').signal;
  const result = await collectSources([
    { name: 'observed', perimeter: 'BRAND_OWNED', crawl: async () => [raw] },
    { name: 'unavailable', perimeter: 'AWARDS_DATABASE', crawl: async () => { throw new Error('SOURCE_UNAVAILABLE: test'); } },
    { name: 'failed', perimeter: 'INDUSTRY_PRESS', crawl: async () => { throw new Error('synthetic failure'); } },
    { name: 'empty', perimeter: 'TRADE_PRESS', crawl: async () => [] },
  ], false);
  assert.deepEqual(result.signals, [raw]);
  assert.deepEqual(result.receipts.map((receipt) => receipt.status), ['OBSERVED', 'UNAVAILABLE', 'FAILED', 'NO_SIGNAL']);
});

test('the full dry-run identifies every source as fixture without network or LLM calls', async () => {
  const result = await appleBrandWatch.run({ useFixtures: true });
  assert.equal(result.mode, 'dry-run');
  assert.equal(result.signalsCollected, 5);
  assert.equal(result.operationsIdentified, 2);
  assert.equal(result.assetsExtracted, 17);
  assert.equal(result.sourceReceipts.length, 5);
  assert.ok(result.sourceReceipts.every((receipt) => receipt.status === 'FIXTURE'));
});

test('a failed newsroom article retains the other article and marks the source partial', async () => {
  const fetcher = async (url: string): Promise<FetchResult> => ({ url, status: url.endsWith('/bad/') ? 503 : 200,
    body: url.endsWith('/newsroom/') ? '<a href="/newsroom/2026/good/">Good</a><a href="/newsroom/2026/bad/">Bad</a>'
      : '<h1>Synthetic article</h1>', contentType: 'text/html', fromFixture: false });
  const result = await collectSources([{ name: 'newsroom', perimeter: 'BRAND_OWNED',
    crawl: () => crawlNewsroomLive({ useFixtures: false }, fetcher) }], false);
  assert.equal(result.signals.length, 1);
  assert.equal(result.receipts[0]?.status, 'PARTIAL');
});

test('a failed newsroom index is a failed collection, never an empty successful one', async () => {
  const fetcher = async (url: string): Promise<FetchResult> => ({ url, status: 503,
    body: '', contentType: 'text/html', fromFixture: false });
  const result = await collectSources([{ name: 'newsroom', perimeter: 'BRAND_OWNED',
    crawl: () => crawlNewsroomLive({ useFixtures: false }, fetcher) }], false);
  assert.equal(result.signals.length, 0);
  assert.equal(result.receipts[0]?.status, 'FAILED');
});
