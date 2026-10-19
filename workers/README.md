# Argos Workers

Two-layer ingestion pipeline for Argos. See [`docs/decisions/0008-two-layer-crawling-source-and-brand-watch.md`](../docs/decisions/0008-two-layer-crawling-source-and-brand-watch.md) for the architectural rationale.

## Réception 0.1.1 — partielle

`npm test` reçoit dix scénarios sans appel réseau ni LLM payant. Les fixtures
sont une démonstration, pas des preuves de campagnes réellement exécutées.
Chaque source rend un reçu `FIXTURE`, `OBSERVED`, `NO_SIGNAL`, `PARTIAL`,
`UNAVAILABLE` ou `FAILED`. Une panne conserve les observations des autres sources
et d'autres articles ; `NO_SIGNAL` ne prouve pas la couverture complète.
Cannes et les trois périmètres stub restent indisponibles en mode vivant.
Aucune fixture ne leur est substituée. Une option CLI inconnue est refusée
avant le choix du mode. Seuls `--dry-run` et `--limit=<entier positif>` sont admis.

Le bundle exige marque, année et identité id/slug identiques. Partager une
campagne ombrelle ne prouve pas que deux opérations sont identiques. Les mesures
de sources, dates, valeurs ou attributions différentes sont conservées ; seul
leur rejeu identique est dédupliqué. Les axes restent une sélection heuristique
et les actifs de même id restent premier reçu : les signaux bruts sont conservés
pour revue. Ces arbitrages, la sécurité des URL, les quotas, l'authentification,
la collecte vivante et l'admission dans le fonds canonique restent à recevoir.

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
- Apple Newsroom fetches real pages over HTTP with rate limiting. Robots/terms
  enforcement and complete coverage are not implemented or received.
- The parser calls Claude Sonnet 4.6 to extract structured `Reference` + `Asset[]` from each scraped item
- Unavailable sources are explicit; a result is not a certificate of complete coverage.

## What this does

### Layer 1 — Source crawlers (`src/sources/`)

One module per source. Récolte passive et large. Implemented:

- `apple-newsroom.ts` — Apple's own press room (perimeter: `BRAND_OWNED`)
- `cannes-lions.ts` — fixtures only; live access is unavailable (`AWARDS_DATABASE`)

Each crawler exports `crawl(config)` returning `RawSignal[]`. Newsroom's live
function accepts an injected fetcher for tests. The collector retains partial
signals and a qualified receipt; no shared live access has been received.

### Layer 2 — Brand watch agents (`src/watches/`)

One agent per brand of interest. Orchestrates Layer 1 outputs + actively queries perimeters Layer 1 doesn't cover.

- `apple.ts` — Apple Newsroom, Cannes, cultural/performance/independent-analysis stubs.

### Parser (`src/lib/parser.ts`)

Common to both layers. Takes a `RawSignal`, produces a validated `Reference` with its `Asset[]`.

Pipeline :
1. Preprocess (strip nav/footer, extract main content + structured data + media URLs)
2. LLM extraction (Anthropic Claude — system prompt with full taxonomy, JSON output)
3. Zod validation against `ReferenceSchema`
4. Invalid extraction returns a review entry; no corrective retry is implemented
5. Return validated `Reference`; assets are those supplied by the extractor

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
                   │   └─ returns watch results    │
                   └─────────────┬──────────────────┘
                                 │
                   ┌─────────────▼──────────────────┐
                   │  Parser (LLM + Zod)             │
                   │   ├─ extract structured fields  │
                   │   ├─ validate                   │
                   │   └─ validate assets            │
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

`src/run-apple-watch.ts` orchestrates the CLI; `src/watches/apple.ts` prepares
signals, `src/lib/collect.ts` retains qualified collection receipts,
`src/lib/parser.ts` validates extraction, and `src/lib/bundle.ts` groups operations.
`tests/watch-integrity.test.ts` uses bundled fixtures and injected HTTP responses.
There is no `pipeline.ts`, automatic database admission or dossier-update writer.

## Outputs

Each watch run writes to `output/apple-watch-<timestamp>.json` with the following shape :

```jsonc
{
  "watchId": "watch_apple",
  "brandSlug": "apple",
  "runStartedAt": "2026-05-12T14:23:11.234Z",
  "runDurationMs": 4271,
  "mode": "dry-run" | "live",
  "sourcesQueried": ["apple-newsroom"],
  "sourceReceipts": [{"source":"cannes-lions", "perimeter":"AWARDS_DATABASE", "status":"UNAVAILABLE", "signalCount":0}],
  "signalsCollected": 4,
  "operationsIdentified": 2,
  "assetsExtracted": 11,
  "operations": [/* Reference[] */],
  "signalsLog": [/* ParsedSignal[] */]
}
```

## Owner

Heracles (Crawler Engineer). See [`personas/crawler-engineer.md`](../personas/crawler-engineer.md).
