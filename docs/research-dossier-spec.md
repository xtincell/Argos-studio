# Research Dossier — construction spec (research-dossier-v1)

> **Audience** : researchers, editorial contributors, and any research artifact that produces dossier JSON.
> **Contract location** : `app/src/lib/research-dossier.ts` (Zod schema is the authoritative source of truth).
> **Endpoint** : `POST /api/v1/ingest/dossier` on the Argos site.
> **Template** : [`/dossier-template.json`](/dossier-template.json) · **Example** : [`/dossier-example.json`](/dossier-example.json)

This document defines the JSON that a researcher (human or research artifact) builds to ingest a marketing operation into Argos manually. It complements the automated crawler+watch pipeline (see [ADR-0008](decisions/0008-two-layer-crawling-source-and-brand-watch.md)) by covering operations the crawlers can't reach.

---

## 1. When to use this path

Use manual ingestion when :

- The operation is in a market the crawlers don't yet cover (most francophone African markets, niche regional campaigns)
- The sources are behind paywalls Argos doesn't have licensed access to (WARC, paid Cannes Lions Archive, Kantar tracker excerpts)
- The operation is on the ground — OOH photographed in person, activation captured by a community contributor, packaging found in a store
- The editorial nuance requires human judgment the parser can't yet make

Do **not** use manual ingestion when the operation is already covered by a brand watch — the watch will produce a cleaner record.

---

## 2. Schema overview

The dossier has nine top-level fields. Required unless marked optional.

```jsonc
{
  "schemaVersion": "research-dossier-v1",
  "researcher": { "name": "...", "contact": "...", "toolUsed": "..." },
  "researchDate": "YYYY-MM-DD",
  "operation": { /* identity */ },
  "sources": [ /* ≥1 */ ],
  "assets": [ /* ≥1, exactly one HERO */ ],
  "classification": { /* patternKind, manipulationMode, ... */ },
  "axes": [ /* ≥1, each with evidence */ ],
  "performance": { /* metrics + composite */ },
  "victoryTypes": [],
  "summary": "...",
  "patternObservation": "...", // optional
  "significance": "...",        // optional
  "confidence": "MEDIUM"
}
```

---

## 3. Field reference

### 3.1 Meta

| Field | Type | Required | Notes |
|---|---|---|---|
| `schemaVersion` | string literal | yes | Must be `"research-dossier-v1"`. New versions will live alongside, the ingester routes by this field. |
| `researcher.name` | string | yes | Full name. Will be displayed as attribution if the dossier is published. |
| `researcher.contact` | email | optional | For follow-up questions only. Not displayed publicly. |
| `researcher.toolUsed` | string | optional | What you used (e.g. `"Argos Research Helper artefact v1.2 + manual fact-check + LBB Africa archive"`). Helps trace future quality issues to their source. |
| `researchDate` | `YYYY-MM-DD` | yes | When the research was done. Independent from the operation's `emissionYear`. |

### 3.2 Operation identity

```jsonc
"operation": {
  "title": "Ouvrez-vous",                       // the human title of this operation
  "brandEmitter": "Société Générale Côte d'Ivoire",
  "agencyCreator": "Voodoo Communication Abidjan",  // optional
  "sector": "Banking",
  "marketPrimary": "Côte d'Ivoire",
  "marketsSecondary": ["Sénégal", "Burkina Faso"],
  "emissionYear": 2023,
  "campaignParent": "Ouvrez-vous"               // optional, group ID across multiple operations
}
```

Rules :
- `title` is the title humans will read. Keep it short ; no marketing fluff.
- `emissionYear` is when the operation went live in market, not when it was conceived.
- `sector` should match the conventions of existing Argos sectors (Banking, Sportswear, Telecommunications, etc.). If you need a new sector, name it clearly and Calliope will normalise later.
- `marketPrimary` = the dominant market. `marketsSecondary` = adjacent markets (use sparingly).

