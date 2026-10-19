// Argos shared types. Aligned with the Prisma schema (post-bootstrap) and the PRD taxonomy.

export type PatternKind =
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'TEXT'
  | 'SPATIAL'
  | 'DIGITAL_INTERACTION'
  | 'MIXED'
  | 'BRAND_SYSTEM'
  | 'PERFORMANCE_LIVE'
  | 'EDITORIAL_LONG_FORM'
  | 'OBJECT'
  | 'SERVICE_SIGNATURE'
  | 'PERSONAL_BRAND'
  | 'RITUAL';

export type ManipulationMode = 'PEDDLER' | 'DEALER' | 'FACILITATOR' | 'ENTERTAINER';

export type FunnelStage =
  | 'AWARENESS'
  | 'CONSIDERATION'
  | 'CONVERSION'
  | 'RETENTION'
  | 'ADVOCACY';

export type Pillar = 'A' | 'D' | 'V' | 'E' | 'R' | 'T' | 'I' | 'S';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'ESTIMATED';

export type VictoryType =
  | 'CANNES_LIONS_GOLD'
  | 'CANNES_LIONS_SILVER'
  | 'CANNES_LIONS_BRONZE'
  | 'DANDAD_PENCIL'
  | 'EFFIE_GOLD'
  | 'LOERIES_GRAND_PRIX'
  | 'PIKINE_GRAND_PRIX'
  | 'LOCAL_DOMINANCE_PROVEN'
  | 'VIRAL_REACH'
  | 'LONGEVITY_PROVEN'
  | 'CULT_STATUS_DOCUMENTED'
  | 'COMMERCIAL_IMPACT_PROVEN'
  | 'BRAND_WORLD_DOOR'
  | 'COMPETITOR_IMITATED';

export type StructuralAxisName =
  | 'FILIATION'
  | 'PROVOCATION'
  | 'AUCTORIALITY'
  | 'SERIAL_RECURRENCE'
  | 'CULTURAL_DECALAGE'
  | 'COGNITIVE_MECHANISM'
  | 'CULTURAL_TEMPO'
  | 'MORAL_VALENCE'
  | 'META_CONSCIOUSNESS'
  | 'NARRATIVE_DENSITY'
  | 'TEMPORAL_MODALITY'
  | 'RECIPIENT_AUTHORSHIP'
  | 'EXTERNAL_REFERENTIALITY'
  | 'REQUIRED_CULTURAL_CAPITAL'
  | 'INFO_VS_EMOTION_DENSITY'
  | 'PROMISE_STRATEGY'
  | 'MEME_CREATION_VS_RECOVERY'
  | 'ATTENTION_PATTERN'
  | 'CATEGORICAL_FIDELITY'
  | 'COMPETITOR_POSTURE'
  | 'ASSUMED_AMBIGUITY'
  | 'BRAND_CHARACTER_STRATEGY';

export interface StructuralAxis {
  name: StructuralAxisName;
  value: string;
  confidence: number;
  evidence?: string;
  sourceUrl?: string;
}

/**
 * AssetKind = TECHNICAL container of the asset (what file format it is).
 * Pure mechanical metadata, used by the MediaPlayer to pick the right renderer.
 */
export type AssetKind =
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'TEXT' // pure text asset: tagline, headline, body copy, manifesto text
  | 'EMBED_YOUTUBE'
  | 'EMBED_VIMEO';

/**
 * AssetFunction = MARKETING role of the asset (what the brand actually delivered).
 * This is what an experienced creative director would call the asset in a brief.
 * Argos indexes references by their full output bundle, so every brand output
 * type that survives evaluation of competitors gets a slot here.
 */
