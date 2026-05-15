// Resilient HTTP fetcher used by Layer 1 source crawlers.
// - Honest User-Agent (Argos identifies itself, never spoofs)
// - Configurable per-host rate limiting
// - Exponential backoff retry on transient errors
// - Cheerio-friendly text output for HTML, raw text for JSON
// - Fixture mode: returns the content of a local file when useFixtures=true

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { request } from 'undici';
import { logger } from './logger.js';

const USER_AGENT =
  process.env.ARGOS_USER_AGENT ?? 'Argos-Crawler/0.1 (+https://argos.studio/about)';

const RATE_LIMIT_MS = Number(process.env.ARGOS_RATE_LIMIT_MS ?? 1500);
const FETCH_TIMEOUT_MS = Number(process.env.ARGOS_FETCH_TIMEOUT_MS ?? 20000);

const FIXTURE_DIR = join(process.cwd(), 'tests', 'fixtures');

const log = logger.child({ component: 'fetcher' });
const lastFetchByHost = new Map<string, number>();

export interface FetchResult {
  url: string;
  status: number;
  body: string;
  contentType: string;
  fromFixture: boolean;
}

export interface FetchOptions {
  /** When true, resolve from tests/fixtures/<fixture> instead of HTTP. */
  useFixtures: boolean;
  /** When useFixtures=true, the filename inside tests/fixtures/ to read. */
  fixture?: string;
  /** Force a specific Accept header. */
  accept?: string;
}

/**
 * Fetch a URL with rate limiting, retry, and honest User-Agent.
 * If options.useFixtures is true and options.fixture is provided, the fixture file
 * is read from disk instead of performing an HTTP request.
 */
export async function fetchUrl(url: string, options: FetchOptions): Promise<FetchResult> {
  if (options.useFixtures) {
    if (!options.fixture) {
      throw new Error(`Fixture mode requested for ${url} but no fixture filename provided`);
    }
    return readFixture(url, options.fixture);
  }
  return fetchLive(url, options);
}

function readFixture(url: string, fixture: string): FetchResult {
  const path = join(FIXTURE_DIR, fixture);
  log.debug({ url, fixture, path }, 'reading fixture');
  const body = readFileSync(path, 'utf8');
  const contentType = fixture.endsWith('.json') ? 'application/json' : 'text/html';
  return { url, status: 200, body, contentType, fromFixture: true };
}

async function fetchLive(url: string, options: FetchOptions, attempt = 1): Promise<FetchResult> {
  const maxAttempts = 3;
  const host = new URL(url).host;

  // Rate-limit per host
  const last = lastFetchByHost.get(host) ?? 0;
  const elapsed = Date.now() - last;
  if (elapsed < RATE_LIMIT_MS) {
    await sleep(RATE_LIMIT_MS - elapsed);
  }
  lastFetchByHost.set(host, Date.now());

  try {
    log.debug({ url, attempt }, 'fetching');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await request(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: options.accept ?? 'text/html,application/json,*/*;q=0.8',
        'Accept-Language': 'en,fr;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const body = await res.body.text();
    const contentType = String(res.headers['content-type'] ?? '');

    // Retry on transient server errors
    if (res.statusCode >= 500 && attempt < maxAttempts) {
      log.warn({ url, status: res.statusCode, attempt }, 'transient server error, retrying');
      await sleep(2 ** attempt * 1000);
      return fetchLive(url, options, attempt + 1);
    }

    // 4xx errors are not retried (client error)
    if (res.statusCode >= 400) {
      log.warn({ url, status: res.statusCode }, 'client error response');
    }

    return {
      url,
      status: res.statusCode,
      body,
      contentType,
      fromFixture: false,
    };
  } catch (err) {
    if (attempt < maxAttempts) {
      log.warn({ url, attempt, err }, 'fetch failed, retrying');
      await sleep(2 ** attempt * 1000);
      return fetchLive(url, options, attempt + 1);
    }
    throw err;
  }
}
