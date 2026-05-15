// Mirror of app/src/lib/types.ts for the worker package.
// Kept separate to avoid coupling worker build to the Next.js app build.
// TODO: extract into a shared packages/taxonomy package once the monorepo workspace is set up.

export type PatternKind =
  | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TEXT' | 'SPATIAL' | 'DIGITAL_INTERACTION'
  | 'MIXED' | 'BRAND_SYSTEM' | 'PERFORMANCE_LIVE' | 'EDITORIAL_LONG_FORM'
  | 'OBJECT' | 'SERVICE_SIGNATURE' | 'PERSONAL_BRAND' | 'RITUAL';

export type ManipulationMode = 'PEDDLER' | 'DEALER' | 'FACILITATOR' | 'ENTERTAINER';
export type FunnelStage = 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION' | 'ADVOCACY';
export type Pillar = 'A' | 'D' | 'V' | 'E' | 'R' | 'T' | 'I' | 'S';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'ESTIMATED';

export type AssetKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TEXT' | 'EMBED_YOUTUBE' | 'EMBED_VIMEO';

export type AssetFunction =
  | 'TAGLINE' | 'HEADLINE' | 'BODY_COPY' | 'MANIFESTO' | 'CLAIM'
  | 'KEY_VISUAL' | 'KEY_FRAME' | 'PRINT_AD' | 'POSTER'
  | 'OOH_BILLBOARD' | 'OOH_TRANSIT' | 'OOH_DIGITAL'
  | 'TVC' | 'BRAND_FILM' | 'TEASER' | 'CUT_DOWN' | 'EXPLAINER'
  | 'SOCIAL_POST_STATIC' | 'SOCIAL_POST_VIDEO' | 'REEL' | 'STORY' | 'TIKTOK_NATIVE' | 'YOUTUBE_LONG'
  | 'RADIO_SPOT' | 'JINGLE' | 'SOUND_LOGO' | 'PODCAST_EPISODE'
  | 'LOGO_LOCKUP' | 'PACKAGING' | 'POS_MATERIAL' | 'MERCH' | 'TYPOGRAPHY_SPECIMEN'
  | 'WEBSITE_PAGE' | 'LANDING_PAGE' | 'MICROSITE' | 'APP_SCREEN' | 'EMAIL_DESIGN' | 'NEWSLETTER' | 'AR_FILTER' | 'INTERACTIVE_EXPERIENCE'
  | 'ACTIVATION_PHOTO' | 'ACTIVATION_VIDEO' | 'EVENT_DOCUMENTATION' | 'SPONSORSHIP_ASSET'
  | 'INFLUENCER_CONTENT' | 'UGC_BRANDED' | 'PRESS_KIT' | 'CASE_STUDY_OFFICIAL'
  | 'BEHIND_THE_SCENES_PHOTO' | 'BEHIND_THE_SCENES_VIDEO' | 'CREATIVE_BRIEF_PUBLIC';

export type AssetRole = 'HERO' | 'PRIMARY' | 'DECLINATION' | 'COMPANION' | 'EXTRACTED';

export type AssetExtractionMethod =
  | 'PRIMARY_INGESTION' | 'FRAME_EXTRACTION' | 'OCR_FROM_IMAGE'
  | 'TRANSCRIPT_FROM_AUDIO' | 'EXPERT_UPLOAD' | 'CROWDSOURCED';

export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '21:9' | '4:5';

export interface Asset {
  id: string;
  kind: AssetKind;
  function: AssetFunction;
  role: AssetRole;
  url: string;
  posterUrl?: string;
  aspectRatio: AspectRatio;
  text?: string;
  caption?: string;
  alt?: string;
  durationSec?: number;
  format?: string;
  extractionMethod?: AssetExtractionMethod;
  derivedFromAssetId?: string;
}

export type OperationGoal =
  | 'DIRECT_SALE' | 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION'
  | 'RETENTION' | 'ADVOCACY' | 'BRAND_WORLD_BUILDING'
  | 'CATEGORY_DEFINITION' | 'CRISIS_RESPONSE' | 'RECRUITMENT';

export type PerformanceMetricKind =
  | 'SALES_LIFT_PCT' | 'UNITS_SOLD' | 'REVENUE_USD' | 'ROAS' | 'CONVERSION_RATE_PCT'
  | 'REACH_PERSONS' | 'IMPRESSIONS' | 'RECALL_UNAIDED_PCT' | 'BRAND_SEARCH_LIFT_PCT' | 'SHARE_OF_VOICE_PCT'
  | 'NPS_DELTA' | 'BRAND_PREFERENCE_PCT' | 'CULT_INDEX_0_100' | 'CULTURAL_PENETRATION_0_100'
  | 'AWARDS_GOLD_COUNT' | 'IMITATION_COUNT' | 'LONGEVITY_MONTHS'
  | 'ENGAGEMENT_RATE_PCT' | 'UGC_VOLUME' | 'COMPLETION_RATE_PCT';

export type AttributionConfidence = 'PROVEN_CAUSAL' | 'CORRELATED' | 'ESTIMATED' | 'CLAIMED';

export interface PerformanceMetric {
  kind: PerformanceMetricKind;
  value: number;
  displayValue?: string;
  goal: OperationGoal;
  scope: 'OPERATION' | 'ASSET';
  scopedAssetId?: string;
  attribution: AttributionConfidence;
  source: string;
  measuredAtYearMonth?: string;
}

