import { slugify } from './utils';
// ResearchDossier — the JSON contract for manual ingestion.
//
// A researcher (human + Claude artifact + their own toolkit) builds this object
// and submits it to /api/v1/ingest/dossier. The ingester validates with Zod,
// transforms to a Reference, and stores it alongside crawler-produced data.
//
// Schema versioning : the schemaVersion field is REQUIRED on every dossier.
// When the schema evolves (additions are non-breaking ; renames or removals
// require a new major version), the ingester routes by schemaVersion.
//
// Source licensing in this format is FIRST-CLASS : each source carries its
// licensing posture so Argos can refuse to publish if the dossier relies on
// unlicensed material.

import { z } from 'zod';
import type {
  Asset,
  AssetExtractionMethod,
  PerformanceScore,
  Reference,
  StructuralAxis,
} from './types';

/* -------------------------------------------------------------------------- */
/* Schema versions accepted by the ingester                                   */
/* -------------------------------------------------------------------------- */

export const SUPPORTED_DOSSIER_VERSIONS = ['research-dossier-v1'] as const;

/* -------------------------------------------------------------------------- */
/* Enums — duplicated from types.ts (because Zod can't reference types)       */
/* -------------------------------------------------------------------------- */

const PatternKindZ = z.enum([
  'IMAGE', 'VIDEO', 'AUDIO', 'TEXT', 'SPATIAL', 'DIGITAL_INTERACTION',
  'MIXED', 'BRAND_SYSTEM', 'PERFORMANCE_LIVE', 'EDITORIAL_LONG_FORM',
  'OBJECT', 'SERVICE_SIGNATURE', 'PERSONAL_BRAND', 'RITUAL',
]);
const ManipulationModeZ = z.enum(['PEDDLER', 'DEALER', 'FACILITATOR', 'ENTERTAINER']);
const FunnelStageZ = z.enum(['AWARENESS', 'CONSIDERATION', 'CONVERSION', 'RETENTION', 'ADVOCACY']);
const PillarZ = z.enum(['A', 'D', 'V', 'E', 'R', 'T', 'I', 'S']);
const ConfidenceLevelZ = z.enum(['HIGH', 'MEDIUM', 'LOW', 'ESTIMATED']);

const AssetKindZ = z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'TEXT', 'EMBED_YOUTUBE', 'EMBED_VIMEO']);
const AssetFunctionZ = z.enum([
  'TAGLINE', 'HEADLINE', 'BODY_COPY', 'MANIFESTO', 'CLAIM',
  'KEY_VISUAL', 'KEY_FRAME', 'PRINT_AD', 'POSTER',
  'OOH_BILLBOARD', 'OOH_TRANSIT', 'OOH_DIGITAL',
  'TVC', 'BRAND_FILM', 'TEASER', 'CUT_DOWN', 'EXPLAINER',
  'SOCIAL_POST_STATIC', 'SOCIAL_POST_VIDEO', 'REEL', 'STORY', 'TIKTOK_NATIVE', 'YOUTUBE_LONG',
  'RADIO_SPOT', 'JINGLE', 'SOUND_LOGO', 'PODCAST_EPISODE',
  'LOGO_LOCKUP', 'PACKAGING', 'POS_MATERIAL', 'MERCH', 'TYPOGRAPHY_SPECIMEN',
  'WEBSITE_PAGE', 'LANDING_PAGE', 'MICROSITE', 'APP_SCREEN', 'EMAIL_DESIGN', 'NEWSLETTER', 'AR_FILTER', 'INTERACTIVE_EXPERIENCE',
  'ACTIVATION_PHOTO', 'ACTIVATION_VIDEO', 'EVENT_DOCUMENTATION', 'SPONSORSHIP_ASSET',
  'INFLUENCER_CONTENT', 'UGC_BRANDED', 'PRESS_KIT', 'CASE_STUDY_OFFICIAL',
  'BEHIND_THE_SCENES_PHOTO', 'BEHIND_THE_SCENES_VIDEO', 'CREATIVE_BRIEF_PUBLIC',
]);
const AssetRoleZ = z.enum(['HERO', 'PRIMARY', 'DECLINATION', 'COMPANION', 'EXTRACTED']);
const AspectRatioZ = z.enum(['1:1', '4:3', '3:4', '16:9', '9:16', '21:9', '4:5']);