export type AssetFunction =
  // Verbal / textual outputs
  | 'TAGLINE' // 3-7 word brand promise ("Just Do It")
  | 'HEADLINE' // ad headline / accroche ("Don't Buy This Jacket")
  | 'BODY_COPY' // explanatory text
  | 'MANIFESTO' // long brand statement (text or video)
  | 'CLAIM' // factual / proof statement

  // Visual outputs — campaign
  | 'KEY_VISUAL' // the campaign master image (KV)
  | 'KEY_FRAME' // frame extracted from a video, often becomes a KV later
  | 'PRINT_AD' // magazine / press
  | 'POSTER'

  // Out-of-home
  | 'OOH_BILLBOARD' // large-format outdoor
  | 'OOH_TRANSIT' // bus, metro, abribus
  | 'OOH_DIGITAL' // DOOH screen

  // Film / video
  | 'TVC' // television commercial (30s, 60s, 90s)
  | 'BRAND_FILM' // long-form storytelling (>2min)
  | 'TEASER'
  | 'CUT_DOWN' // short edit of a longer film
  | 'EXPLAINER'

  // Social-native
  | 'SOCIAL_POST_STATIC' // 1:1 or 4:5 native social image
  | 'SOCIAL_POST_VIDEO'
  | 'REEL' // 9:16 short-form vertical
  | 'STORY' // ephemeral Instagram/Snapchat
  | 'TIKTOK_NATIVE'
  | 'YOUTUBE_LONG'

  // Audio
  | 'RADIO_SPOT'
  | 'JINGLE' // brand sonic signature
  | 'SOUND_LOGO' // 1-3s audio mnemonic
  | 'PODCAST_EPISODE'

  // Brand system & identity
  | 'LOGO_LOCKUP'
  | 'PACKAGING' // product packaging design
  | 'POS_MATERIAL' // point-of-sale display
  | 'MERCH' // branded object (totebag, mug, gourde)
  | 'TYPOGRAPHY_SPECIMEN'

  // Digital surfaces
  | 'WEBSITE_PAGE'
  | 'LANDING_PAGE'
  | 'MICROSITE'
  | 'APP_SCREEN'
  | 'EMAIL_DESIGN'
  | 'NEWSLETTER'
  | 'AR_FILTER'
  | 'INTERACTIVE_EXPERIENCE'

  // Live / activation
  | 'ACTIVATION_PHOTO'
  | 'ACTIVATION_VIDEO'
  | 'EVENT_DOCUMENTATION'
  | 'SPONSORSHIP_ASSET'

  // Earned / co-created
  | 'INFLUENCER_CONTENT'
  | 'UGC_BRANDED'
  | 'PRESS_KIT'
  | 'CASE_STUDY_OFFICIAL'

  // Behind the scenes
  | 'BEHIND_THE_SCENES_PHOTO'
  | 'BEHIND_THE_SCENES_VIDEO'
  | 'CREATIVE_BRIEF_PUBLIC'; // when an agency publishes the brief itself

/**
 * AssetRole = relative position of this asset within the reference's bundle.
 * Used to surface the right thing first in the UI.
 */
export type AssetRole =
  | 'HERO' // the main/primary asset
  | 'PRIMARY' // first-tier output (e.g. the TVC and the KV are both PRIMARY)
  | 'DECLINATION' // variant within the same function (3 OOH visuals, 5 social posts)
  | 'COMPANION' // supporting asset (KV companion to a TVC)
  | 'EXTRACTED'; // derived by the pipeline (key frame pulled from a video, OCR'd tagline)

/**
 * How Argos got this asset — informs confidence and retraceability.
 */
export type AssetExtractionMethod =
  | 'PRIMARY_INGESTION' // crawled directly from source
  | 'FRAME_EXTRACTION' // extracted from a parent video by the pipeline
  | 'OCR_FROM_IMAGE' // text pulled from a visual asset
  | 'TRANSCRIPT_FROM_AUDIO' // speech-to-text
  | 'EXPERT_UPLOAD' // contributed by an annotator
  | 'CROWDSOURCED'; // contributed by the Guilde / community

export interface Asset {
  id: string;
  /** Technical file kind — controls how it's rendered. */
  kind: AssetKind;
  /** Marketing function — what the brand actually delivered. */
  function: AssetFunction;
  /** Position within the bundle (Hero / Primary / Declination / Companion / Extracted). */
  role: AssetRole;
  /** For IMAGE/VIDEO/AUDIO: file URL. For EMBED_*: video ID. For TEXT: empty (use `text`). */
  url: string;
  /** Poster still preview for VIDEO / EMBED kinds. */
  posterUrl?: string;
  /** Aspect ratio of the asset — informs the renderer's container. */
  aspectRatio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '21:9' | '4:5';
  /** For TEXT kind (taglines, headlines, copy, manifestos), the actual content. */
  text?: string;
  /** Citation and licensing posture supplied for this individual asset. */
  sourceUrl?: string;
  sourceLicense?: string;
  /** Editorial caption explaining what this asset is and where it ran. */
  caption?: string;
  /** Alt text for accessibility. */
  alt?: string;
  /** Duration in seconds for VIDEO / AUDIO. */
  durationSec?: number;
  /** Human-readable format spec: "OOH 12x4m — Lagos Third Mainland Bridge", "TVC 30s", "Instagram Reel". */
  format?: string;
  /** Where this asset originated in the Argos ingestion pipeline. */
  extractionMethod?: AssetExtractionMethod;
  /** If extracted from a parent asset, its id (e.g. a KEY_FRAME extracted from a TVC). */
  derivedFromAssetId?: string;
}

