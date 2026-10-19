// Layer 2 brand watch agent for Apple.
//
// Responsibilities :
//   1. Orchestrate Layer 1 source crawlers (BRAND_OWNED, AWARDS_DATABASE, etc.)
//   2. Filter their output for Apple-specific signals
//   3. Query perimeters Layer 1 doesn't cover :
//        - CULTURAL_SIGNAL (stubbed — would call a memes/parodies search API)
//        - PERFORMANCE_DATA (stubbed — would query Apple's quarterly reports, Google Trends, etc.)
//        - INDEPENDENT_ANALYSIS (stubbed — academic + podcasts)
//   4. Return raw signals for the pipeline to parse and bundle
//
// In dry-run mode all four perimeters return signals from fixtures.

import { appleNewsroomCrawler } from '../sources/apple-newsroom.js';
import { cannesLionsCrawler } from '../sources/cannes-lions.js';
import { logger } from '../lib/logger.js';
import type {
  BrandWatchAgent,
  BrandWatchResult,
  ParsedSignal,
  RawSignal,
  SourcePerimeter,
} from '../lib/types.js';
import { parseSignal } from '../lib/parser.js';
import { bundleSignals } from '../lib/bundle.js';
import { getExtractor } from '../lib/llm.js';
import { collectSources } from '../lib/collect.js';

const log = logger.child({ component: 'watch:apple' });

const WATCH_ID = 'watch_apple';

const PERIMETER_COVERAGE_INIT: Record<SourcePerimeter, number> = {
  BRAND_OWNED: 0,
  AWARDS_DATABASE: 0,
  INDUSTRY_PRESS: 0,
  TRADE_PRESS: 0,
  INDEPENDENT_ANALYSIS: 0,
  CULTURAL_SIGNAL: 0,
  COMPETITOR_CONTEXT: 0,
  PERFORMANCE_DATA: 0,
  CROWDSOURCED_FIELD: 0,
};

export const appleBrandWatch: BrandWatchAgent = {
  brandSlug: 'apple',
  brandName: 'Apple',
  brandSector: 'Technology',

  async run({ useFixtures, limit }): Promise<BrandWatchResult> {
    const startedAt = new Date();
    log.info({ useFixtures, limit }, 'Apple brand watch starting');

    // STEP 1 — orchestrate Layer 1 source crawlers in parallel
    const collection = await collectSources([
      { ...appleNewsroomCrawler, crawl: () => appleNewsroomCrawler.crawl({ useFixtures, limit }) },
      { ...cannesLionsCrawler, crawl: () => cannesLionsCrawler.crawl({ useFixtures, brandFilter: 'apple', limit }) },
      { name: 'cultural-signal-stub', perimeter: 'CULTURAL_SIGNAL', crawl: () => stubCulturalSignals(useFixtures) },
      { name: 'performance-data-stub', perimeter: 'PERFORMANCE_DATA', crawl: () => stubPerformanceSignals(useFixtures) },
      { name: 'independent-analysis-stub', perimeter: 'INDEPENDENT_ANALYSIS', crawl: () => stubIndependentAnalysis(useFixtures) },
    ], useFixtures);

    // STEP 2 — filter / hint signals for Apple
    const allSignals: RawSignal[] = collection.signals.filter((s) => {
      const brandHint = s.brandHint?.toLowerCase() ?? '';
      // Layer 1 crawlers are already brand-scoped for apple-newsroom; cannes filters by brandFilter.
      // The filter here is a safety net for future generic L1 crawlers (AdAge, LBB, etc.).
      return brandHint === 'apple' || s.sourceName === 'apple-newsroom';
    });

    log.info({ totalSignals: allSignals.length }, 'collected raw signals');

    // STEP 4 — parse each signal via the LLM (or fixture extractor)
    const extractor = getExtractor({ useFixtures });
    const parsed: ParsedSignal[] = [];
    for (const signal of allSignals) {
      const p = await parseSignal(signal, { extractor });
      parsed.push(p);
    }

    // STEP 5 — bundle parsed signals into operations
    const bundled = bundleSignals(parsed);

    // STEP 6 — assemble perimeter coverage
    const perimeterCoverage = { ...PERIMETER_COVERAGE_INIT };
    for (const s of allSignals) {
      perimeterCoverage[s.perimeter] = (perimeterCoverage[s.perimeter] ?? 0) + 1;
    }

    const result: BrandWatchResult = {
      watchId: WATCH_ID,
      brandSlug: 'apple',
      brandName: 'Apple',
      runStartedAt: startedAt.toISOString(),
      runDurationMs: Date.now() - startedAt.getTime(),
      mode: useFixtures ? 'dry-run' : 'live',
      sourcesQueried: collection.receipts.filter((receipt) => receipt.status !== 'UNAVAILABLE').map((receipt) => receipt.source),
      sourceReceipts: collection.receipts,
      signalsCollected: allSignals.length,
      operationsIdentified: bundled.operations.length,
      assetsExtracted: bundled.operations.reduce((sum, op) => sum + op.assets.length, 0),
      operations: bundled.operations,
      signalsLog: parsed,
      perimeterCoverage,
    };

    log.info(
      {
        operations: result.operationsIdentified,
        assets: result.assetsExtracted,
        durationMs: result.runDurationMs,
      },
      'Apple brand watch complete',
    );
    return result;
  },
};

