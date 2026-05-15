// Parser : takes a RawSignal, produces a validated Reference + Asset[].
//
// Pipeline :
//   1. Preprocess the raw payload (strip nav/footer for HTML, extract main text + media URLs)
//   2. Call the LLM extractor with the system prompt + preprocessed content
//   3. Validate the JSON output against ReferenceSchema (Zod)
//   4. If invalid, retry once with a corrective prompt; otherwise mark for review
//   5. Return a ParsedSignal

import * as cheerio from 'cheerio';
import {
  EXTRACT_OPERATION_PROMPT_VERSION,
  EXTRACT_OPERATION_SYSTEM_PROMPT,
} from '../prompts/v1/extract-operation.js';
import { logger } from './logger.js';
import { type LLMExtractor } from './llm.js';
import { ReferenceSchema, type ReferenceParsed } from './zod-schemas.js';
import type { ParsedSignal, RawSignal, Reference } from './types.js';

const log = logger.child({ component: 'parser' });

export interface ParserDeps {
  extractor: LLMExtractor;
}

export async function parseSignal(
  signal: RawSignal,
  deps: ParserDeps,
): Promise<ParsedSignal> {
  log.info(
    { signalId: signal.id, source: signal.sourceName, perimeter: signal.perimeter },
    'parsing signal',
  );

  const preprocessed = preprocess(signal);
  const fixtureKey = signalToFixtureKey(signal);

  try {
    const result = await deps.extractor({
      systemPrompt: EXTRACT_OPERATION_SYSTEM_PROMPT,
      userContent: preprocessed,
      fixtureKey,
    });

    // Did the model reject the signal?
    if (isRejection(result.json)) {
      const reason = (result.json as { reason?: string }).reason ?? 'unspecified';
      log.warn({ signalId: signal.id, reason }, 'LLM rejected signal');
      return {
        signal,
        reference: null,
        extractionConfidence: 0,
        notes: [`LLM rejection: ${reason}`],
      };
    }

    // Validate against the schema
    const parsed = ReferenceSchema.safeParse(result.json);
    if (!parsed.success) {
      log.warn(
        {
          signalId: signal.id,
          issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`),
        },
        'schema validation failed',
      );
      return {
        signal,
        reference: null,
        extractionConfidence: 0.3,
        notes: [
          `Schema validation failed (prompt ${EXTRACT_OPERATION_PROMPT_VERSION})`,
          ...parsed.error.issues
            .slice(0, 5)
            .map((i) => `${i.path.join('.')}: ${i.message}`),
        ],
      };
    }

    const reference = parsed.data as Reference;
    const confidence = computeExtractionConfidence(reference);

    log.info(
      { signalId: signal.id, slug: reference.slug, confidence },
      'extraction successful',
    );

    return {
      signal,
      reference,
      extractionConfidence: confidence,
      notes:
        confidence < 0.65
          ? [`Low extraction confidence (${confidence.toFixed(2)}). Requires human review.`]
          : [],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ signalId: signal.id, err: message }, 'parser threw');
    return {
      signal,
      reference: null,
      extractionConfidence: 0,
      notes: [`Parser exception: ${message}`],
    };
  }
}

/**
 * Preprocess the raw payload into a clean text representation for the LLM.
 * - HTML: strip nav/footer, extract main content + meta + media URLs + JSON-LD
 * - JSON / JSON_LD: pretty-print
 * - TEXT: pass through
 */
function preprocess(signal: RawSignal): string {
  const { payload } = signal;
  let preprocessed = '';

  // Prepend signal metadata
  preprocessed += `<SIGNAL_METADATA>
sourceName: ${signal.sourceName}
perimeter: ${signal.perimeter}
url: ${signal.url ?? '(none)'}
brandHint: ${signal.brandHint ?? '(none)'}
signalType: ${signal.signalType}
capturedAt: ${signal.capturedAt}
${payload.publishedAt ? `publishedAt: ${payload.publishedAt}\n` : ''}${payload.title ? `title: ${payload.title}\n` : ''}${payload.metaDescription ? `metaDescription: ${payload.metaDescription}\n` : ''}</SIGNAL_METADATA>

`;

  if (payload.mediaUrls && payload.mediaUrls.length > 0) {
    preprocessed += `<MEDIA_URLS>\n${payload.mediaUrls.join('\n')}\n</MEDIA_URLS>\n\n`;
  }

  switch (payload.kind) {
    case 'HTML': {
      preprocessed += '<MAIN_CONTENT>\n';
      preprocessed += extractMainContentFromHtml(payload.content);
      preprocessed += '\n</MAIN_CONTENT>';
      break;
    }
    case 'JSON':
    case 'JSON_LD': {
      preprocessed += '<STRUCTURED_DATA>\n';
      try {
        preprocessed += JSON.stringify(JSON.parse(payload.content), null, 2);
      } catch {
        preprocessed += payload.content;
      }
      preprocessed += '\n</STRUCTURED_DATA>';
      break;
    }
    case 'TEXT': {
      preprocessed += `<TEXT_CONTENT>\n${payload.content}\n</TEXT_CONTENT>`;
      break;
    }
  }

  return preprocessed;
}

/**
 * Strip nav, footer, scripts, styles, comments. Return main body text + any
 * JSON-LD blocks found (because they often contain canonical metadata).
 */
function extractMainContentFromHtml(html: string): string {
  const $ = cheerio.load(html);

  // Remove obvious chrome
  $('script, style, noscript, nav, footer, header, aside, .nav, .footer, .header').remove();

  // Pull JSON-LD blocks separately — they are gold
  const jsonLdBlocks: string[] = [];
  cheerio
    .load(html)('script[type="application/ld+json"]')
    .each((_, el) => {
      const content = cheerio.load(html)(el).text();
      if (content.trim().length > 0) {
        try {
          jsonLdBlocks.push(JSON.stringify(JSON.parse(content), null, 2));
        } catch {
          jsonLdBlocks.push(content.trim());
        }
      }
    });

  // Try common main-content selectors, fall back to body
  let main =
    $('main').first().text() ||
    $('article').first().text() ||
    $('[role="main"]').first().text() ||
    $('body').text();

  // Collapse whitespace
  main = main.replace(/\s+/g, ' ').trim();

  let result = '';
  if (jsonLdBlocks.length > 0) {
    result += `<JSON_LD>\n${jsonLdBlocks.join('\n---\n')}\n</JSON_LD>\n\n`;
  }
  result += main;

  // Cap to avoid blowing the context window
  const MAX = 12_000;
  if (result.length > MAX) {
    result = `${result.slice(0, MAX)}\n…[truncated at ${MAX} chars]`;
  }

  return result;
}

function isRejection(json: unknown): json is { rejected: true; reason?: string } {
  return (
    typeof json === 'object' &&
    json !== null &&
    (json as { rejected?: unknown }).rejected === true
  );
}

/**
 * Confidence heuristic — averages the confidence on key fields.
 * Returns 0-1. Below 0.65 → requires_review queue.
 */
function computeExtractionConfidence(ref: ReferenceParsed): number {
  const axisConfidences = ref.axes.map((a) => a.confidence);
  const avgAxisConfidence = axisConfidences.length
    ? axisConfidences.reduce((sum, c) => sum + c, 0) / axisConfidences.length
    : 0.5;

  const hasAgency = ref.agencyCreator ? 1 : 0.7;
  const hasMarket = ref.marketPrimary ? 1 : 0.5;
  const hasAssets = ref.assets.length > 0 ? 1 : 0;

  const confidenceLevelMap: Record<ReferenceParsed['confidence'], number> = {
    HIGH: 1,
    MEDIUM: 0.75,
    LOW: 0.5,
    ESTIMATED: 0.4,
  };
  const declaredConfidence = confidenceLevelMap[ref.confidence];

  // Weighted average
  return (
    avgAxisConfidence * 0.35 +
    declaredConfidence * 0.35 +
    hasAgency * 0.1 +
    hasMarket * 0.1 +
    hasAssets * 0.1
  );
}

/**
 * For dry-run mode : derive a fixture key from the signal so the fixture extractor
 * can look up the pre-recorded LLM output.
 */
function signalToFixtureKey(signal: RawSignal): string {
  // Map well-known fixture signals to their pre-recorded outputs.
  // The fixture extractor reads tests/fixtures/llm-output-<key>.json.
  const id = signal.id;
  // Apple newsroom 2024 Think Different 25th anniversary press release
  if (id.includes('25th') || (id.includes('2024') && id.includes('think-different'))) {
    return 'think-different-25th';
  }
  // Cannes Lions 1998 Think Different case study
  if (id.includes('1998') && id.includes('think-different')) {
    return 'think-different-1998';
  }
  // Stubbed perimeter signals (cultural, performance, independent analysis) :
  // these enrich the dossier but don't become operations on their own.
  if (id.startsWith('sig_cultural_')) return 'context-cultural';
  if (id.startsWith('sig_perf_')) return 'context-performance';
  if (id.startsWith('sig_indep_')) return 'context-independent';
  return id;
}
