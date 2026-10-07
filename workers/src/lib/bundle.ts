// Cross-signal bundler. When the Layer 2 watch receives multiple signals that
// describe the SAME operation (e.g. Cannes Lions entry + Apple press release +
// AdAge breakdown about the same Think Different reissue), the bundler merges
// them into a single Reference. Heuristics today; LLM-judged dedup will be
// added in a follow-up sprint.

import { logger } from './logger.js';
import type { Asset, ParsedSignal, Reference } from './types.js';

const log = logger.child({ component: 'bundle' });

export interface BundlerResult {
  operations: Reference[];
  unbundled: ParsedSignal[];
  mergeLog: Array<{ targetSlug: string; mergedFrom: string[]; reason: string }>;
}

/**
 * Bundle parsed signals into deduplicated operations.
 * Each input signal that has a non-null reference becomes a candidate operation.
 * Candidates need the same operation id, slug, brand and year. Sharing an umbrella
 * campaign alone is not sufficient evidence of operation identity.
 */
export function bundleSignals(parsed: ParsedSignal[]): BundlerResult {
  const valid = parsed.filter((p) => p.reference !== null) as Array<
    ParsedSignal & { reference: Reference }
  >;
  const unbundled = parsed.filter((p) => p.reference === null);

  log.info(
    { validCount: valid.length, unbundledCount: unbundled.length },
    'bundling parsed signals',
  );

  const groups = new Map<string, Array<ParsedSignal & { reference: Reference }>>();
  for (const p of valid) {
    const key = groupKey(p.reference);
    const existing = groups.get(key) ?? [];
    existing.push(p);
    groups.set(key, existing);
  }

  const operations: Reference[] = [];
  const mergeLog: BundlerResult['mergeLog'] = [];

  for (const [key, group] of groups) {
    if (group.length === 1) {
      const only = group[0];
      if (only) operations.push(only.reference);
      continue;
    }
    const merged = mergeReferences(group);
    operations.push(merged);
    mergeLog.push({
      targetSlug: merged.slug,
      mergedFrom: group.map((p) => p.signal.id),
      reason: `Same brand × year × operation id/slug : ${key}`,
    });
  }

  log.info(
    { operationsCount: operations.length, mergesCount: mergeLog.length },
    'bundling complete',
  );

  return { operations, unbundled, mergeLog };
}

function groupKey(ref: Reference): string {
  return [
    ref.brandEmitter.toLowerCase().trim(),
    ref.emissionYear,
    ref.id,
    ref.slug.toLowerCase().trim(),
  ].join('::');
}

function mergeReferences(group: Array<ParsedSignal & { reference: Reference }>): Reference {
  // Sort to pick the highest-confidence base
  const sorted = [...group].sort((a, b) => b.extractionConfidence - a.extractionConfidence);
  const baseEntry = sorted[0];
  if (!baseEntry) throw new Error('mergeReferences called with empty group');
  const base = baseEntry.reference;

  // Merge all assets, dedup by id
  const assetsById = new Map<string, Asset>();
  for (const p of group) {
    for (const a of p.reference.assets) {
      // First-seen wins. In production we'd resolve by extraction confidence too.
      if (!assetsById.has(a.id)) {
        assetsById.set(a.id, a);
      }
    }
  }

  // Merge axes: dedup by name, keep highest-confidence value
  const axesByName = new Map<string, Reference['axes'][number]>();
  for (const p of group) {
    for (const a of p.reference.axes) {
      const existing = axesByName.get(a.name);
      if (!existing || existing.confidence < a.confidence) {
        axesByName.set(a.name, a);
      }
    }
  }

  // Only identical evidence is replay. Different sources, dates, values or
  // attribution claims must survive for the curator to assess disagreement.
  const metricsByKey = new Map<string, Reference['performance']['metrics'][number]>();
  for (const p of group) {
    for (const m of p.reference.performance.metrics) {
      const key = JSON.stringify([m.kind, m.scope, m.scopedAssetId ?? null,
        m.goal, m.value, m.displayValue ?? null, m.source,
        m.measuredAtYearMonth ?? null, m.attribution]);
      if (!metricsByKey.has(key)) metricsByKey.set(key, m);
    }
  }

  // Union of operationGoals, victoryTypes, pillars, marketsSecondary
  const operationGoals = unique(group.flatMap((p) => p.reference.operationGoals));
  const victoryTypes = unique(group.flatMap((p) => p.reference.victoryTypes));
  const pillars = unique(group.flatMap((p) => p.reference.pillars));
  const marketsSecondary = unique(group.flatMap((p) => p.reference.marketsSecondary));

  return {
    ...base,
    assets: Array.from(assetsById.values()),
    axes: Array.from(axesByName.values()),
    operationGoals,
    victoryTypes,
    pillars,
    marketsSecondary,
    performance: {
      ...base.performance,
      metrics: Array.from(metricsByKey.values()),
    },
  };
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