/**
 * Operation = a marketing operation. A Reference IS an operation — a bundle of assets
 * deployed together with a coherent intent over a defined period. The operation has
 * goals; the assets are how it tries to achieve them.
 *
 * Spectrum :
 *   - DIRECT_SALE : an Amazon book launch with organic marketing — 1 KV + 1 page + ventes
 *   - BRAND_WORLD_BUILDING : Audi A8 launch mix-media — TVC + OOH + KV + presskit + influencers
 *
 * An operation can have multiple goals (e.g. AWARENESS + CONVERSION) with different weights.
 */
export type OperationGoal =
  | 'DIRECT_SALE' // immediate transactional outcome (ecommerce, retail sale)
  | 'AWARENESS' // make audience aware the brand / product exists
  | 'CONSIDERATION' // move audience to consider purchasing
  | 'CONVERSION' // trigger trial / signup / first purchase
  | 'RETENTION' // hold existing customers
  | 'ADVOCACY' // turn customers into advocates / referrers
  | 'BRAND_WORLD_BUILDING' // multi-year identity construction
  | 'CATEGORY_DEFINITION' // create or redefine a market category
  | 'CRISIS_RESPONSE' // damage control after an issue
  | 'RECRUITMENT'; // employer brand / talent attraction

/**
 * Performance metric kinds. Designed to cover the full spectrum from simple
 * direct-sale measures to complex multi-channel brand impact.
 */
export type PerformanceMetricKind =
  // Commercial outcomes
  | 'SALES_LIFT_PCT' // incremental sales vs baseline, %
  | 'UNITS_SOLD' // raw units (for Amazon book launches, drops, etc.)
  | 'REVENUE_USD' // incremental revenue
  | 'ROAS' // return on ad spend, multiplier
  | 'CONVERSION_RATE_PCT'
  // Awareness / consideration
  | 'REACH_PERSONS'
  | 'IMPRESSIONS'
  | 'RECALL_UNAIDED_PCT'
  | 'BRAND_SEARCH_LIFT_PCT'
  | 'SHARE_OF_VOICE_PCT'
  // Brand health
  | 'NPS_DELTA'
  | 'BRAND_PREFERENCE_PCT'
  | 'CULT_INDEX_0_100' // composite cultural penetration score
  | 'CULTURAL_PENETRATION_0_100'
  // Industry / competitive proof
  | 'AWARDS_GOLD_COUNT'
  | 'IMITATION_COUNT' // number of competitors who replicated the pattern
  | 'LONGEVITY_MONTHS' // how long the pattern stayed in market
  // Engagement (digital-native)
  | 'ENGAGEMENT_RATE_PCT'
  | 'UGC_VOLUME' // user-generated content produced
  | 'COMPLETION_RATE_PCT'; // video completion, story-through, etc.

/**
 * Honesty about how confidently a metric is attributed to the operation.
 * Argos never claims more than the evidence supports — and surfaces this confidence.
 */
export type AttributionConfidence =
  | 'PROVEN_CAUSAL' // experimental design or strong causal evidence (Effie standard)
  | 'CORRELATED' // observed in temporal correlation, not causally proven
  | 'ESTIMATED' // model-derived, not measured directly
  | 'CLAIMED'; // brand or agency claim without independent verification

export interface PerformanceMetric {
  kind: PerformanceMetricKind;
  /** Raw value of the metric. */
  value: number;
  /** Optional pre-formatted display string ("+47%", "4.2M reach", "$2.1M"). */
  displayValue?: string;
  /** Which operation goal this metric measures. */
  goal: OperationGoal;
  /** Whether this metric is measured at operation level or per-asset. */
  scope: 'OPERATION' | 'ASSET';
  /** If scope === 'ASSET', which asset is being measured. */
  scopedAssetId?: string;
  /** How confidently the metric is attributed to the operation. */
  attribution: AttributionConfidence;
  /** Source of the metric — case study, press release, experiment, etc. */
  source: string;
  /** Exact cited dossier URL, when explicitly supplied by sourceIndex. */
  sourceUrl?: string;
  /** When the metric was measured (YYYY-MM). */
  measuredAtYearMonth?: string;
}

