# Architecture — Argos

> **Owner**: Hephaistos (Tech Lead)
> **Status**: Living document. Updated when an ADR shifts the design.
> **Last reviewed**: 2026-05-12

Ce document décrit comment Argos est construit. Pour les décisions individuelles, voir les ADRs dans `decisions/`. Pour le quoi et le pourquoi, voir `PRD.md`.

## 1. Vue d'ensemble

**v1 (current) — classic stack, zero LLM dependencies.** Argos is a monorepo TypeScript app composed of :

- A Next.js (App Router) web application serving the public surface, the expert console, and the REST API v1
- A SQLite database via Prisma in development ; PostgreSQL (Neon managed) in production
- Object storage (Cloudflare R2) for binary assets (images, videos)
- Manual JSON ingestion via `/admin/ingest` (POST `/api/v1/ingest/dossier`)
- Classic search backed by Postgres full-text + structured taxonomy facets

**Out of scope for v1 :** vector search (pgvector), LLM extraction (Anthropic SDK), embeddings (Voyage AI), MCP server, async worker queue (BullMQ/Redis). These are post-v1 evolutions that require independent product justification — the manual JSON ingestion path delivers the same data shape without them.

```
                              ┌─────────────────────────┐
                              │      Public Internet     │
                              └─────────────┬───────────┘
                                            │
                          ┌─────────────────┼─────────────────┐
                          │                 │                 │
                  ┌───────▼───────┐  ┌─────▼──────┐  ┌──────▼────────┐
                  │  Public web   │  │ Console    │  │ REST API +    │
                  │  Next.js SSR  │  │ Next.js    │  │ MCP server    │
                  │  /            │  │ /admin     │  │ /api          │
                  └───────┬───────┘  └─────┬──────┘  └──────┬────────┘
                          │                │                │
                          └────────────────┼────────────────┘
                                           │
                          ┌────────────────▼────────────────┐
                          │      tRPC + Business Logic       │
                          │  (queries, mutations, services)  │
                          └────────────────┬────────────────┘
                                           │
                  ┌──────────┬──────────────┼──────────┬─────────────┐
                  │          │              │          │             │
        ┌─────────▼──┐  ┌────▼──────┐  ┌───▼────┐  ┌──▼─────┐  ┌────▼─────┐
        │PostgreSQL  │  │  R2       │  │ Redis  │  │Anthropic│  │Voyage AI │
        │+ pgvector  │  │  storage  │  │ queue  │  │  LLM    │  │embeddings│
        └────────────┘  └───────────┘  └────┬───┘  └─────────┘  └──────────┘
                                            │
                              ┌─────────────▼─────────────┐
                              │  BullMQ Workers           │
                              │  - Crawlers (per source)  │
                              │  - Extraction pipeline    │
                              │  - Embedding generation   │
                              │  - Trajectory updates     │
                              └───────────────────────────┘
```

## 2. Monorepo structure

```
argos-finder/
├── personas/              # Persona definitions (Markdown)
├── docs/                  # Documentation
│   ├── PRD.md
│   ├── architecture.md (this file)
│   ├── conventions.md
│   ├── glossary.md
│   ├── workflows.md
│   └── decisions/         # ADRs
├── app/                   # Next.js application
│   ├── src/
│   │   ├── app/           # Routes (App Router)
│   │   ├── components/    # UI components
│   │   ├── lib/           # Utilities, types, db client
│   │   ├── server/        # tRPC routers, business logic
│   │   └── styles/        # Global CSS + tokens
│   ├── public/            # Static assets
│   ├── prisma/            # Schema + migrations
│   ├── package.json
│   └── next.config.ts
├── workers/               # Background workers (separate deploys)
│   ├── crawlers/          # One module per source
│   ├── extraction/        # LLM extraction pipeline
│   ├── embedding/         # Embedding generation
│   └── trajectories/      # Trajectory computation
├── packages/              # Shared TypeScript packages
│   ├── db/                # Prisma client + schema (shared)
│   ├── extraction-prompts/# Versioned LLM prompts
│   ├── taxonomy/          # Constants, enums, validation
│   └── ui/                # Optional shared UI lib (post-v1)
├── eval/                  # Evaluation harness for prompts
│   ├── gold-standard/     # Reference annotated set
│   └── runs/              # Eval run results
├── README.md
├── pnpm-workspace.yaml
└── turbo.json             # Build orchestration
```