const OperationGoalZ = z.enum([
  'DIRECT_SALE', 'AWARENESS', 'CONSIDERATION', 'CONVERSION',
  'RETENTION', 'ADVOCACY', 'BRAND_WORLD_BUILDING',
  'CATEGORY_DEFINITION', 'CRISIS_RESPONSE', 'RECRUITMENT',
]);
const PerformanceMetricKindZ = z.enum([
  'SALES_LIFT_PCT', 'UNITS_SOLD', 'REVENUE_USD', 'ROAS', 'CONVERSION_RATE_PCT',
  'REACH_PERSONS', 'IMPRESSIONS', 'RECALL_UNAIDED_PCT', 'BRAND_SEARCH_LIFT_PCT', 'SHARE_OF_VOICE_PCT',
  'NPS_DELTA', 'BRAND_PREFERENCE_PCT', 'CULT_INDEX_0_100', 'CULTURAL_PENETRATION_0_100',
  'AWARDS_GOLD_COUNT', 'IMITATION_COUNT', 'LONGEVITY_MONTHS',
  'ENGAGEMENT_RATE_PCT', 'UGC_VOLUME', 'COMPLETION_RATE_PCT',
]);
const AttributionConfidenceZ = z.enum(['PROVEN_CAUSAL', 'CORRELATED', 'ESTIMATED', 'CLAIMED']);

const StructuralAxisNameZ = z.enum([
  'FILIATION', 'PROVOCATION', 'AUCTORIALITY', 'SERIAL_RECURRENCE',
  'CULTURAL_DECALAGE', 'COGNITIVE_MECHANISM', 'CULTURAL_TEMPO',
  'MORAL_VALENCE', 'META_CONSCIOUSNESS', 'NARRATIVE_DENSITY',
  'TEMPORAL_MODALITY', 'RECIPIENT_AUTHORSHIP', 'EXTERNAL_REFERENTIALITY',
  'REQUIRED_CULTURAL_CAPITAL', 'INFO_VS_EMOTION_DENSITY', 'PROMISE_STRATEGY',
  'MEME_CREATION_VS_RECOVERY', 'ATTENTION_PATTERN', 'CATEGORICAL_FIDELITY',
  'COMPETITOR_POSTURE', 'ASSUMED_AMBIGUITY', 'BRAND_CHARACTER_STRATEGY',
]);

const VictoryTypeZ = z.enum([
  'CANNES_LIONS_GOLD', 'CANNES_LIONS_SILVER', 'CANNES_LIONS_BRONZE',
  'DANDAD_PENCIL', 'EFFIE_GOLD', 'LOERIES_GRAND_PRIX', 'PIKINE_GRAND_PRIX',
  'LOCAL_DOMINANCE_PROVEN', 'VIRAL_REACH', 'LONGEVITY_PROVEN',
  'CULT_STATUS_DOCUMENTED', 'COMMERCIAL_IMPACT_PROVEN',
  'BRAND_WORLD_DOOR', 'COMPETITOR_IMITATED',
]);

/* -------------------------------------------------------------------------- */
/* ResearchDossier-specific enums                                             */
/* -------------------------------------------------------------------------- */

const SourceLicenseZ = z.enum([
  'free-to-use',         // Creative Commons, public domain, brand-issued press kit
  'press-kit',           // Brand-issued press materials with implied editorial use
  'fair-use',            // Editorial commentary use under fair use / fair dealing
  'creator-permission',  // Explicit permission from the creator (cite the grant)
  'paid-license',        // Argos has a license (Cannes Lions, WARC, etc.)
  'unknown',             // Licensing posture unclear — Argos will not publish
]);

const SourceRoleZ = z.enum([
  'primary',    // direct source for the operation (brand press release, agency case study)
  'secondary',  // independent analysis (press article, podcast, academic paper)
  'context',    // background only (industry context, competitor moves)
]);

const FiliationRelationshipZ = z.enum([
  'DIRECT_HOMAGE',
  'PARODY',
  'PASTICHE',
  'PATTERN_REPRODUCTION',
  'POSITIONAL_INVERSION',
  'CITATION_EXPLICIT',
  'CITATION_IMPLICIT',
]);

const FiliationDirectionZ = z.enum(['inspires', 'inspired_by']);

