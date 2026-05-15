// Layer 1 source crawler — Cannes Lions Archive filtered by brand.
// Perimeter : AWARDS_DATABASE.
//
// Cannes Lions Archive is behind login (lovetheworkmore.com) so live access
// requires partnership credentials. This crawler is structured so the live
// implementation can plug into the partnership API when it lands. For the
// bootstrap we operate exclusively in fixture mode — fixtures contain JSON
// extracted from public case study writeups.

import { fetchUrl } from '../lib/fetcher.js';
import { logger } from '../lib/logger.js';
import type {
  RawSignal,
  SourceCrawlConfig,
  SourceCrawler,
} from '../lib/types.js';

const log = logger.child({ component: 'cannes-lions' });

// Fixture catalogue keyed by brand slug.
const FIXTURE_INDEX: Record<string, string[]> = {
  apple: ['cannes-lions-1998-think-different.json'],
};

export const cannesLionsCrawler: SourceCrawler = {
  name: 'cannes-lions',
  perimeter: 'AWARDS_DATABASE',
  description: 'Cannes Lions Archive entries filtered by brand. Awards database perimeter.',

  async crawl(config: SourceCrawlConfig): Promise<RawSignal[]> {
    if (!config.useFixtures) {
      log.warn(
        'cannes-lions live mode requires partnership API credentials; falling back to fixtures',
      );
    }
    return crawlFromFixtures(config);
  },
};

async function crawlFromFixtures(config: SourceCrawlConfig): Promise<RawSignal[]> {
  const brand = config.brandFilter?.toLowerCase().trim() ?? 'apple';
  const fixtures = FIXTURE_INDEX[brand] ?? [];

  log.info({ brand, fixtures: fixtures.length }, 'cannes-lions fixture crawl');
  const signals: RawSignal[] = [];

  for (const fixture of fixtures) {
    const result = await fetchUrl(`fixture://${fixture}`, {
      useFixtures: true,
      fixture,
    });

    let json: {
      brand?: string;
      title?: string;
      year?: number;
      url?: string;
      awards?: string[];
      caseUrl?: string;
      caseSummary?: string;
      mediaUrls?: string[];
    };
    try {
      json = JSON.parse(result.body);
    } catch (err) {
      log.error({ fixture, err }, 'failed to parse fixture JSON, skipping');
      continue;
    }

    const idHint = `${json.brand?.toLowerCase() ?? brand}-${json.year ?? 'unknown'}-${fixture
      .replace(/\.json$/, '')
      .replace(/[^a-z0-9]+/gi, '-')}`;

    signals.push({
      id: `sig_cannes_${idHint}`.toLowerCase(),
      sourceName: 'cannes-lions',
      perimeter: 'AWARDS_DATABASE',
      url: json.caseUrl ?? json.url,
      capturedAt: new Date().toISOString(),
      brandHint: json.brand ?? brand,
      signalType: 'NEW_OPERATION',
      payload: {
        kind: 'JSON',
        content: JSON.stringify(json, null, 2),
        title: json.title,
        metaDescription: json.caseSummary,
        mediaUrls: json.mediaUrls,
        publishedAt: json.year ? `${json.year}-01-01` : undefined,
      },
    });
  }

  log.info({ signalsEmitted: signals.length }, 'cannes-lions fixture crawl complete');
  return signals;
}

// Standalone CLI : `npx tsx src/sources/cannes-lions.ts <brandSlug>`
if (import.meta.url.endsWith(process.argv[1] ?? '')) {
  (async () => {
    const brand = process.argv[2] ?? 'apple';
    const signals = await cannesLionsCrawler.crawl({
      useFixtures: true,
      brandFilter: brand,
    });
    console.log(JSON.stringify(signals, null, 2));
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