export interface PerformanceScore {
  /** Composite 0-100 score, computed from metrics weighted by goal and attribution. */
  composite: number | null;
  compositeSource?: "provided-by-researcher" | "computed-from-metrics" | "not-measured" | "legacy-unqualified";
  /** Goals the operation primarily aimed to achieve, in order of weight. */
  primaryGoals: OperationGoal[];
  /** All recorded metrics, operation-level and asset-level. */
  metrics: PerformanceMetric[];
  /** Overall attribution confidence — min of underlying metrics. */
  overallAttribution: AttributionConfidence;
  /** Short editorial note explaining the composite score. */
  rationale?: string;
}

/** Evidence identity stays stable when measurements are reordered. */
export function metricEvidenceKey(metric: PerformanceMetric): string {
  return JSON.stringify([metric.kind, metric.scope, metric.scopedAssetId ?? null,
    metric.goal, metric.value, metric.displayValue ?? null, metric.source,
    metric.sourceUrl ?? null, metric.measuredAtYearMonth ?? null, metric.attribution]);
}

export interface Reference {
  /** Version of the canonical reference; supplied on amendments. */
  updatedAt?: string;
  hasSourceDossier?: boolean;
  id: string;
  slug: string;
  title: string;

  // Assets — the reference IS its assets. Hero first by convention.
  assets: Asset[];

  brandEmitter: string;
  agencyCreator?: string;
  sector: string;
  marketPrimary: string;
  marketsSecondary: string[];
  emissionYear: number;
  campaignParent?: string;

  patternKind: PatternKind;
  manipulationMode: ManipulationMode;
  funnelStage: FunnelStage;
  pillars: Pillar[];

  axes: StructuralAxis[];

  /** Operation goals & performance — the operation IS what's measured, not isolated assets. */
  operationGoals: OperationGoal[];
  performance: PerformanceScore;
  victoryTypes: VictoryType[];

  confidence: ConfidenceLevel;

  summary: string;
  patternObservation?: string;
  significance?: string;

  /**
   * Filiations — directional links to other references.
   *
   * `type` is from THIS reference's perspective:
   * - `inspires`     : this op inspired the target (target is downstream in time)
   * - `inspired_by`  : this op was inspired by the target (target is upstream in time)
   *
   * `relationshipType` describes the nature of the link (DB Filiation.type):
   * DIRECT_HOMAGE | PARODY | PASTICHE | PATTERN_REPRODUCTION | POSITIONAL_INVERSION
   * | CITATION_EXPLICIT | CITATION_IMPLICIT
   */
  filiations?: {
    type: 'inspires' | 'inspired_by';
    refId: string;
    refSlug: string;
    refTitle: string;
    refYear?: number;
    refBrand?: string;
    relationshipType: string;
    evidence?: string;
    confidence?: number;
  }[];

  // Provenance — surfaced from the source dossier JSON.
  researcherName?: string;
  researcherContact?: string;
  researcherToolUsed?: string;
  researchDate?: string;
  ingestPath?: string;
  researchSources?: ResearchSourceSummary[];
}

export interface ResearchSourceSummary {
  url: string;
  title: string;
  publisher?: string;
  publishedDate?: string;
  accessedDate?: string;
  license: string;
  excerpt?: string;
  role: string;
}

/** Returns metrics attributable to a specific asset (asset-scoped metrics + operation-scoped propagated). */
export function getMetricsForAsset(reference: Reference, assetId: string): PerformanceMetric[] {
  return reference.performance.metrics.filter(
    (m) => m.scope === 'ASSET' && m.scopedAssetId === assetId,
  );
}

/* -------------------------------------------------------------------------- */
/* Brand watches — the crawler-as-market-research-analyst model                */
/* -------------------------------------------------------------------------- */

/**
 * Source perimeters that a brand watch interrogates. The watch covers
 * a brand by hitting ALL of these in parallel, not by ingesting each source
 * generically. This is how a human market research analyst would work.
 */