**Outils monorepo** : pnpm workspaces + Turborepo (build cache + task orchestration).

## 3. Application Next.js — détail

### 3.1 Routes (App Router)

```
app/
├── (public)/              # Public surfaces (SEO-indexed)
│   ├── page.tsx           # /  (landing)
│   ├── search/page.tsx    # /search
│   ├── work/[slug]/page.tsx
│   ├── sector/[slug]/page.tsx
│   ├── market/[slug]/page.tsx
│   ├── agency/[slug]/page.tsx
│   ├── brand/[slug]/page.tsx
│   ├── year/[year]/page.tsx
│   ├── award/[slug]/page.tsx
│   ├── pricing/page.tsx
│   └── about/page.tsx
├── (auth)/                # Auth surfaces
│   ├── sign-in/page.tsx
│   └── sign-up/page.tsx
├── (app)/                 # Authenticated app
│   ├── dashboard/page.tsx
│   ├── boards/[id]/page.tsx
│   ├── consultations/page.tsx
│   ├── settings/page.tsx
│   └── layout.tsx         # Auth-gated layout
├── (admin)/               # Admin / persona console
│   ├── queue/page.tsx
│   ├── work/[slug]/edit/page.tsx
│   ├── sources/page.tsx
│   └── trajectories/page.tsx
├── api/
│   ├── v1/                # Public REST API
│   ├── trpc/              # tRPC handler
│   ├── webhooks/          # Webhook handlers (Stripe, etc.)
│   ├── mcp/               # MCP server endpoint
│   └── auth/              # Auth.js routes
├── layout.tsx             # Root layout
└── globals.css            # Tokens + tailwind
```

### 3.2 Rendering strategy

- **Public surfaces (`(public)/*`)** : SSG with ISR (Incremental Static Regeneration), revalidation 1h sur les listes, 24h sur les fiches référence
- **Authenticated surfaces (`(app)/*`, `(admin)/*`)** : SSR ou client-side selon le besoin, jamais cached
- **Search page** : SSR avec hydration côté client pour les filtres interactifs

### 3.3 Data layer

```
Client (React)
    ↓ (tRPC client)
tRPC routers (server-side)
    ↓ (business logic in /server/services/)
Prisma client
    ↓
PostgreSQL
```

**Conventions** :
- Pas de Prisma direct dans les composants React
- Toute query passe par un service (`server/services/references.ts`, `server/services/consultations.ts`, etc.)
- Les routers tRPC sont des thin wrappers qui appellent les services
- Les services contiennent la logique métier et les transactions

### 3.4 Search engine

Combinaison de :
- **Full-text search** : PostgreSQL `tsvector` sur les champs textuels (title, brand, agency, description)
- **Vector search** : pgvector cosine similarity sur l'embedding de la référence
- **Filter facets** : indexes B-tree sur les champs énumérés (sector, market, year, pattern_kind)

Pipeline de recherche :
1. Parse query → extract structured filters (NLP léger pour "beer ads Nigeria 2020-2024")
2. Generate query embedding (Voyage AI multilingual)
3. Compose SQL : WHERE filters + ORDER BY (alpha × fulltext_rank + beta × vector_similarity + gamma × quality_score)
4. Return top N with pagination

Scores tuning : alpha=0.3, beta=0.5, gamma=0.2 par défaut, ajustables par config.

## 4. Pipeline d'ingestion