export const ResearchFiliationSchema = z.object({
  /** Direction from this dossier's perspective. */
  direction: FiliationDirectionZ,
  /** Slug of the target reference (must resolve at seed time). */
  targetSlug: z.string().min(1),
  /** Optional display label for the target (used if not yet seeded). */
  targetTitle: z.string().optional(),
  relationshipType: FiliationRelationshipZ,
  evidence: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

/* -------------------------------------------------------------------------- */
/* The schema                                                                  */
/* -------------------------------------------------------------------------- */

export const ResearchSourceSchema = z.object({
  url: z.string().url().refine(value => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; } }, 'Une URL HTTP(S) sans identifiants est requise.'),
  title: z.string().min(1),
  publisher: z.string().optional(),
  /** YYYY-MM-DD */
  publishedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** YYYY-MM-DD */
  accessedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  license: SourceLicenseZ,
  excerpt: z.string().optional(),
  role: SourceRoleZ,
});

export const ResearchAssetSchema = z.object({
  function: AssetFunctionZ,
  role: AssetRoleZ,
  kind: AssetKindZ,
  /** For media assets: hosted URL. For TEXT assets: empty string. */
  url: z.string(),
  posterUrl: z.string().min(1).optional(),
  aspectRatio: AspectRatioZ,
  /** For TEXT kind only: the actual verbatim text (tagline, headline, manifesto, body copy). */
  text: z.string().optional(),
  format: z.string().optional(),
  caption: z.string().optional(),
  alt: z.string().optional(),
  durationSec: z.number().positive().optional(),
  /** Index into the sources[] array that documents this asset. Optional but recommended. */
  sourceIndex: z.number().int().nonnegative().optional(),
  /** Per-asset license override (if different from the source's general license). */
  sourceLicense: SourceLicenseZ.optional(),
});

export const ResearchAxisSchema = z.object({
  name: StructuralAxisNameZ,
  value: z.string().min(1),
  confidence: z.number().min(0).max(1),
  /** Required in manual mode — every axis must cite specific evidence. */
  evidence: z.string().min(1),
  sourceIndex: z.number().int().nonnegative().optional(),
});