export interface PerformanceScore {
  composite: number;
  primaryGoals: OperationGoal[];
  metrics: PerformanceMetric[];
  overallAttribution: AttributionConfidence;
  rationale?: string;
}

export type StructuralAxisName =
  | 'FILIATION' | 'PROVOCATION' | 'AUCTORIALITY' | 'SERIAL_RECURRENCE'
  | 'CULTURAL_DECALAGE' | 'COGNITIVE_MECHANISM' | 'CULTURAL_TEMPO'
  | 'MORAL_VALENCE' | 'META_CONSCIOUSNESS' | 'NARRATIVE_DENSITY'
  | 'TEMPORAL_MODALITY' | 'RECIPIENT_AUTHORSHIP' | 'EXTERNAL_REFERENTIALITY'
  | 'REQUIRED_CULTURAL_CAPITAL' | 'INFO_VS_EMOTION_DENSITY' | 'PROMISE_STRATEGY'
  | 'MEME_CREATION_VS_RECOVERY' | 'ATTENTION_PATTERN' | 'CATEGORICAL_FIDELITY'
  | 'COMPETITOR_POSTURE' | 'ASSUMED_AMBIGUITY' | 'BRAND_CHARACTER_STRATEGY';

export interface StructuralAxis {
  name: StructuralAxisName;
  value: string;
  confidence: number;
  evidence?: string;
}

export type VictoryType =
  | 'CANNES_LIONS_GOLD' | 'CANNES_LIONS_SILVER' | 'CANNES_LIONS_BRONZE'
  | 'DANDAD_PENCIL' | 'EFFIE_GOLD' | 'LOERIES_GRAND_PRIX' | 'PIKINE_GRAND_PRIX'
  | 'LOCAL_DOMINANCE_PROVEN' | 'VIRAL_REACH' | 'LONGEVITY_PROVEN'
  | 'CULT_STATUS_DOCUMENTED' | 'COMMERCIAL_IMPACT_PROVEN'
  | 'BRAND_WORLD_DOOR' | 'COMPETITOR_IMITATED';

export interface Reference {
  id: string;
  slug: string;
  title: string;
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
  operationGoals: OperationGoal[];
  performance: PerformanceScore;
  victoryTypes: VictoryType[];
  confidence: ConfidenceLevel;
  summary: string;
  patternObservation?: string;
  significance?: string;
}

/* -------------------------------------------------------------------------- */
/* Brand watch types                                                          */
/* -------------------------------------------------------------------------- */

export type SourcePerimeter =
  | 'BRAND_OWNED' | 'AWARDS_DATABASE' | 'INDUSTRY_PRESS' | 'TRADE_PRESS'
  | 'INDEPENDENT_ANALYSIS' | 'CULTURAL_SIGNAL' | 'COMPETITOR_CONTEXT'
  | 'PERFORMANCE_DATA' | 'CROWDSOURCED_FIELD';

export type BrandSignalType =
  | 'NEW_OPERATION' | 'NEW_ASSET' | 'PERFORMANCE_UPDATE'
  | 'CULTURAL_REFERENCE' | 'COMPETITOR_MOVE' | 'AGENCY_CHANGE' | 'CONTEXT_UPDATE';

export interface RawSignal {
  /** Unique id for dedup. */
  id: string;
  /** Source module that produced this signal. */
  sourceName: string;
  /** Which perimeter the source belongs to. */
  perimeter: SourcePerimeter;
  /** Where the raw content came from. */
  url?: string;
  /** Capture timestamp (ISO). */
  capturedAt: string;
  /** The brand the source crawler hypothesises this signal is about (best guess at L1). */
  brandHint?: string;
  /** Loose signal type — refined by the parser. */
  signalType: BrandSignalType;
  /** Raw HTML, JSON, text, or structured payload — what the parser will consume. */
  payload: {
    kind: 'HTML' | 'JSON' | 'TEXT' | 'JSON_LD';
    content: string;
    title?: string;
    metaDescription?: string;
    mediaUrls?: string[];
    publishedAt?: string;
  };
}

export interface ParsedSignal {
  signal: RawSignal;
  /** Reference extracted from this signal (null = parser rejected the signal). */
  reference: Reference | null;
  /** Confidence of the extraction, 0-1. Below 0.65 = requires human review. */
  extractionConfidence: number;
  /** Any issues that prevented full extraction. */
  notes: string[];
}

export interface SourceCrawlConfig {
  /** When true, run against fixtures instead of live HTTP. */
  useFixtures: boolean;
  /** Brand to filter for (if the source supports filtering). */
  brandFilter?: string;
  /** Max items to crawl in this run. */
  limit?: number;
}

export interface SourceCrawler {
  name: string;
  perimeter: SourcePerimeter;
  description: string;
  crawl(config: SourceCrawlConfig): Promise<RawSignal[]>;
}

export interface BrandWatchAgent {
  brandSlug: string;
  brandName: string;
  brandSector: string;
  /** Run a full watch cycle — pull from L1 sources + query non-L1 perimeters. */
  run(opts: { useFixtures: boolean; limit?: number }): Promise<BrandWatchResult>;
}

export interface BrandWatchResult {
  watchId: string;
  brandSlug: string;
  brandName: string;
  runStartedAt: string;
  runDurationMs: number;
  mode: 'dry-run' | 'live';
  sourcesQueried: string[];
  signalsCollected: number;
  operationsIdentified: number;
  assetsExtracted: number;
  operations: Reference[];
  signalsLog: ParsedSignal[];
  perimeterCoverage: Record<SourcePerimeter, number>;
}