/* -------------------------------------------------------------------------- */
/* Perimeter stubs — Layer 1 doesn't cover these, the watch agent does        */
/* -------------------------------------------------------------------------- */

async function stubCulturalSignals(useFixtures: boolean): Promise<RawSignal[]> {
  // PROD: would call a Reddit / Twitter / TikTok meme search API filtered by 'apple'
  // and detect parodies, citations, mass-market memes.
  if (!useFixtures) {
    throw new Error('SOURCE_UNAVAILABLE: Cultural source is not implemented.');
  }
  return [
    {
      id: 'sig_cultural_apple_think-different-parodies',
      sourceName: 'cultural-signal-stub',
      perimeter: 'CULTURAL_SIGNAL',
      url: 'argos://stub/cultural/think-different-parodies',
      capturedAt: new Date().toISOString(),
      brandHint: 'Apple',
      signalType: 'CULTURAL_REFERENCE',
      payload: {
        kind: 'TEXT',
        content:
          'Argos cultural signal: 47+ documented parodies of "Think Different" across South Park, The Simpsons, web comics, college humor; phrase entered Webster dictionary in 2014; cited in 12+ academic marketing papers.',
        title: 'Think Different — cultural footprint',
      },
    },
  ];
}

async function stubPerformanceSignals(useFixtures: boolean): Promise<RawSignal[]> {
  // PROD: would query Apple investor relations + Google Trends + Brandwatch.
  if (!useFixtures) throw new Error('SOURCE_UNAVAILABLE: Performance source is not implemented.');
  return [
    {
      id: 'sig_perf_apple_market-cap-trajectory',
      sourceName: 'performance-data-stub',
      perimeter: 'PERFORMANCE_DATA',
      capturedAt: new Date().toISOString(),
      brandHint: 'Apple',
      signalType: 'PERFORMANCE_UPDATE',
      payload: {
        kind: 'TEXT',
        content:
          'Apple market cap trajectory : $3B in 1997 (Think Different launch) → $3T in 2024. Brand value index by Interbrand : ranked #1 globally every year 2013-2024.',
        title: 'Apple market cap and brand value trajectory',
      },
    },
  ];
}

async function stubIndependentAnalysis(useFixtures: boolean): Promise<RawSignal[]> {
  // PROD: would scan podcast transcripts, academic papers, YouTube case study videos.
  if (!useFixtures) throw new Error('SOURCE_UNAVAILABLE: Independent analysis source is not implemented.');
  return [
    {
      id: 'sig_indep_apple_think-different-academic',
      sourceName: 'independent-analysis-stub',
      perimeter: 'INDEPENDENT_ANALYSIS',
      capturedAt: new Date().toISOString(),
      brandHint: 'Apple',
      signalType: 'CONTEXT_UPDATE',
      payload: {
        kind: 'TEXT',
        content:
          'Multiple academic analyses position "Think Different" as the textbook case of brand-tribe manipulation mode (DEALER) executed without overt sales pitch. Cited in Holt (Cultural Strategy, 2010), Brown (Brand Mascots, 2017), and 12+ MBA marketing curriculums.',
        title: 'Think Different — academic positioning',
      },
    },
  ];
}