export const ResearchMetricSchema = z.object({
  kind: PerformanceMetricKindZ,
  value: z.number(),
  displayValue: z.string().optional(),
  goal: OperationGoalZ,
  scope: z.enum(['OPERATION', 'ASSET']),
  /** Index into assets[] when scope=ASSET. */
  scopedAssetIndex: z.number().int().nonnegative().optional(),
  attribution: AttributionConfidenceZ,
  /** Citation string (used as PerformanceMetric.source in the Reference). */
  source: z.string().min(1),
  sourceIndex: z.number().int().nonnegative().optional(),
  /** YYYY-MM */
  measuredAtYearMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const ResearchDossierSchema = z
  .object({
    schemaVersion: z.literal('research-dossier-v1'),

    researcher: z.object({
      name: z.string().min(1),
      contact: z.string().email().optional(),
      /** Indicate what was used : "Claude artifact v1.2", "manual + Google + WARC trial", etc. */
      toolUsed: z.string().optional(),
    }),
    /** YYYY-MM-DD */
    researchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

    operation: z.object({
      title: z.string().min(1),
      brandEmitter: z.string().min(1),
      agencyCreator: z.string().optional(),
      sector: z.string().min(1),
      marketPrimary: z.string().min(1),
      marketsSecondary: z.array(z.string()).default([]),
      emissionYear: z.number().int().min(1900).max(2100),
      campaignParent: z.string().optional(),
    }),

    /** Required — manual ingestion lives or dies by provenance. */
    sources: z.array(ResearchSourceSchema).min(1),

    /** At least one asset required — the operation IS its bundle. */
    assets: z.array(ResearchAssetSchema).min(1),

    classification: z.object({
      patternKind: PatternKindZ,
      manipulationMode: ManipulationModeZ,
      funnelStage: FunnelStageZ,
      pillars: z.array(PillarZ).min(1),
      operationGoals: z.array(OperationGoalZ).min(1),
    }),

    axes: z.array(ResearchAxisSchema).min(1),

    performance: z.object({
      composite: z.number().min(0).max(100).optional(),
      primaryGoals: z.array(OperationGoalZ).optional(),
      metrics: z.array(ResearchMetricSchema).default([]),
      overallAttribution: AttributionConfidenceZ.optional(),
      rationale: z.string().optional(),
    }),

    victoryTypes: z.array(VictoryTypeZ).default([]),

    /**
     * Filiations — directional links to other dossiers. Resolved at seed time by slug.
     * Both directions can be declared from a single dossier; the seeder de-dupes.
     */
    filiations: z.array(ResearchFiliationSchema).default([]),

    summary: z.string().min(20),
    patternObservation: z.string().min(20).optional(),
    significance: z.string().min(20).optional(),

    confidence: ConfidenceLevelZ.default('MEDIUM'),
  })
  .superRefine((dossier, ctx) => {
    // Asset-level metrics must reference a valid asset index
    for (const [i, metric] of dossier.performance.metrics.entries()) {
      if (metric.scope === 'ASSET') {
        if (metric.scopedAssetIndex === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['performance', 'metrics', i, 'scopedAssetIndex'],
            message: 'Asset-scoped metric must reference a scopedAssetIndex',
          });
        } else if (metric.scopedAssetIndex >= dossier.assets.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['performance', 'metrics', i, 'scopedAssetIndex'],
            message: `scopedAssetIndex ${metric.scopedAssetIndex} out of bounds (assets.length = ${dossier.assets.length})`,
          });
        }
      }
    }
    // sourceIndex on assets must be valid
    for (const [i, asset] of dossier.assets.entries()) {
      if (asset.sourceIndex !== undefined && asset.sourceIndex >= dossier.sources.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['assets', i, 'sourceIndex'],
          message: `sourceIndex ${asset.sourceIndex} out of bounds (sources.length = ${dossier.sources.length})`,
        });
      }
    }
    // sourceIndex on axes must be valid
    for (const [i, axis] of dossier.axes.entries()) {
      if (axis.sourceIndex !== undefined && axis.sourceIndex >= dossier.sources.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['axes', i, 'sourceIndex'],
          message: `sourceIndex ${axis.sourceIndex} out of bounds`,
        });
      }
    }
    // Exactly one HERO asset
    for (const [i, metric] of dossier.performance.metrics.entries()) {
      if (metric.sourceIndex !== undefined && metric.sourceIndex >= dossier.sources.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['performance', 'metrics', i, 'sourceIndex'],
          message: 'sourceIndex is outside this dossier',
        });
      }
    }
    const heroes = dossier.assets.filter((a) => a.role === 'HERO');
    if (heroes.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['assets'],
        message: `Exactly one HERO asset is required ; found ${heroes.length}`,
      });
    }
    // TEXT-kind assets must have text, non-TEXT must not rely on text alone
    for (const [i, asset] of dossier.assets.entries()) {
      if (asset.sourceLicense === 'unknown') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['assets', i, 'sourceLicense'],
          message: 'Asset license is unresolved. Resolve it before publication.',
        });
      }
      if (asset.kind === 'TEXT' && (!asset.text || asset.text.trim().length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['assets', i, 'text'],
          message: 'TEXT-kind asset must include the verbatim text',
        });
      }
      if (asset.kind !== 'TEXT' && asset.url.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['assets', i, 'url'],
          message: 'Non-TEXT asset must have a non-empty url',
        });
      }
    }
    // Reject if any source has license=unknown — Argos will not publish unlicensed material
    for (const [i, source] of dossier.sources.entries()) {
      if (source.license === 'unknown') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sources', i, 'license'],
          message:
            'Source license is unknown. Argos will not publish material with unresolved licensing.',
        });
      }
    }
  });

export type ResearchDossier = z.infer<typeof ResearchDossierSchema>;
export type ResearchSource = z.infer<typeof ResearchSourceSchema>;
export type ResearchAsset = z.infer<typeof ResearchAssetSchema>;

/* -------------------------------------------------------------------------- */
/* Transformer : ResearchDossier → Reference                                  */
/* -------------------------------------------------------------------------- */

export interface TransformResult {
  reference: Reference;
  /** Audit trail describing how the dossier mapped to the reference. */
  audit: {
    generatedSlug: string;
    generatedAssetIds: string[];
    compositeScoreSource: 'provided-by-researcher' | 'computed-from-metrics' | 'not-measured';
    sourcesCount: number;
    notes: string[];
  };
}

/**
 * Transform a validated ResearchDossier into a Reference + Asset[].
 * Idempotent and pure — does not write anywhere. Caller decides what to do with the result.
 */
