# Argos Workers

Two-layer ingestion pipeline for Argos. See [`docs/decisions/0008-two-layer-crawling-source-and-brand-watch.md`](../docs/decisions/0008-two-layer-crawling-source-and-brand-watch.md) for the architectural rationale.

## Quick start (dry-run, no API key needed)

```bash
cd workers
npm install
cp .env.example .env
npm run watch:apple:dry
```

This runs the Apple brand watch end-to-end against bundled fixtures, using pre-recorded LLM outputs. Result is written to `output/apple-watch-<timestamp>.json` and a console summary is printed.

## Live mode (Anthropic API key required)

```bash
# Edit .env and set ANTHROPIC_API_KEY
npm run watch:apple
```

In live mode :
- Source crawlers fetch real pages over HTTP (rate-limited, respecting robots.txt)
- The parser calls Claude Sonnet 4.6 to extract structured `Reference` + `Asset[]` from each scraped item
- Output is the same shape as dry-run, with real extracted data

## What this does

### Layer 1 — Source crawlers (`src/sources/`)

One module per source. Récolte passive et large. Implemented:

- `apple-newsroom.ts` — Apple's own press room (perimeter: `BRAND_OWNED`)
- `cannes-lions.ts` — Cannes Lions Archive entries filtered by brand (perimeter: `AWARDS_DATABASE`)

Each source crawler exports a function `crawl(config)` returning an array of `RawSignal`. Crawlers accept a `fetch` function via dependency injection — production uses `undici.fetch`, tests use a fixture loader.

### Layer 2 — Brand watch agents (`src/watches/`)

One agent per brand of interest. Orchestrates Layer 1 outputs + actively queries perimeters Layer 1 doesn't cover.

- `apple.ts` — Apple brand watch. Orchestrates `apple-newsroom` + `cannes-lions[brand=apple]` + stubs for `youtube` (brand-owned), `adage` (industry press), `cultural-signal` (memes/parodies search).

### Parser (`src/lib/parser.ts`)

Common to both layers. Takes a `RawSignal`, produces a validated `Reference` with its `Asset[]`.

Pipeline :
1. Preprocess (strip nav/footer, extract main content + structured data + media URLs)
2. LLM extraction (Anthropic Claude — system prompt with full taxonomy, JSON output)
3. Zod validation against `ReferenceSchema`
4. Retry with corrective prompt if invalid
5. Bundle assets (group by role, identify hero, link key-frames to parent videos)
6. Return validated `Reference`

### Bundler (`src/lib/bundle.ts`)

Cross-signal merger. When Layer 2 receives multiple signals that refer to the same operation (Cannes Lions entry + Apple press release + AdAge case study about the same Think Different reissue), the bundler merges them into a single `Reference`.

## Architecture diagram

```
                   ┌─────────────────────────────────────┐
                   │ Layer 1 — Source crawlers           │
                   │                                     │
                   │  apple-newsroom    cannes-lions     │
                   │      │                  │           │
                   └──────┼──────────────────┼───────────┘
                          │                  │
                          ▼                  ▼
                   ┌────────────────────────────────┐
                   │  RawSignal[]  (staging)         │
                   └─────────────┬──────────────────┘
                                 │
                   ┌─────────────▼──────────────────┐
                   │ Layer 2 — Brand watch agents    │
                   │                                 │
                   │  apple.ts                       │
                   │   ├─ filters L1 signals         │
                   │   ├─ queries non-L1 perimeters │
                   │   └─ assembles BrandDossier    │
                   └─────────────┬──────────────────┘
                                 │
                   ┌─────────────▼──────────────────┐
                   │  Parser (LLM + Zod)             │
                   │   ├─ extract structured fields  │
                   │   ├─ validate                   │
                   │   └─ bundle assets              │
                   └─────────────┬──────────────────┘
                                 │
                                 ▼
                   ┌──────────────────────────────────┐
                   │  Reference + Asset[]              │
                   │  (would be inserted into DB,      │
                   │   for now written to JSON output) │
                   └──────────────────────────────────┘
```

## Files

```
workers/
├── src/
│   ├── lib/
│   │   ├── types.ts          # Type definitions (mirrored from app)
│   │   ├── zod-schemas.ts    # Runtime validation matching the types
│   │   ├── logger.ts         # Pino structured logger
│   │   ├── fetcher.ts        # Resilient HTTP fetcher with retry + rate limit
│   │   ├── llm.ts            # Anthropic SDK wrapper with prompt caching
│   │   ├── parser.ts         # LLM-driven extraction → validated Reference
│   │   └── bundle.ts         # Cross-signal merging into operations
│   ├── prompts/
│   │   └── v1/
│   │       └── extract-operation.ts   # Versioned extraction system prompt
│   ├── sources/              # Layer 1
│   │   ├── types.ts
│   │   ├── apple-newsroom.ts
│   │   └── cannes-lions.ts
│   ├── watches/              # Layer 2
│   │   ├── types.ts
│   │   └── apple.ts
│   ├── pipeline.ts           # End-to-end orchestration
│   └── run-apple-watch.ts    # CLI entry point
├── tests/
│   └── fixtures/
│       ├── apple-newsroom-2024-think-different-25th.html
│       ├── cannes-lions-1998-think-different.json
│       └── llm-output-think-different.json
└── output/                   # Generated dossier runs
```

## Outputs

Each watch run writes to `output/apple-watch-<timestamp>.json` with the following shape :

```jsonc
{
  "watchId": "watch_apple",
  "brandSlug": "apple",
  "runStartedAt": "2026-05-12T14:23:11.234Z",
  "runDurationMs": 4271,
  "mode": "dry-run" | "live",
  "sourcesQueried": ["apple-newsroom", "cannes-lions"],
  "signalsCollected": 4,
  "operationsIdentified": 2,
  "assetsExtracted": 11,
  "operations": [/* Reference[] */],
  "signalsLog": [/* BrandSignal[] */],
  "dossierUpdate": {/* BrandDossier delta */}
}
```

## Owner

Heracles (Crawler Engineer). See [`personas/crawler-engineer.md`](../personas/crawler-engineer.md).