### 3.3 Sources (required, ≥1)

Manual ingestion lives or dies by provenance. Every claim in the dossier should trace to a source.

```jsonc
"sources": [
  {
    "url": "https://www.societegenerale.ci/fr/presse/...",
    "title": "Société Générale lance Ouvrez-vous",
    "publisher": "Société Générale CI — Espace Presse",
    "publishedDate": "2023-04-12",
    "accessedDate": "2026-03-18",
    "license": "press-kit",
    "excerpt": "Avec « Ouvrez-vous », la banque s'adresse aux Ivoiriens...",
    "role": "primary"
  }
]
```

| Field | Notes |
|---|---|
| `url` | Must be a valid URL. Argos may verify reachability before publishing. |
| `accessedDate` | When you accessed the source. Required because pages change. |
| `license` | One of : `free-to-use`, `press-kit`, `fair-use`, `creator-permission`, `paid-license`, `unknown`. **`unknown` blocks publishing.** |
| `excerpt` | The most relevant quote. Helps Argos verify your claims without re-clicking. |
| `role` | `primary` (direct source for the operation) · `secondary` (independent analysis) · `context` (background only). |

#### Licensing guidance

- **`free-to-use`** — Creative Commons (BY, BY-SA, BY-ND, etc.), public domain, brand-issued press kit explicitly marked for editorial reuse
- **`press-kit`** — Brand-issued press materials with implied editorial use (newsrooms, press portals)
- **`fair-use`** — Editorial commentary use under fair use (US) / fair dealing (UK/CA) / droit de citation (FR) for analytical content
- **`creator-permission`** — You have explicit permission from the rightsholder. Cite the grant in `excerpt` (e.g. "Permission granted via email by [name] on YYYY-MM-DD")
- **`paid-license`** — Argos has a license for this source (WARC, paid Cannes Lions Archive). Confirm with the editorial team before using.
- **`unknown`** — If unsure, mark unknown. The ingester will refuse to publish until resolved.

### 3.4 Assets (required, ≥1, exactly one HERO)

The bundle of outputs the brand actually delivered. See [`AssetFunction`](../app/src/lib/types.ts) for the 47 valid functions.

```jsonc
"assets": [
  {
    "function": "TAGLINE",             // marketing function
    "role": "HERO",                    // position in bundle
    "kind": "TEXT",                    // technical container
    "url": "",                         // empty for TEXT kind
    "aspectRatio": "4:3",
    "text": "Ouvrez-vous.",            // verbatim text for TEXT kind
    "caption": "Endline + plateforme...",
    "sourceIndex": 0                   // points to sources[0]
  },
  {
    "function": "TVC",
    "role": "PRIMARY",
    "kind": "VIDEO",
    "url": "https://...",
    "posterUrl": "https://...",
    "aspectRatio": "16:9",
    "format": "TVC 75s — RTI 1 + Canal+ Afrique",
    "durationSec": 75,
    "caption": "Film réalisé par Philippe Lacôte..."
  }
]
```

Rules :
- **Exactly one HERO asset** per dossier. The HERO is what summarises the operation — often a tagline or a hero film.
- **TEXT kind** (taglines, headlines, manifestos, body copy) : `text` must contain the verbatim text. `url` must be empty.
- **Non-TEXT kinds** : `url` must be a non-empty media URL.
- **`sourceIndex`** : index into the dossier's `sources[]` array. Lets Argos trace each asset to a source.
- **`aspectRatio`** : one of `1:1`, `4:3`, `3:4`, `16:9`, `9:16`, `21:9`, `4:5`. Match the asset's native ratio.
- **`format`** : human-readable description with concrete specs ("OOH 12x4m — Lagos Third Mainland Bridge", "TVC 30s", "Instagram Reel"). Argos uses this verbatim in the UI.

#### AssetRole semantics