export function dossierToReference(dossier: ResearchDossier): TransformResult {
  const slug = generateSlug(dossier);
  const refId = `ref_${slug}`;

  const assets: Asset[] = dossier.assets.map((a, i) => {
    const assetId = `a_${slug}_${i.toString().padStart(2, '0')}_${a.function.toLowerCase()}`;
    const extractionMethod: AssetExtractionMethod = 'EXPERT_UPLOAD';
    return {
      id: assetId,
      kind: a.kind,
      function: a.function,
      role: a.role,
      url: a.url,
      posterUrl: a.posterUrl,
      aspectRatio: a.aspectRatio,
      text: a.text,
      caption: a.caption,
      alt: a.alt,
      durationSec: a.durationSec,
      format: a.format,
      extractionMethod,
      sourceUrl: a.sourceIndex === undefined ? undefined : dossier.sources[a.sourceIndex]?.url,
      sourceLicense: a.sourceLicense ?? (a.sourceIndex === undefined ? undefined : dossier.sources[a.sourceIndex]?.license),
    };
  });

  const performance = buildPerformanceScore(dossier, assets);
  const axes: StructuralAxis[] = dossier.axes.map((a) => ({
    name: a.name,
    value: a.value,
    confidence: a.confidence,
    evidence: a.evidence,
    sourceUrl: a.sourceIndex === undefined ? undefined : dossier.sources[a.sourceIndex]?.url,
  }));

  const reference: Reference = {
    id: refId,
    slug,
    title: dossier.operation.title,
    assets,
    brandEmitter: dossier.operation.brandEmitter,
    agencyCreator: dossier.operation.agencyCreator,
    sector: dossier.operation.sector,
    marketPrimary: dossier.operation.marketPrimary,
    marketsSecondary: dossier.operation.marketsSecondary,
    emissionYear: dossier.operation.emissionYear,
    campaignParent: dossier.operation.campaignParent,
    patternKind: dossier.classification.patternKind,
    manipulationMode: dossier.classification.manipulationMode,
    funnelStage: dossier.classification.funnelStage,
    pillars: dossier.classification.pillars,
    axes,
    operationGoals: dossier.classification.operationGoals,
    performance,
    victoryTypes: dossier.victoryTypes,
    confidence: dossier.confidence,
    summary: dossier.summary,
    patternObservation: dossier.patternObservation,
    significance: dossier.significance,
    researcherName: dossier.researcher.name,
    researcherToolUsed: dossier.researcher.toolUsed,
    researchDate: dossier.researchDate,
    ingestPath: 'manual-dossier',
    researchSources: dossier.sources.map((source) => ({ ...source })),
  };

  return {
    reference,
    audit: {
      generatedSlug: slug,
      generatedAssetIds: assets.map((a) => a.id),
      compositeScoreSource:
        dossier.performance.composite !== undefined
          ? 'provided-by-researcher'
          : performance.composite === null ? 'not-measured' : 'computed-from-metrics',
      sourcesCount: dossier.sources.length,
      notes: [
        `${dossier.assets.length} assets in bundle`,
        `${dossier.axes.length} structural axes attributed`,
        `${dossier.performance.metrics.length} performance metrics`,
        `Researcher : ${dossier.researcher.name}`,
        `Research date : ${dossier.researchDate}`,
      ],
    },
  };
}

function generateSlug(dossier: ResearchDossier): string {
  const base = `${dossier.operation.brandEmitter}-${dossier.operation.title}-${dossier.operation.emissionYear}`;
  return slugify(base).slice(0, 80);
}

