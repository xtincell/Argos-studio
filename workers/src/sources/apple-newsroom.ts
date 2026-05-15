// Layer 1 source crawler — Apple newsroom (apple.com/newsroom/).
// Perimeter : BRAND_OWNED.
//
// In live mode: fetches the newsroom index page, finds press release URLs,
// fetches each, and emits one RawSignal per press release.
//
// In fixture mode: reads from tests/fixtures/apple-newsroom-*.html and emits
// one signal per fixture file (sequentially named).

import * as cheerio from 'cheerio';
import { fetchUrl } from '../lib/fetcher.js';
import { logger } from '../lib/logger.js';
import type {
  RawSignal,
  SourceCrawlConfig,
  SourceCrawler,
} from '../lib/types.js';

const log = logger.child({ component: 'apple-newsroom' });

const INDEX_URL = 'https://www.apple.com/newsroom/';

const FIXTURE_FILES = [
  // The fixture filenames Layer 1 will read in dry-run mode.
  'apple-newsroom-2024-think-different-25th.html',
];

export const appleNewsroomCrawler: SourceCrawler = {
  name: 'apple-newsroom',
  perimeter: 'BRAND_OWNED',
  description: 'Crawl Apple\'s official press room for new operations and brand activity.',

  async crawl(config: SourceCrawlConfig): Promise<RawSignal[]> {
    if (config.useFixtures) {
      return crawlFromFixtures(config);
    }
    return crawlLive(config);
  },
};

async function crawlFromFixtures(_config: SourceCrawlConfig): Promise<RawSignal[]> {
  log.info({ fixtures: FIXTURE_FILES.length }, 'crawling from fixtures');
  const signals: RawSignal[] = [];

  for (const fixture of FIXTURE_FILES) {
    const result = await fetchUrl(`fixture://${fixture}`, {
      useFixtures: true,
      fixture,
    });
    signals.push(buildSignalFromHtml(result.body, `fixture://${fixture}`, fixture));
  }

  log.info({ signalsEmitted: signals.length }, 'fixture crawl complete');
  return signals;
}

async function crawlLive(config: SourceCrawlConfig): Promise<RawSignal[]> {
  log.info({ url: INDEX_URL }, 'fetching newsroom index');
  const index = await fetchUrl(INDEX_URL, { useFixtures: false });
  if (index.status >= 400) {
    log.error({ status: index.status }, 'index fetch failed');
    return [];
  }

  const $ = cheerio.load(index.body);
  // Apple newsroom uses anchor.tile__more links to individual articles.
  // This selector is best-effort and will need maintenance when Apple changes layout.
  const articleUrls = new Set<string>();
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    if (
      href.includes('/newsroom/2024/') ||
      href.includes('/newsroom/2025/') ||
      href.includes('/newsroom/2026/')
    ) {
      const absolute = href.startsWith('http') ? href : `https://www.apple.com${href}`;
      articleUrls.add(absolute);
    }
  });

  const urls = Array.from(articleUrls).slice(0, config.limit ?? 10);
  log.info({ urlsFound: urls.length }, 'discovered article URLs');

  const signals: RawSignal[] = [];
  for (const url of urls) {
    try {
      const res = await fetchUrl(url, { useFixtures: false });
      if (res.status >= 400) {
        log.warn({ url, status: res.status }, 'article fetch failed, skipping');
        continue;
      }
      signals.push(buildSignalFromHtml(res.body, url, slugFromUrl(url)));
    } catch (err) {
      log.error({ url, err }, 'article fetch threw, skipping');
    }
  }

  log.info({ signalsEmitted: signals.length }, 'live crawl complete');
  return signals;
}

function buildSignalFromHtml(html: string, url: string, idHint: string): RawSignal {
  const $ = cheerio.load(html);
  const title = $('title').first().text().trim() || $('h1').first().text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') ?? '';
  const publishedAt =
    $('meta[property="article:published_time"]').attr('content') ??
    $('time').first().attr('datetime') ??
    undefined;
  const mediaUrls = extractMediaUrls($, url);

  return {
    id: `sig_apple_${idHint.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
    sourceName: 'apple-newsroom',
    perimeter: 'BRAND_OWNED',
    url,
    capturedAt: new Date().toISOString(),
    brandHint: 'Apple',
    signalType: 'NEW_OPERATION',
    payload: {
      kind: 'HTML',
      content: html,
      title,
      metaDescription,
      mediaUrls,
      publishedAt,
    },
  };
}

function extractMediaUrls(
  $: cheerio.CheerioAPI,
  baseUrl: string,
): string[] {
  const urls = new Set<string>();
  $('img').each((_, el) => {
    const src = $(el).attr('src') ?? $(el).attr('data-src');
    if (src) urls.add(absolute(src, baseUrl));
  });
  $('video, source').each((_, el) => {
    const src = $(el).attr('src');
    if (src) urls.add(absolute(src, baseUrl));
  });
  $('meta[property="og:image"]').each((_, el) => {
    const c = $(el).attr('content');
    if (c) urls.add(absolute(c, baseUrl));
  });
  return Array.from(urls);
}

function absolute(maybeRelative: string, base: string): string {
  try {
    return new URL(maybeRelative, base).href;
  } catch {
    return maybeRelative;
  }
}

function slugFromUrl(url: string): string {
  try {
    const p = new URL(url).pathname;
    return p.replace(/\/$/, '').split('/').filter(Boolean).pop() ?? p;
  } catch {
    return url;
  }
}

// Standalone CLI entrypoint : `npx tsx src/sources/apple-newsroom.ts [--live]`
if (import.meta.url.endsWith(process.argv[1] ?? '')) {
  (async () => {
    const useFixtures = !process.argv.includes('--live');
    const signals = await appleNewsroomCrawler.crawl({ useFixtures });
    console.log(JSON.stringify(signals, null, 2));
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