| Role | When to use |
|---|---|
| `HERO` | The single asset that summarises the operation. Exactly one per dossier. |
| `PRIMARY` | First-tier output. A TVC and its KV are both PRIMARY. |
| `DECLINATION` | Variant of the same function (one of 5 OOH visuals, one of 3 social cuts). |
| `COMPANION` | Supporting asset (KV companion to a TVC, POS material to a campaign). |
| `EXTRACTED` | Derived by a pipeline (key frame from a video, OCR'd tagline). Rare in manual mode. |

### 3.5 Classification

```jsonc
"classification": {
  "patternKind": "MIXED",
  "manipulationMode": "FACILITATOR",
  "funnelStage": "CONVERSION",
  "pillars": ["A", "V", "E"],
  "operationGoals": ["DIRECT_SALE", "AWARENESS", "ADVOCACY"]
}
```

- **`patternKind`** : 14 options (IMAGE, VIDEO, AUDIO, TEXT, SPATIAL, DIGITAL_INTERACTION, MIXED, BRAND_SYSTEM, PERFORMANCE_LIVE, EDITORIAL_LONG_FORM, OBJECT, SERVICE_SIGNATURE, PERSONAL_BRAND, RITUAL). Use MIXED only when the operation legitimately spans multiple media; otherwise pick the dominant pattern.
- **`manipulationMode`** : 4 options.
  - `PEDDLER` — sells instant promise (hard sell, FMCG bas de gamme)
  - `DEALER` — builds emotional dependence (luxury, status, ritual desire)
  - `FACILITATOR` — helps the user reach their goals (service posture)
  - `ENTERTAINER` — entertains for share and reach (viral by design)
- **`funnelStage`** : 5 options. The PRIMARY goal of the operation — not all stages it touches.
- **`pillars`** : ADVE+ axes. `A` = Authenticity, `D` = Distinction, `V` = Value, `E` = Engagement, `R` = Risk, `T` = Track, `I` = Innovation, `S` = Strategy. Pick 1-3 dominant ones, not all of them.
- **`operationGoals`** : 10 options. Multiple allowed. The objectives the operation was designed to achieve.

### 3.6 Structural axes (required, ≥1, each with evidence)

This is where you bring editorial depth. Each attributed axis must cite specific evidence from the sources.

```jsonc
"axes": [
  {
    "name": "PROMISE_STRATEGY",
    "value": "Émotionnelle inversée — la banque ne promet pas un service, elle promet une émancipation personnelle dont elle est l'instrument.",
    "confidence": 0.94,
    "evidence": "Le communiqué SGCI cite explicitement « la simplicité d'ouverture devient un acte d'émancipation » ; le jury Pikine salue cette inversion.",
    "sourceIndex": 0
  }
]
```

Rules :
- 22 axis names available — see [`StructuralAxisName`](../app/src/lib/types.ts). Only attribute the axes that the operation actually exemplifies.
- **`evidence` is required** : every axis must cite specific evidence (a quote, an observation, a date). No hand-waving.
- **`confidence`** : 0-1 float. Below 0.65 = the axis is weak and should probably be omitted unless you have a strong reason.
- **`sourceIndex`** : recommended. Points to the source that documents this axis.

### 3.7 Performance

```jsonc
"performance": {
  "primaryGoals": ["DIRECT_SALE", "AWARENESS"],   // optional, falls back to classification.operationGoals
  "metrics": [
    {
      "kind": "SALES_LIFT_PCT",
      "value": 38,
      "displayValue": "+38% ouvertures de compte S2 2023",
      "goal": "DIRECT_SALE",
      "scope": "OPERATION",
      "attribution": "PROVEN_CAUSAL",
      "source": "Financial Afrik 2024-02-08 — données SGCI avec marché de contrôle",
      "sourceIndex": 3,
      "measuredAtYearMonth": "2023-12"
    }
  ],
  "rationale": "Performance commerciale prouvée avec marché de contrôle..."
}
```

| Field | Notes |
|---|---|
| `composite` | optional 0-100. If omitted, Argos computes it from metrics weighted by attribution. |
| `primaryGoals` | optional. Falls back to all `classification.operationGoals`. |
| `metrics[].kind` | One of 20 metric kinds — see [`PerformanceMetricKind`](../app/src/lib/types.ts). |
| `metrics[].scope` | `OPERATION` (whole operation) or `ASSET` (specific asset, requires `scopedAssetIndex`). |
| `metrics[].attribution` | `PROVEN_CAUSAL`, `CORRELATED`, `ESTIMATED`, `CLAIMED`. Be honest. |
| `metrics[].source` | Citation string (used directly in the UI). |
| `metrics[].measuredAtYearMonth` | `YYYY-MM`. When the metric was measured. |
| `rationale` | One paragraph explaining the composite score in editorial voice. |

#### Attribution honesty

Use the strongest attribution your sources support, no more :

- `PROVEN_CAUSAL` — Experimental design, control market, A/B test, or strong causal evidence. Effie standard.
- `CORRELATED` — Temporal correlation observed but causality not proven. Most case studies sit here.
- `ESTIMATED` — Model-derived. Argos's own cult-index, third-party scores like Brand Finance.
- `CLAIMED` — Brand or agency claim without independent verification. Use sparingly, never for SALES_LIFT_PCT or REVENUE.

### 3.8 Victory types

Multiple allowed. 14 valid values — see [`VictoryType`](../app/src/lib/types.ts).

```jsonc
"victoryTypes": ["PIKINE_GRAND_PRIX", "COMMERCIAL_IMPACT_PROVEN", "LOCAL_DOMINANCE_PROVEN"]
```

### 3.9 Editorial fields

```jsonc
"summary": "Société Générale Côte d'Ivoire renverse le contrat publicitaire bancaire : trois portraits d'Ivoiriennes qui ouvrent leur premier compte, réalisés par Philippe Lacôte. Pattern Facilitator au plus pur — la banque s'efface...",
"patternObservation": "Facilitator mode appliqué avec une discipline rare en catégorie banque francophone africaine. La marque renonce volontairement à se montrer en image...",
"significance": "Première opération bancaire francophone africaine documentée qui réussit la conjonction Facilitator + Direct sale + reconnaissance créative. Modèle probable pour les déclinaisons concurrentes (Ecobank, BICICI, NSIA) dans les 18-24 mois suivants."
```

Editorial voice rules :
- **No superlatives without proof.** Don't say "iconic" or "best-in-class" — show with metrics.
- **Concrete over abstract.** "Pikine Grand Prix Film 2023" beats "award-winning".
- **Specific over general.** Name the agency, the director, the date.
- **Length** : summary 2-3 sentences. patternObservation 1 paragraph (5-8 sentences). significance 1 paragraph.
- **Multilingual** : `summary`, `patternObservation`, `significance` should be in English. Asset `text` keeps the original language (French tagline stays French).

### 3.10 Confidence

```jsonc
"confidence": "HIGH"
```

`HIGH` / `MEDIUM` / `LOW` / `ESTIMATED`. Your overall confidence in the dossier's accuracy. Below `MEDIUM` may trigger an editorial review before publication.

---

## 4. Validation rules

The ingester runs these checks. If any fails, the dossier is rejected with field-level error messages.

- **JSON syntactically valid**
- **Schema conforms to research-dossier-v1** (Zod-validated)
- **At least 1 source** with `license !== "unknown"`
- **At least 1 asset** with **exactly one** `role === "HERO"`
- **At least 1 axis** with non-empty `evidence`
- **TEXT-kind assets** have non-empty `text` and empty `url`
- **Non-TEXT assets** have non-empty `url`
- **`scopedAssetIndex` on asset-scoped metrics** is within bounds
- **`sourceIndex` on assets / axes / metrics** is within bounds
- **`summary`** is ≥20 characters
- **`patternObservation` and `significance`** (if provided) are ≥20 characters
- **No source with `license === "unknown"`** — blocks publishing

---

## 5. The research artifact pattern (recommended)

When you produce dossiers via a research artifact :

1. **The artifact loads the spec** (this document + the Zod schema) as system context
2. **The artifact prompts the researcher** for the operation, sources, and editorial observations
3. **The artifact generates the JSON** field by field with the proper enum values
4. **The artifact runs client-side validation** against the schema before letting the researcher copy
5. **The researcher reviews and exports** the JSON
6. **The researcher pastes into Argos** at `/admin/ingest` and submits

Quality bar :
- The artifact must never invent sources. If the researcher hasn't provided one for a claim, the claim does not appear in the dossier.
- The artifact must never invent metrics. If the metric isn't in a cited source, it does not appear.
- The artifact must refuse to set `attribution: "PROVEN_CAUSAL"` unless the source describes a controlled experiment or causal study.
- The artifact must refuse to mark `license: "free-to-use"` without the researcher's explicit confirmation.

---

## 6. Versioning policy

- This is **v1**. The `schemaVersion` field locks the contract.
- **Non-breaking changes** (new optional fields, new enum values added to the end of existing enums) ship as v1 patches and are documented in this file.
- **Breaking changes** (renames, removed fields, type changes) ship as v2 alongside v1. The ingester accepts both during a 12-month transition window.
- The Zod schema in [`app/src/lib/research-dossier.ts`](../app/src/lib/research-dossier.ts) is the **authoritative source of truth**. This document explains, but the schema enforces.

---

## 7. Common mistakes & how to avoid them

| Mistake | Fix |
|---|---|
| Multiple HERO assets | Exactly one. Pick the asset that summarises the operation. Others are PRIMARY. |
| Empty `evidence` on an axis | Either find a source or remove the axis. No naked attributions. |
| `attribution: "PROVEN_CAUSAL"` on a brand-claimed metric | Downgrade to `CLAIMED` unless an independent source confirms causality. |
| `kind: "VIDEO"` with empty `url` | Either provide a hosted URL or change to `function: "TEASER"` with `kind: "IMAGE"` + storyboard. |
| `license: "unknown"` on a source | Resolve before submitting. Block on publishing. |
| Inventing a sector that doesn't match conventions | Use existing sectors when possible. If new, signal it to Calliope. |
| `marketsSecondary` filled with hopeful adjacencies | Only markets where the operation actually ran. |
| Marketing-fluff `title` ("The award-winning 2023 campaign") | Use the actual operation name. |

---

## 8. Examples

- **Filled example** : [`/dossier-example.json`](/dossier-example.json) — Société Générale Côte d'Ivoire, "Ouvrez-vous" 2023. Demonstrates a multi-source, multi-asset, performance-attributed dossier.
- **Empty template** : [`/dossier-template.json`](/dossier-template.json) — Skeleton to fill in.

---

## 9. Operational notes

- The ingester writes successful submissions to `.argos-store/ingested/<slug>.json` (gitignored) until the Prisma DB layer lands. After that, ingestions go to PostgreSQL.
- The `extractionMethod` on every asset is automatically set to `EXPERT_UPLOAD`, distinguishing manual ingestions from crawler/watch ingestions in the audit log.
- The researcher's name is attached to the reference for attribution. Editorial review (Calliope) may add annotations but does not remove researcher attribution.
- Dossiers can be re-submitted with the same `slug` (computed from brand + title + year) to amend. The latest non-rejected version wins.

---

## 10. Contact

- Schema questions : Heracles (Crawler Engineer) — owns the ingestion pipeline
- Editorial questions : Calliope (Editorial Curator) — owns the dossier quality bar
- Product questions : Daedalus (Product Architect) — owns the manual-ingestion product surface