function buildPerformanceScore(
  dossier: ResearchDossier,
  assets: Asset[],
): PerformanceScore {
  // Map scopedAssetIndex (dossier-relative) to scopedAssetId (reference-relative)
  const metrics: PerformanceScore['metrics'] = dossier.performance.metrics.map((m) => ({
    kind: m.kind,
    value: m.value,
    displayValue: m.displayValue,
    goal: m.goal,
    scope: m.scope,
    scopedAssetId:
      m.scope === 'ASSET' && m.scopedAssetIndex !== undefined
        ? assets[m.scopedAssetIndex]?.id
        : undefined,
    attribution: m.attribution,
    source: m.source,
    sourceUrl: m.sourceIndex === undefined ? undefined : dossier.sources[m.sourceIndex]?.url,
    measuredAtYearMonth: m.measuredAtYearMonth,
  }));

  // Composite : use the researcher's value if provided, else compute a basic average
  const composite =
    dossier.performance.composite !== undefined
      ? dossier.performance.composite
      : computeComposite(metrics);

  // Primary goals : researcher-provided or fall back to all classification.operationGoals
  const primaryGoals =
    dossier.performance.primaryGoals && dossier.performance.primaryGoals.length > 0
      ? dossier.performance.primaryGoals
      : dossier.classification.operationGoals;

  // Overall attribution : researcher-provided or min of metrics
  const overallAttribution =
    dossier.performance.overallAttribution ?? minAttribution(metrics);

  return {
    composite,
    compositeSource: dossier.performance.composite !== undefined
      ? 'provided-by-researcher' : composite === null ? 'not-measured' : 'computed-from-metrics',
    primaryGoals,
    metrics,
    overallAttribution,
    rationale: dossier.performance.rationale,
  };
}

function computeComposite(metrics: PerformanceScore['metrics']): number | null {
  // Very rough composite: weight by attribution strength, clamp 0-100
  if (metrics.length === 0) {
    return null;
  }

  // Normalize each metric to a 0-100 score (very heuristic — production will use a proper model)
  const scores = metrics.map((m) => {
    const weight = attributionWeight(m.attribution);
    return Math.min(100, Math.max(0, normalizeMetricValue(m))) * weight;
  });
  const sumWeights = metrics.reduce(
    (s, m) => s + attributionWeight(m.attribution),
    0,
  );
  return Math.round(scores.reduce((s, v) => s + v, 0) / Math.max(1, sumWeights));
}

function normalizeMetricValue(m: PerformanceScore['metrics'][number]): number {
  // Map known metric kinds to a 0-100 perceived strength
  switch (m.kind) {
    case 'SALES_LIFT_PCT':
      return Math.min(100, m.value);
    case 'ROAS':
      return Math.min(100, m.value * 10);
    case 'CULT_INDEX_0_100':
    case 'CULTURAL_PENETRATION_0_100':
    case 'BRAND_PREFERENCE_PCT':
    case 'CONVERSION_RATE_PCT':
    case 'RECALL_UNAIDED_PCT':
    case 'COMPLETION_RATE_PCT':
    case 'ENGAGEMENT_RATE_PCT':
    case 'SHARE_OF_VOICE_PCT':
      return m.value;
    case 'LONGEVITY_MONTHS':
      return Math.min(100, m.value / 6); // 50 yr = 100
    case 'AWARDS_GOLD_COUNT':
      return Math.min(100, m.value * 25);
    case 'IMITATION_COUNT':
      return Math.min(100, m.value * 5);
    default:
      return 60; // neutral mid-score for unmappable kinds
  }
}

function attributionWeight(attr: PerformanceScore['metrics'][number]['attribution']): number {
  switch (attr) {
    case 'PROVEN_CAUSAL':
      return 1;
    case 'CORRELATED':
      return 0.7;
    case 'ESTIMATED':
      return 0.5;
    case 'CLAIMED':
      return 0.3;
  }
}

function minAttribution(metrics: PerformanceScore['metrics']): PerformanceScore['overallAttribution'] {
  if (metrics.length === 0) return 'ESTIMATED';
  const order: Record<PerformanceScore['overallAttribution'], number> = {
    PROVEN_CAUSAL: 4,
    CORRELATED: 3,
    ESTIMATED: 2,
    CLAIMED: 1,
  };
  let min: PerformanceScore['overallAttribution'] = 'PROVEN_CAUSAL';
  for (const m of metrics) {
    if (order[m.attribution] < order[min]) min = m.attribution;
  }
  return min;
}

/* -------------------------------------------------------------------------- */
/* Helper : validate JSON string                                              */
/* -------------------------------------------------------------------------- */

export interface ValidationResult {
  ok: boolean;
  dossier?: ResearchDossier;
  errors?: { path: string; message: string }[];
  jsonError?: string;
}

export function validateDossierJson(json: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    return {
      ok: false,
      jsonError: err instanceof Error ? err.message : String(err),
    };
  }

  const result = ResearchDossierSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((i) => ({
        path: i.path.join('.') || '(root)',
        message: i.message,
      })),
    };
  }

  return { ok: true, dossier: result.data };
}