```
Source → Crawler → RawSourcingResult (staging)
                ↓
           Preprocessing (frames extraction, OCR, transcription)
                ↓
           Extraction LLM (Claude Sonnet 4.6)
                ↓
           Validation Zod
                ↓
           Confidence scoring
                ↓
           IF confidence < 0.65 → requires_review queue
           ELSE → Embedding generation (Voyage AI)
                ↓
           Filiation detection (vector similarity + heuristics)
                ↓
           Trajectory update
                ↓
           Reference inserted in public DB
```

### 4.1 Crawlers (workers/crawlers/)

Un module par source. Chaque module exporte :

```typescript
export interface CrawlerModule {
  name: string;
  source: SourceProvenance;
  schedule: string; // cron expression
  run: (config: CrawlerConfig) => Promise<CrawlResult>;
  healthCheck: () => Promise<HealthStatus>;
}
```

Crawlers MVP : `cannes`, `loeries`, `dandad`, `oneshow`, `effie`, `pikine`, `social-instagram`.

### 4.2 Extraction prompts (packages/extraction-prompts/)

Versionnés. Structure :

```
packages/extraction-prompts/
├── v1/
│   ├── image.md
│   ├── video.md
│   ├── audio.md
│   ├── text.md
│   └── system.md
├── v2/        # next iteration
└── index.ts   # exports prompt registry with versions
```

