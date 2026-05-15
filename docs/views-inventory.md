# Views inventory — UX coherence map

> **Status** : v1 surface, no LLM. Every view defined here uses classic data-access (Prisma) + classic search (keyword + facets).
> **Design system** : cream paper + coral accent + Inter Tight / Instrument Serif / JetBrains Mono. See `app/src/app/globals.css`.
> **Owner** : Daedalus (product) + Athena (UI consistency).

This document is the single source of truth for "which view does what" and "what state is the view in (canonical / restyled / stub / missing)". When a new view is added, append it here. When a view's job changes, edit it here first.

---

## Status legend

- ✅ **Canonical** — built in the v10 wireframe language, wired to DB.
- 🎨 **Restyled** — built in the v10 wireframe language, basic features only (no advanced facets yet).
- ⚠️ **Legacy** — exists but visually clashes with the wireframe ; uses old shadcn-style tokens.
- 🚧 **Missing** — view doesn't exist yet but the UX needs it.

---

## 1. The 4 canonical views (wireframe v10)

These are the heart of the product. Anchored to the SGCI Ouvrez-vous reference as the seed canonical example.

| # | Route | View | Job | Status |
|---|---|---|---|---|
| 01 | `/` | **Discover** | Editorial landing : hero featured + bento grid (assistant panel + 4 stat tiles + 3 secondary cards + curators strip). Search-led entry. | ✅ |
| 02 | `/work/[slug]` | **Read** | Long-form editorial dossier : cover + side stats + 4 ACTs (Bet / Execution / Result / Steal) + margin notes (axes confidence) + asset bundle strip. | ✅ |
| 03 | `/work/[slug]/inspect` | **Inspect** | Analytical view of the same reference : hero-asset display + wins row + axis bento (with confidence buckets) + performance grid (with attribution) + sources card + bundle grid. | ✅ |
| 04 | `/patterns` (`/patterns/[slug]` post-v1) | **Patterns** | Pattern trajectory : 6-phase timeline curve + 9 pins + 8 trajectory cards + filiation graph SVG + Calliope insights stack. | ✅ |

---

## 2. Library & browsing surfaces

The library has many entry points beyond the curated Discover view. These are the discoverability surfaces.

| Route | Job | Status |
|---|---|---|
| `/search` | **The classic search.** Basic mode = keyword only. Advanced mode = exposes every taxonomy facet : sector, brand, agency, market, year range, victory types, pattern kind, manipulation mode, funnel stage, pillars, operation goals, structural axes (with confidence range), asset functions (with role + kind filters), performance metrics (kind + value range + attribution), sources licence, ingest path. **Centerpiece for non-curated discovery.** | 🚧 (current /search is legacy basic) |
| `/library` (new) | Full browseable index of all references, with sort options (recent / oldest / composite / most assets / alpha) and a slim facet rail. Different from `/search` (which is intent-driven) — `/library` is exploration-driven. | 🚧 |
| `/assets` | **Asset-level browse.** Lets a DA find taglines, OOH billboards, key visuals across the entire library, filtered by 47 asset functions. Each asset links to its parent operation. | ⚠️ (exists, needs restyle) |
| `/brand/[slug]` | Brand dossier : all operations attributed to a brand, agencies of record, markets touched, time span. | ⚠️ |
| `/agency/[slug]` | Agency body of work : operations + brand roster + span. | ⚠️ |
| `/market/[slug]` | Operations active in this market, by sector + brands. | ⚠️ |
| `/year/[year]` | Operations emitted in a given year. | ⚠️ |
| `/sector/[slug]` | Sector dossier : operations + emerging patterns + top brands + editorial description. | ⚠️ |
| `/award/[slug]` | Operations recognised with a given award/victory type. | ⚠️ |
| `/by/[dimension]/[value]` | Generic catch-all for manipulation-mode, axis, pattern-kind, asset-function, operation-goal, pillar. | ⚠️ |

---

## 3. Contribution surfaces

The hands that fill the library.