export type SourcePerimeter =
  | 'BRAND_OWNED' // brand site, official social, press room, brand YouTube, brand newsletter
  | 'AWARDS_DATABASE' // Cannes Lions, D&AD, One Show, Loeries, Pikine, Effie
  | 'INDUSTRY_PRESS' // AdAge, LBB, Adweek, Campaign, Adforum case studies
  | 'TRADE_PRESS' // sector-specific publications (Auto News, Brand Africa, etc.)
  | 'INDEPENDENT_ANALYSIS' // academic papers, podcasts, YouTube breakdowns
  | 'CULTURAL_SIGNAL' // parodies, memes, citations in pop culture
  | 'COMPETITOR_CONTEXT' // direct competitor moves that frame this brand's choices
  | 'PERFORMANCE_DATA' // public sales reports, brand trackers, search trends
  | 'CROWDSOURCED_FIELD'; // Guilde Matanga OOH photos, contributor uploads

export interface BrandWatchSource {
  perimeter: SourcePerimeter;
  name: string; // 'AdAge', 'Cannes Lions Archive', 'Patagonia press room'
  url?: string;
  cadence: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'on_event';
  status: 'active' | 'paused' | 'broken';
  lastCheckedYearMonth?: string;
  signalsLast30Days?: number;
}

/**
 * A BrandWatch is an active surveillance program for a single brand.
 * Heracles configures one watch per brand-of-interest and lets it run
 * continuously. Outputs are signals that the pipeline assembles into
 * references (operations) and assets.
 */
export interface BrandWatch {
  id: string;
  brandSlug: string;
  brandName: string;
  brandSector: string;
  /** P0 = continuous active monitoring ; P3 = monthly drive-by. */
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  sources: BrandWatchSource[];
  startedAt: string; // YYYY-MM
  lastDossierUpdate: string; // YYYY-MM
  signalsCollected: number;
  operationsIdentified: number;
  assetsExtracted: number;
  /** Self-assessed completeness of the brand's known marketing output (0-100). */
  coverageCompletenessPct: number;
}

export type BrandSignalType =
  | 'NEW_OPERATION'
  | 'NEW_ASSET'
  | 'PERFORMANCE_UPDATE'
  | 'CULTURAL_REFERENCE'
  | 'COMPETITOR_MOVE'
  | 'AGENCY_CHANGE'
  | 'CONTEXT_UPDATE';

export interface BrandSignal {
  id: string;
  brandSlug: string;
  sourceName: string;
  perimeter: SourcePerimeter;
  capturedAtYearMonth: string;
  type: BrandSignalType;
  excerpt: string;
  url?: string;
  status: 'pending_extraction' | 'integrated' | 'rejected' | 'requires_review';
  resolvedToReferenceId?: string;
}

/**
 * A BrandDossier is the assembled, ongoing knowledge about a brand.
 * Derived from the watch + the pipeline. This is what locks down the database :
 * once Argos owns a complete brand dossier, no third party can revoke it.
 */
export interface BrandDossier {
  brandSlug: string;
  brandName: string;
  brandSector: string;
  brandHomeMarket: string;
  // Watch info
  watchActiveSince: string; // YYYY-MM
  lastUpdated: string;
  coverageCompletenessPct: number;
  // Aggregations
  operationsCount: number;
  assetsCount: number;
  agencyHistory: {
    agency: string;
    firstYear: number;
    lastYear: number;
    operationsCount: number;
  }[];
  signaturePatterns: string[]; // e.g. "Anti-claim authority pattern", "Guilt-resolution call"
  dominantManipulationModes: ManipulationMode[];
  performanceTrajectory: {
    year: number;
    compositeAvg: number;
    operationsCount: number;
  }[];
  /** 0-100 — how present is this brand in cultural discourse, Argos-derived. */
  culturalFootprint: number;
  /** Editorial paragraph that opens the brand page. */
  editorialSummary: string;
}

/** Convenience accessor — returns the hero asset (first asset by convention) */
export function getHeroAsset(reference: Reference): Asset | undefined {
  return reference.assets.find((a) => a.role === 'HERO') ?? reference.assets[0];
}

export interface SearchFilters {
  q?: string;
  sector?: string[];
  market?: string[];
  yearFrom?: number;
  yearTo?: number;
  patternKind?: PatternKind[];
  manipulationMode?: ManipulationMode[];
  victoryType?: VictoryType[];
  pillar?: Pillar[];
}

export interface SectorMeta {
  slug: string;
  name: string;
  description: string;
  referenceCount: number;
  topBrands: string[];
  emergingPatterns: string[];
}