Chaque prompt a :
- Input schema (ce qui rentre)
- Output schema (Zod, ce qui sort)
- Eval test set (références gold-standard pour mesure d'accuracy)

### 4.3 Confidence scoring

Chaque champ extrait reçoit un score [0, 1] basé sur :
- La confiance auto-déclarée par le LLM (instructed dans le prompt système)
- La cohérence interne (cross-validation entre axes)
- La qualité de l'évidence fournie (citation présente ou non)

Score global de la référence = min des scores sur axes critiques (provenance + pattern_kind + manipulation_mode).

## 5. Schema de base de données

Voir le schéma Prisma complet dans `app/prisma/schema.prisma`. Sections principales :

- `Reference` (table centrale)
- `ReferenceAxis` (axes structurels n-to-many)
- `ReferenceFiliation` (graph)
- `ExpertAnnotation`
- `SecondaryAnalysis`
- `PatternTrajectory` + `PatternObservation`
- `Consultation` + `ConsultationUsage` (feedback loop)
- `SourcingJob` + `RawSourcingResult` (pipeline state)
- `User`, `Organization`, `Subscription` (auth + billing)
- `Board`, `BoardItem` (user collections)

Indexes critiques :
- `Reference (sector, market_primary)`
- `Reference (pattern_kind, manipulation_mode)`
- `Reference (emission_date DESC)`
- `Reference (brand_emitter)`
- `Reference USING ivfflat (embedding vector_cosine_ops)` — pgvector

Migration strategy : Prisma migrate, jamais `db push` en production.

## 6. Authentication & authorization

**Auth.js v5** :
- Providers : Google OAuth (primary), Email magic link (fallback)
- Sessions : JWT stratégie pour pages publiques + database stratégie pour sessions actives
- 2FA : optionnel pour Pro+, obligatoire pour Admin roles

**Authorization** :
- Rôles : `guest`, `free`, `pro_individual`, `pro_team_member`, `pro_team_admin`, `agency_admin`, `enterprise_admin`, `argos_admin`
- Permissions : middleware tRPC + Next.js middleware sur routes admin
- Org-level isolation : chaque ressource attribuable à une org est filtrée par `orgId`

## 7. Observability

**Logs** : structurés JSON via Pino, niveau configuré par env. Champs systématiques : `correlation_id`, `user_id`, `org_id`, `operation`, `latency_ms`, `outcome`.

**Metrics** : custom metrics exposées via PostHog (events business) et Better Stack (uptime + perf).

**Traces** : OpenTelemetry sur les flows critiques (consultation, search, ingestion). Sentry pour erreurs.

**Alertes** :
- p95 search latency > 500ms pendant 5 min → P2 Slack alert
- p95 consultation latency > 12s pendant 5 min → P1 PagerDuty
- Error rate > 1% pendant 10 min → P1
- Source crawl failure rate > 30% pendant 24h → P2

## 8. Sécurité

- **Secrets** : Vercel env vars + Doppler pour les workers
- **HTTPS** : enforced partout, HSTS activé
- **CSP** : strict, no inline scripts, no unsafe-eval
- **CORS** : whitelist explicite (argos.studio, admin.argos.studio, La Fusée production URL)
- **Rate limiting** : par IP sur endpoints publics (Upstash Ratelimit), par user sur API auth
- **Input validation** : Zod systématique en entrée tRPC, validation au niveau base via Prisma
- **SQL injection** : impossible par construction (Prisma typed queries)
- **XSS** : React échappe par défaut, vigilance sur `dangerouslySetInnerHTML` (interdit sauf cas review explicite)
- **Secrets in logs** : never log auth tokens, API keys, user PII
- **Dependency security** : Dependabot active, npm audit en CI

## 9. Performance budgets

| Surface | Metric | Budget |
|---|---|---|
| Landing page | LCP | < 1.5s |
| Landing page | TTI | < 2s |
| Search results | TTFB | < 200ms |
| Reference detail | LCP | < 2s |
| Search query | p95 latency | < 300ms |
| Consultation 8-phases | p95 latency | < 8s |
| MCP tool call (any) | p95 latency | < 1.5s |
| Lighthouse public pages | score | > 90 |
| Bundle JS (public pages) | size | < 200kb gzipped |

## 10. Coûts d'infrastructure (estimation steady state Phase 3)

| Service | Estimation USD/month |
|---|---|
| Vercel (Pro plan) | 200-400 |
| Neon (PostgreSQL managed) | 100-300 |
| Cloudflare R2 + CDN | 50-150 |
| Upstash Redis | 50-150 |
| Railway/Fly.io (workers) | 100-300 |
| Anthropic Claude API | 800-2000 |
| Voyage AI embeddings | 100-300 |
| Sentry, PostHog, Better Stack | 100-200 |
| Auth.js (Resend for magic links) | 30-100 |
| **Total** | **1500-3900 / month** |

## 11. Disaster recovery

- **Database** : Neon Point-in-Time Recovery (7 jours), nightly snapshots externes vers R2 (chiffrés)
- **Storage R2** : versioning activé, retention 30 jours
- **Code** : GitHub multi-region replication automatique
- **Deploy** : capacité rollback en 1 commande Vercel + workers
- **Runbooks** : documentés dans `docs/runbooks/` pour scénarios majeurs (db down, crawler en boucle, fuite secret, etc.)

## 12. Local development

```bash
# Setup
pnpm install
cp .env.example .env.local
# Fill .env.local with your secrets
pnpm db:migrate
pnpm db:seed

# Run
pnpm dev          # web app on :3000
pnpm worker:dev   # workers
pnpm db:studio    # Prisma Studio on :5555

# Tests
pnpm test         # unit tests (Vitest)
pnpm test:e2e     # Playwright e2e
pnpm test:eval    # extraction prompt evals
```

## 13. Evolutivité

Points de friction futurs identifiés et plan :

- **Volume references > 100k** : envisager partitioning PostgreSQL par year, archive cold storage
- **Embeddings recalcul** : si on change de modèle embeddings, batch re-encoding via worker dédié
- **MCP load** : si Artemis et autres agents montent en charge, séparer MCP server du Next.js (déploiement dédié)
- **Multi-region** : si trafic international significatif, edge functions Vercel + DB read replicas (Neon supports read replicas)
- **Workflow d'annotation** : si la queue dépasse 1000 items pendant > 14 jours, hire annotateurs externes dédiés

## 14. Changelog architecture

| Date | Change | Reason |
|---|---|---|
| 2026-05-12 | Initial architecture documented | Project bootstrap |