| Route | Job | Status |
|---|---|---|
| `/admin/ingest` | **Manual JSON ingestion.** Paste a `research-dossier-v1` JSON, see live validation + preview, submit to DB. Layer M of the ingestion architecture. | ⚠️ (works, needs restyle) |
| `/admin/queue` (new, post-v1) | Annotation queue for low-confidence references requiring human review. | 🚧 |
| `/admin/dossiers` (new, post-v1) | List of researcher-submitted dossiers (status : pending review / approved / rejected). | 🚧 |

---

## 4. Account surfaces

For the avatar in the topbar (currently links to `/sign-in`).

| Route | Job | Status |
|---|---|---|
| `/sign-in` | Sign in via Google OAuth + magic link. | ⚠️ (legacy) |
| `/sign-up` | Sign-up flow + onboarding. | 🚧 (post-auth) |
| `/account` (new) | Profile, API keys, board ownership, billing entry point. | 🚧 |
| `/account/boards` (new, post-v1) | User boards (collections of saved references). | 🚧 |
| `/account/api-keys` (new, post-v1) | API key management. | 🚧 |

---

## 5. Commerce & info surfaces

The marketing layer.

| Route | Job | Status |
|---|---|---|
| `/pricing` | 4 tiers : Free / Pro Individual / Pro Team / Agency / (Enterprise on contact). | ⚠️ |
| `/about` | What Argos is, who it's for, the editorial position. | ⚠️ |
| `/contact` | Sales contact for Agency/Enterprise. | 🚧 |
| `/journal` (new, optional) | Newsletter archive + long-form articles. | 🚧 |

---

## 6. System surfaces

The plumbing the user sees only on errors or as fallbacks.

| Route | Job | Status |
|---|---|---|
| `/404` (not-found) | Empty state when a route resolves to nothing. | ⚠️ |
| `/500` (error) | Crash fallback. | 🚧 |
| `/api/v1` | REST API self-describing root. | ✅ |

---

## 7. Priority for restyling work

If we touch one thing at a time, do them in this order :

1. **`/search` (build advanced facets)** — the single biggest UX gap. Daily-driver for non-curated discovery.
2. **`/library` (new)** — covers "I just want to scroll the whole thing".
3. **Entity pages** — restyle `/brand`, `/agency`, `/market`, `/year`, `/award`, `/sector`, `/by/*` together (they share the EntityPageShell pattern, one component fix covers all six).
4. **`/assets` restyle** — particularly valuable for DAs who care about tagline/KV/OOH-level browsing.
5. **`/admin/ingest` restyle** — currently the only writer surface ; should match the design.
6. **`/sign-in` + `/account` + 404** — accept users politely in the new aesthetic.
7. **`/about` + `/pricing`** — final marketing polish.

---

## 8. Layout primitives shared across views

These are the shared building blocks. They live in `app/src/components/` and `app/src/app/globals.css`.

| Primitive | Used by | Job |
|---|---|---|
| `topbar` (in layout) | All views | Sticky cream header with brand mark, view nav pill, live counter, settings + avatar. |
| `.wrap` | All views | Centred page container (1440px max). |
| `.pill` (+ variants coral / butter / sage / lav / sky / dark) | All views | Tag chips with category colour. |
| `.card`, `.b-card`, `.ss`, `.mc`, `.ax-c`, `.perf-c`, `.srcs-c`, `.bund-c` | View-specific | Cream paper cards with rounded radius and warm border. |
| `.ph-1` … `.ph-6` | Discover / Read / Patterns | Phase-coloured gradient backdrops for asset stand-ins. |
| `serif` class | All views | Italic Instrument Serif for editorial emphasis. |
| `mono` class | All views | JetBrains Mono for codes, IDs, dates. |

---

## 9. Out-of-scope for v1 (do NOT build these)

- Anything that requires an LLM at runtime (auto-classification, semantic search, content generation, "Argos assistant" voice/chat)
- Vector search (pgvector)
- MCP server endpoints
- Consultation engine (8-phase procedural)
- Trajectory auto-computation
- Filiation auto-detection
- Embedding generation

These show up in the wireframe (e.g. the "Argos assistant" panel in Discover, the filiation graph in Patterns) **as static editorial elements** — the user types in the assistant box and we route to `/search` ; the filiation graph is hand-authored editorial content. No actual AI runs in v1.

---

## 10. Version this doc

Update this file in the PR that ships a new view. Append rows ; don't restructure unless the taxonomy of views itself changes.
