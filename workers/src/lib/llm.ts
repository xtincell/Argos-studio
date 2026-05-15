// Anthropic Claude SDK wrapper. Used by the parser to extract structured
// References from raw signals. Supports a fixture mode for dry runs that
// uses pre-recorded LLM outputs (so the worker is runnable without an API key).

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.js';

const log = logger.child({ component: 'llm' });

const MODEL = process.env.ARGOS_LLM_MODEL ?? 'claude-sonnet-4-6';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Use --dry-run to operate against fixtures without calling the API.',
    );
  }
  client = new Anthropic({ apiKey });
  return client;
}

export interface LLMExtractRequest {
  systemPrompt: string;
  userContent: string;
  /** Used by fixture mode to look up a pre-recorded output. */
  fixtureKey?: string;
}

export interface LLMExtractResult {
  /** Parsed JSON output from the model. */
  json: unknown;
  /** Raw text response, for debugging. */
  raw: string;
  /** Approximate input + output token usage (live mode only). */
  usage?: { input: number; output: number };
  fromFixture: boolean;
}

export type LLMExtractor = (req: LLMExtractRequest) => Promise<LLMExtractResult>;

/**
 * Live extractor: calls Claude via the Anthropic SDK with prompt caching.
 */
export const liveExtractor: LLMExtractor = async (req) => {
  const c = getClient();
  log.info({ model: MODEL, contentLen: req.userContent.length }, 'calling Claude');

  // TODO: enable prompt caching via cache_control once the SDK type surface supports it
  // (upgrade to @anthropic-ai/sdk ^0.40 or use the beta header). For now we send the
  // system prompt every call. Argos pays the cost for the system prompt re-send.
  const response = await c.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: req.systemPrompt,
    messages: [
      {
        role: 'user',
        content: req.userContent,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const raw = textBlock && textBlock.type === 'text' ? textBlock.text : '';

  const json = extractJsonFromText(raw);
  return {
    json,
    raw,
    usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
    fromFixture: false,
  };
};

/**
 * Fixture extractor: reads a pre-recorded JSON from tests/fixtures/llm-output-<key>.json.
 * Used in dry-run mode so the pipeline is testable without API access.
 */
export const fixtureExtractor: LLMExtractor = async (req) => {
  if (!req.fixtureKey) {
    throw new Error(
      'fixtureExtractor invoked without fixtureKey. The dry-run pipeline must provide a key per signal.',
    );
  }
  const path = join(process.cwd(), 'tests', 'fixtures', `llm-output-${req.fixtureKey}.json`);
  log.info({ path }, 'using fixture LLM output');
  const body = readFileSync(path, 'utf8');
  const json = JSON.parse(body);
  return { json, raw: body, fromFixture: true };
};

export function getExtractor(opts: { useFixtures: boolean }): LLMExtractor {
  if (opts.useFixtures) return fixtureExtractor;
  return liveExtractor;
}

/**
 * The model may wrap JSON in markdown fences or add prose. Extract the JSON block.
 * Throws if no parseable JSON is found.
 */
export function extractJsonFromText(text: string): unknown {
  // Try direct parse first
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // fallthrough
    }
  }

  // Try fenced block
  const fenced = trimmed.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim());
  }

  // Try first {...} or [...] in the text
  const firstObj = trimmed.match(/\{[\s\S]*\}/);
  if (firstObj) {
    return JSON.parse(firstObj[0]);
  }

  throw new Error(`No parseable JSON found in LLM output. Raw: ${trimmed.slice(0, 200)}`);
}
