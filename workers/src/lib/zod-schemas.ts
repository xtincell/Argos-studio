// Zod schemas matching the types in ./types.ts.
// Used by the parser to validate LLM output before integration.

import { z } from 'zod';

export const PatternKindSchema = z.enum([
  'IMAGE', 'VIDEO', 'AUDIO', 'TEXT', 'SPATIAL', 'DIGITAL_INTERACTION',
  'MIXED', 'BRAND_SYSTEM', 'PERFORMANCE_LIVE', 'EDITORIAL_LONG_FORM',
  'OBJECT', 'SERVICE_SIGNATURE', 'PERSONAL_BRAND', 'RITUAL',
]);

export const ManipulationModeSchema = z.enum([
  'PEDDLER', 'DEALER', 'FACILITATOR', 'ENTERTAINER',
]);

export const FunnelStageSchema = z.enum([
  'AWARENESS', 'CONSIDERATION', 'CONVERSION', 'RETENTION', 'ADVOCACY',
]);

export const PillarSchema = z.enum(['A', 'D', 'V', 'E', 'R', 'T', 'I', 'S']);

export const ConfidenceLevelSchema = z.enum(['HIGH', 'MEDIUM', 'LOW', 'ESTIMATED']);

export const AssetKindSchema = z.enum([
  'IMAGE', 'VIDEO', 'AUDIO', 'TEXT', 'EMBED_YOUTUBE', 'EMBED_VIMEO',
]);

export const AssetFunctionSchema = z.enum([
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

export const AssetRoleSchema = z.enum([
  'HERO', 'PRIMARY', 'DECLINATION', 'COMPANION', 'EXTRACTED',
]);

export const AssetExtractionMethodSchema = z.enum([
  'PRIMARY_INGESTION', 'FRAME_EXTRACTION', 'OCR_FROM_IMAGE',
  'TRANSCRIPT_FROM_AUDIO', 'EXPERT_UPLOAD', 'CROWDSOURCED',
]);

export const AspectRatioSchema = z.enum([
  '1:1', '4:3', '3:4', '16:9', '9:16', '21:9', '4:5',
]);

export const AssetSchema = z.object({
  id: z.string().min(1),
  kind: AssetKindSchema,
  function: AssetFunctionSchema,
  role: AssetRoleSchema,
  url: z.string(),
  posterUrl: z.string().optional(),
  aspectRatio: AspectRatioSchema,
  text: z.string().optional(),
  caption: z.string().optional(),
  alt: z.string().optional(),
  durationSec: z.number().positive().optional(),
  format: z.string().optional(),
  extractionMethod: AssetExtractionMethodSchema.optional(),
  derivedFromAssetId: z.string().optional(),
});

export const OperationGoalSchema = z.enum([
  'DIRECT_SALE', 'AWARENESS', 'CONSIDERATION', 'CONVERSION',
  'RETENTION', 'ADVOCACY', 'BRAND_WORLD_BUILDING',
  'CATEGORY_DEFINITION', 'CRISIS_RESPONSE', 'RECRUITMENT',
]);

export const PerformanceMetricKindSchema = z.enum([
  'SALES_LIFT_PCT', 'UNITS_SOLD', 'REVENUE_USD', 'ROAS', 'CONVERSION_RATE_PCT',
  'REACH_PERSONS', 'IMPRESSIONS', 'RECALL_UNAIDED_PCT', 'BRAND_SEARCH_LIFT_PCT', 'SHARE_OF_VOICE_PCT',
  'NPS_DELTA', 'BRAND_PREFERENCE_PCT', 'CULT_INDEX_0_100', 'CULTURAL_PENETRATION_0_100',
  'AWARDS_GOLD_COUNT', 'IMITATION_COUNT', 'LONGEVITY_MONTHS',
  'ENGAGEMENT_RATE_PCT', 'UGC_VOLUME', 'COMPLETION_RATE_PCT',
]);

export const AttributionConfidenceSchema = z.enum([
  'PROVEN_CAUSAL', 'CORRELATED', 'ESTIMATED', 'CLAIMED',
]);

export const PerformanceMetricSchema = z.object({
  kind: PerformanceMetricKindSchema,
  value: z.number(),
  displayValue: z.string().optional(),
  goal: OperationGoalSchema,
  scope: z.enum(['OPERATION', 'ASSET']),
  scopedAssetId: z.string().optional(),
  attribution: AttributionConfidenceSchema,
  source: z.string(),
  measuredAtYearMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const PerformanceScoreSchema = z.object({
  composite: z.number().min(0).max(100),
  primaryGoals: z.array(OperationGoalSchema).min(1),
  metrics: z.array(PerformanceMetricSchema),
  overallAttribution: AttributionConfidenceSchema,
  rationale: z.string().optional(),
});

export const StructuralAxisNameSchema = z.enum([
  'FILIATION', 'PROVOCATION', 'AUCTORIALITY', 'SERIAL_RECURRENCE',
  'CULTURAL_DECALAGE', 'COGNITIVE_MECHANISM', 'CULTURAL_TEMPO',
  'MORAL_VALENCE', 'META_CONSCIOUSNESS', 'NARRATIVE_DENSITY',
  'TEMPORAL_MODALITY', 'RECIPIENT_AUTHORSHIP', 'EXTERNAL_REFERENTIALITY',
  'REQUIRED_CULTURAL_CAPITAL', 'INFO_VS_EMOTION_DENSITY', 'PROMISE_STRATEGY',
  'MEME_CREATION_VS_RECOVERY', 'ATTENTION_PATTERN', 'CATEGORICAL_FIDELITY',
  'COMPETITOR_POSTURE', 'ASSUMED_AMBIGUITY', 'BRAND_CHARACTER_STRATEGY',
]);

export const StructuralAxisSchema = z.object({
  name: StructuralAxisNameSchema,
  value: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.string().optional(),
});

export const VictoryTypeSchema = z.enum([
  'CANNES_LIONS_GOLD', 'CANNES_LIONS_SILVER', 'CANNES_LIONS_BRONZE',
  'DANDAD_PENCIL', 'EFFIE_GOLD', 'LOERIES_GRAND_PRIX', 'PIKINE_GRAND_PRIX',
  'LOCAL_DOMINANCE_PROVEN', 'VIRAL_REACH', 'LONGEVITY_PROVEN',
  'CULT_STATUS_DOCUMENTED', 'COMMERCIAL_IMPACT_PROVEN',
  'BRAND_WORLD_DOOR', 'COMPETITOR_IMITATED',
]);

export const ReferenceSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  assets: z.array(AssetSchema).min(1),
  brandEmitter: z.string().min(1),
  agencyCreator: z.string().optional(),
  sector: z.string().min(1),
  marketPrimary: z.string().min(1),
  marketsSecondary: z.array(z.string()),
  emissionYear: z.number().int().min(1900).max(2100),
  campaignParent: z.string().optional(),
  patternKind: PatternKindSchema,
  manipulationMode: ManipulationModeSchema,
  funnelStage: FunnelStageSchema,
  pillars: z.array(PillarSchema),
  axes: z.array(StructuralAxisSchema),
  operationGoals: z.array(OperationGoalSchema).min(1),
  performance: PerformanceScoreSchema,
  victoryTypes: z.array(VictoryTypeSchema),
  confidence: ConfidenceLevelSchema,
  summary: z.string().min(1),
  patternObservation: z.string().optional(),
  significance: z.string().optional(),
});

export type ReferenceParsed = z.infer<typeof ReferenceSchema>;
