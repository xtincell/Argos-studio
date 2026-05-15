import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ASSET_FUNCTION_LABELS,
  ASSET_FUNCTION_GROUPS,
  PATTERN_KIND_LABELS,
  STRUCTURAL_AXIS_LABELS,
  VICTORY_LABELS,
} from '@/lib/taxonomy';
import type {
  AssetFunction,
  AttributionConfidence,
  ConfidenceLevel,
  FunnelStage,
  ManipulationMode,
  OperationGoal,
  PatternKind,
  PerformanceMetricKind,
  Pillar,
  StructuralAxisName,
  VictoryType,
} from '@/lib/types';

export const metadata: Metadata = {
  title: 'Schema du dossier de recherche',
  description:
    "Spécification du format JSON research-dossier-v1 — la structure attendue par l'ingest Argos.",
};

const PATTERN_KINDS: PatternKind[] = [
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'TEXT',
  'SPATIAL',
  'DIGITAL_INTERACTION',
  'MIXED',
  'BRAND_SYSTEM',
  'PERFORMANCE_LIVE',
  'EDITORIAL_LONG_FORM',
  'OBJECT',
  'SERVICE_SIGNATURE',
  'PERSONAL_BRAND',
  'RITUAL',
];

const MANIPULATION_MODES: { value: ManipulationMode; label: string; description: string }[] = [
  {
    value: 'PEDDLER',
    label: 'Peddler (vendeur)',
    description: 'Pousse, insiste, répète. La marque parle, beaucoup, fort.',
  },
  {
    value: 'DEALER',
    label: 'Dealer (marchand)',
    description: 'Installe une dépendance émotionnelle ou pratique. La marque cherche le retour.',
  },
  {
    value: 'FACILITATOR',
    label: 'Facilitator (facilitateur)',
    description: "S'efface. Met en scène le client. La marque arrive après — comme une signature.",
  },
  {
    value: 'ENTERTAINER',
    label: 'Entertainer (animateur)',
    description: 'Détourne, joue, divertit. La marque devient un personnage culturel.',
  },
];

const FUNNEL_STAGES: FunnelStage[] = [
  'AWARENESS',
  'CONSIDERATION',
  'CONVERSION',
  'RETENTION',
  'ADVOCACY',
];

const PILLARS: { value: Pillar; label: string }[] = [
  { value: 'A', label: 'Attention' },
  { value: 'D', label: 'Distinction' },
  { value: 'V', label: 'Valence' },
  { value: 'E', label: 'Emotion' },
  { value: 'R', label: 'Reframe' },
  { value: 'T', label: 'Truth' },
  { value: 'I', label: 'Imitation' },
  { value: 'S', label: 'Substance' },
];

const OPERATION_GOALS: OperationGoal[] = [
  'DIRECT_SALE',
  'AWARENESS',
  'CONSIDERATION',
  'CONVERSION',
  'RETENTION',
  'ADVOCACY',
  'BRAND_WORLD_BUILDING',
  'CATEGORY_DEFINITION',
  'CRISIS_RESPONSE',
  'RECRUITMENT',
];

const METRIC_KINDS: PerformanceMetricKind[] = [
  'SALES_LIFT_PCT',
  'UNITS_SOLD',
  'REVENUE_USD',
  'ROAS',
  'CONVERSION_RATE_PCT',
  'REACH_PERSONS',
  'IMPRESSIONS',
  'RECALL_UNAIDED_PCT',
  'BRAND_SEARCH_LIFT_PCT',
  'SHARE_OF_VOICE_PCT',
  'NPS_DELTA',
  'BRAND_PREFERENCE_PCT',
  'CULT_INDEX_0_100',
  'CULTURAL_PENETRATION_0_100',
  'AWARDS_GOLD_COUNT',
  'IMITATION_COUNT',
  'LONGEVITY_MONTHS',
  'ENGAGEMENT_RATE_PCT',
  'UGC_VOLUME',
  'COMPLETION_RATE_PCT',
];

const ATTRIBUTIONS: { value: AttributionConfidence; label: string; description: string }[] = [
  {
    value: 'PROVEN_CAUSAL',
    label: 'Causale prouvée',
    description: 'Le différentiel contre contrôle qualifie la causalité.',
  },
  {
    value: 'CORRELATED',
    label: 'Corrélée',
    description: 'Corrélation forte, mais sans groupe de contrôle isolé.',
  },
  {
    value: 'ESTIMATED',
    label: 'Estimée',
    description: 'Inférence à partir de signaux partiels (Argos index, panels).',
  },
  {
    value: 'CLAIMED',
    label: 'Revendiquée',
    description: 'Communiqué de l\'annonceur, sans validation tierce.',
  },
];

const CONFIDENCE_LEVELS: { value: ConfidenceLevel; description: string }[] = [
  { value: 'HIGH', description: 'Sources primaires + analyses tierces convergentes.' },
  { value: 'MEDIUM', description: 'Une source primaire + commentaires éditoriaux.' },
  { value: 'LOW', description: 'Sources indirectes uniquement.' },
  { value: 'ESTIMATED', description: 'Aucune source directe — reconstitution analytique.' },
];

const LICENSES: { value: string; label: string; description: string }[] = [
  { value: 'free-to-use', label: 'Libre', description: 'Creative Commons, domaine public, ou press-kit libre.' },
  { value: 'press-kit', label: 'Press-kit', description: 'Matériaux presse officiels avec usage éditorial implicite.' },
  { value: 'fair-use', label: 'Fair-use', description: 'Usage commentaire éditorial sous fair use / fair dealing.' },
  { value: 'creator-permission', label: 'Avec permission', description: 'Autorisation explicite du créateur (citer la grant).' },
  { value: 'paid-license', label: 'Sous licence', description: 'Argos détient une licence (Cannes Lions, WARC, etc.).' },
  { value: 'unknown', label: 'Inconnue', description: "Argos ne publiera pas — bloque l'ingest." },
];

const STRUCTURAL_AXES: StructuralAxisName[] = [
  'FILIATION',
  'PROVOCATION',
  'AUCTORIALITY',
  'SERIAL_RECURRENCE',
  'CULTURAL_DECALAGE',
  'COGNITIVE_MECHANISM',
  'CULTURAL_TEMPO',
  'MORAL_VALENCE',
  'META_CONSCIOUSNESS',
  'NARRATIVE_DENSITY',
  'TEMPORAL_MODALITY',
  'RECIPIENT_AUTHORSHIP',
  'EXTERNAL_REFERENTIALITY',
  'REQUIRED_CULTURAL_CAPITAL',
  'INFO_VS_EMOTION_DENSITY',
  'PROMISE_STRATEGY',
  'MEME_CREATION_VS_RECOVERY',
  'ATTENTION_PATTERN',
  'CATEGORICAL_FIDELITY',
  'COMPETITOR_POSTURE',
  'ASSUMED_AMBIGUITY',
  'BRAND_CHARACTER_STRATEGY',
];

const VICTORY_TYPES: VictoryType[] = [
  'CANNES_LIONS_GOLD',
  'CANNES_LIONS_SILVER',
  'CANNES_LIONS_BRONZE',
  'DANDAD_PENCIL',
  'EFFIE_GOLD',
  'LOERIES_GRAND_PRIX',
  'PIKINE_GRAND_PRIX',
  'LOCAL_DOMINANCE_PROVEN',
  'VIRAL_REACH',
  'LONGEVITY_PROVEN',
  'CULT_STATUS_DOCUMENTED',
  'COMMERCIAL_IMPACT_PROVEN',
  'BRAND_WORLD_DOOR',
  'COMPETITOR_IMITATED',
];

export default function ResearchDossierSpec() {
  return (
    <section className="view">
      <div className="wrap" style={{ maxWidth: 1100, paddingTop: 40, paddingBottom: 80 }}>
        <header style={{ marginBottom: 36 }}>
          <p
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--ink-3)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              margin: 0,
              marginBottom: 10,
            }}
          >
            Spécification · research-dossier-v1
          </p>
          <h1
            style={{
              fontSize: 44,
              letterSpacing: '-0.025em',
              margin: 0,
              fontWeight: 600,
              textWrap: 'balance',
            }}
          >
            Comment construire un <span className="serif">dossier Argos.</span>
          </h1>
          <p
            style={{
              marginTop: 14,
              maxWidth: 760,
              fontSize: 15.5,
              color: 'var(--ink-2)',
              lineHeight: 1.6,
            }}
          >
            Un dossier de recherche est un fichier JSON conforme au schema <code style={inlineCode}>research-dossier-v1</code>.
            Il décrit une opération marketing (campagne, lancement, prise de parole) avec ses{' '}
            <b>assets</b>, ses <b>axes structurels</b>, ses <b>métriques</b>, ses <b>sources</b>.
            Cette page documente la structure attendue par <Link href="/admin/ingest" style={accent}>l'ingest</Link>.
          </p>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href="/dossier-template.json" download className="pill" style={chipStyle}>
              ↓ template.json
            </a>
            <a href="/dossier-example.json" download className="pill" style={chipStyle}>
              ↓ example.json (SGCI)
            </a>
            <Link href="/admin/ingest" className="pill" style={chipStyle}>
              → Ingest
            </Link>
            <Link href="/api/v1/ingest/dossier" className="pill" style={chipStyle}>
              → POST /api/v1/ingest/dossier
            </Link>
          </div>
        </header>

        {/* TOP-LEVEL STRUCTURE */}
        <Section
          title="Structure générale"
          intro="Le dossier est un objet JSON avec 7 sections de premier niveau."
        >
          <CodeBlock>
{`{
  "schemaVersion": "research-dossier-v1",
  "researcher": { ... },          // 1. Provenance éditoriale
  "researchDate": "YYYY-MM-DD",
  "operation": { ... },            // 2. Identité de l'opération
  "sources": [ ... ],              // 3. Sources documentées (≥1)
  "assets": [ ... ],               // 4. Bundle d'assets (≥1)
  "classification": { ... },       // 5. Taxonomie
  "axes": [ ... ],                 // 6. Axes structurels notés
  "performance": { ... },          // 7. Score + métriques
  "victoryTypes": [ ... ],         // 8. Preuves de réussite
  "summary": "...",
  "patternObservation": "...",
  "significance": "...",
  "confidence": "HIGH"
}`}
          </CodeBlock>
        </Section>

        {/* 1. RESEARCHER */}
        <Section
          title="1. researcher + researchDate"
          intro="Qui a écrit le dossier, avec quels outils, à quelle date."
        >
          <Fields
            fields={[
              { key: 'researcher.name', type: 'string', required: true, example: '"Calliope"' },
              { key: 'researcher.contact', type: 'string?', required: false, example: '"calliope@argos.studio"' },
              {
                key: 'researcher.toolUsed',
                type: 'string?',
                required: false,
                example: '"Wikipedia + Wieden+Kennedy archives + AdAge editorial"',
              },
              { key: 'researchDate', type: 'string (YYYY-MM-DD)', required: true, example: '"2026-05-12"' },
            ]}
          />
        </Section>

        {/* 2. OPERATION */}
        <Section
          title="2. operation"
          intro="L'identité de la campagne, du lancement ou de la prise de parole documentée."
        >
          <Fields
            fields={[
              { key: 'operation.title', type: 'string', required: true, example: '"Just Do It"' },
              { key: 'operation.brandEmitter', type: 'string', required: true, example: '"Nike"' },
              { key: 'operation.agencyCreator', type: 'string?', required: false, example: '"Wieden+Kennedy"' },
              { key: 'operation.sector', type: 'string', required: true, example: '"Sportswear"' },
              { key: 'operation.marketPrimary', type: 'string', required: true, example: '"United States"' },
              { key: 'operation.marketsSecondary', type: 'string[]', required: false, example: '["Global"]' },
              { key: 'operation.emissionYear', type: 'number', required: true, example: '1988' },
              { key: 'operation.campaignParent', type: 'string?', required: false, example: '"Just Do It"' },
            ]}
          />
        </Section>

        {/* 3. SOURCES */}
        <Section
          title="3. sources (≥ 1)"
          intro="Chaque source documente l'opération. Pas de sources = dossier refusé par l'ingest."
        >
          <Fields
            fields={[
              { key: 'sources[].url', type: 'string (URL)', required: true, example: '"https://en.wikipedia.org/wiki/Just_Do_It"' },
              { key: 'sources[].title', type: 'string', required: true, example: '"Just Do It — Wikipedia"' },
              { key: 'sources[].publisher', type: 'string?', required: false, example: '"Wikipedia"' },
              { key: 'sources[].publishedDate', type: 'string?', required: false, example: '"2024-01-15"' },
              { key: 'sources[].accessedDate', type: 'string', required: true, example: '"2026-05-12"' },
              { key: 'sources[].license', type: 'enum (cf. tableau ci-dessous)', required: true, example: '"free-to-use"' },
              { key: 'sources[].excerpt', type: 'string?', required: false, example: '"The campaign was launched in 1988 by Wieden+Kennedy…"' },
              { key: 'sources[].role', type: '"primary" | "secondary" | "context"', required: true, example: '"primary"' },
            ]}
          />
          <SubBlock title="Licences acceptées">
            <EnumTable rows={LICENSES.map((l) => ({ value: l.value, label: l.label, desc: l.description }))} />
          </SubBlock>
          <SubBlock title="Politique fair-use">
            <div
              style={{
                background: 'var(--coral-soft)',
                border: '1px solid var(--line-soft)',
                borderRadius: 14,
                padding: 16,
                fontSize: 13.5,
                color: '#4a1810',
                lineHeight: 1.6,
              }}
            >
              <p style={{ margin: 0, marginBottom: 8 }}>
                <b>Argos est un média éditorial.</b> À ce titre, le <i>fair use</i> (États-Unis) et
                la <i>courte citation à fins d'analyse</i> (France, articles L122-5 CPI) s'appliquent
                à la reproduction d'éléments protégés par le droit d'auteur ou la marque, à condition
                que :
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
                <li>l'usage soit éditorial (analyse, critique, commentaire, documentation),</li>
                <li>la quantité reproduite reste proportionnée à l'analyse,</li>
                <li><b>les droits soient explicitement attribués</b> à leur titulaire dans la caption
                (« © Marque / Agence — référencé en fair use éditorial »),</li>
                <li>l'origine de l'image soit publiquement disponible (presse, archive, brand newsroom,
                Wikipedia article).</li>
              </ul>
              <p style={{ margin: 0, marginTop: 8 }}>
                Conséquence : un asset emblématique (frame TVC, scan presse, OOH installation)
                peut être affiché sous <code style={{ ...inlineCode, fontSize: 11 }}>license: "fair-use"</code>
                avec attribution. Pas besoin de Wikimedia Commons exclusivement.
              </p>
            </div>
          </SubBlock>
        </Section>

        {/* 4. ASSETS */}
        <Section
          title="4. assets (≥ 1)"
          intro="Le bundle de l'opération : tagline, manifeste, TVC, posters, OOH, logo, etc."
        >
          <Fields
            fields={[
              {
                key: 'assets[].function',
                type: 'enum (47 fonctions, cf. ci-dessous)',
                required: true,
                example: '"TAGLINE"',
              },
              {
                key: 'assets[].role',
                type: '"HERO" | "PRIMARY" | "DECLINATION" | "COMPANION" | "EXTRACTED"',
                required: true,
                example: '"HERO"',
              },
              {
                key: 'assets[].kind',
                type: '"IMAGE" | "VIDEO" | "AUDIO" | "TEXT" | "EMBED_YOUTUBE" | "EMBED_VIMEO"',
                required: true,
                example: '"TEXT"',
              },
              {
                key: 'assets[].url',
                type: 'string (URL média OU chemin local OU "" pour TEXT)',
                required: true,
                example: '"/images/wikimedia/Walt_Stack_1989.jpg"',
              },
              { key: 'assets[].posterUrl', type: 'string?', required: false, example: '"/images/wikimedia/GG_poster.jpg"' },
              {
                key: 'assets[].aspectRatio',
                type: '"1:1" | "4:3" | "3:4" | "16:9" | "9:16" | "21:9" | "4:5"',
                required: true,
                example: '"16:9"',
              },
              {
                key: 'assets[].text',
                type: 'string? (verbatim pour TEXT)',
                required: false,
                example: '"Just Do It."',
              },
              { key: 'assets[].format', type: 'string?', required: false, example: '"TVC 30s — broadcast US fall 1988"' },
              { key: 'assets[].caption', type: 'string?', required: false, example: '"Écrit par Dan Wieden en 1988."' },
              { key: 'assets[].alt', type: 'string? (a11y)', required: false, example: '"Photographie de Walt Stack…"' },
              { key: 'assets[].durationSec', type: 'number?', required: false, example: '30' },
              { key: 'assets[].sourceIndex', type: 'number? (index dans sources[])', required: false, example: '0' },
            ]}
          />
          <SubBlock title="Fonctions d'asset (47)">
            <p style={subText}>
              Groupées par grande famille marketing. Chaque opération a typiquement 1 hero + 2-3 primary + N déclinaisons.
            </p>
            {Object.entries(ASSET_FUNCTION_GROUPS).map(([group, fns]) => (
              <div key={group} style={{ marginBottom: 16 }}>
                <h4
                  className="mono"
                  style={{
                    fontSize: 10.5,
                    color: 'var(--ink-3)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    margin: 0,
                    marginBottom: 6,
                  }}
                >
                  {group}
                </h4>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(fns as readonly AssetFunction[]).map((fn) => (
                    <span
                      key={fn}
                      className="pill"
                      style={{ fontSize: 11, padding: '3px 9px' }}
                      title={fn}
                    >
                      {ASSET_FUNCTION_LABELS[fn]}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </SubBlock>
        </Section>

        {/* 5. CLASSIFICATION */}
        <Section
          title="5. classification"
          intro="Posture, kind, étape funnel, pillars, goals — la taxonomie applique 4 dimensions."
        >
          <SubBlock title="patternKind (14 valeurs)">
            <EnumTable
              rows={PATTERN_KINDS.map((k) => ({
                value: k,
                label: PATTERN_KIND_LABELS[k],
              }))}
            />
          </SubBlock>
          <SubBlock title="manipulationMode (4 valeurs)">
            <EnumTable
              rows={MANIPULATION_MODES.map((m) => ({
                value: m.value,
                label: m.label,
                desc: m.description,
              }))}
            />
          </SubBlock>
          <SubBlock title="funnelStage (5 valeurs)">
            <EnumTable rows={FUNNEL_STAGES.map((v) => ({ value: v }))} />
          </SubBlock>
          <SubBlock title="pillars (sous-ensemble de 8 lettres)">
            <EnumTable rows={PILLARS.map((p) => ({ value: p.value, label: p.label }))} />
          </SubBlock>
          <SubBlock title="operationGoals (10 valeurs)">
            <EnumTable rows={OPERATION_GOALS.map((v) => ({ value: v }))} />
          </SubBlock>
        </Section>

        {/* 6. AXES */}
        <Section
          title="6. axes (≥ 1)"
          intro="L'opération est notée sur N axes structurels (22 axes possibles). Chaque axe a une valeur qualitative + un score de confidence [0..1]."
        >
          <Fields
            fields={[
              { key: 'axes[].name', type: 'enum (22 axes, cf. ci-dessous)', required: true, example: '"PROVOCATION"' },
              {
                key: 'axes[].value',
                type: 'string (analyse qualitative)',
                required: true,
                example: '"Élevée pour l\'époque — a choisi un coureur de 80 ans…"',
              },
              { key: 'axes[].confidence', type: 'number [0..1]', required: true, example: '0.94' },
              {
                key: 'axes[].evidence',
                type: 'string? (citation source)',
                required: false,
                example: '"Wikipedia documente que la campagne s\'ouvre sur Walt Stack à 80 ans."',
              },
              { key: 'axes[].sourceIndex', type: 'number?', required: false, example: '0' },
            ]}
          />
          <SubBlock title="22 axes structurels">
            <EnumTable rows={STRUCTURAL_AXES.map((a) => ({ value: a, label: STRUCTURAL_AXIS_LABELS[a] }))} />
          </SubBlock>
        </Section>

        {/* 7. PERFORMANCE */}
        <Section
          title="7. performance"
          intro="Score composite + métriques sourcées + rationale. Chaque métrique porte son attribution."
        >
          <Fields
            fields={[
              {
                key: 'performance.primaryGoals',
                type: 'OperationGoal[]',
                required: true,
                example: '["BRAND_WORLD_BUILDING", "CATEGORY_DEFINITION"]',
              },
              { key: 'performance.overallAttribution', type: 'AttributionConfidence', required: true, example: '"PROVEN_CAUSAL"' },
              { key: 'performance.rationale', type: 'string?', required: false, example: '"Cas canonique de construction de marque…"' },
              { key: 'performance.metrics[].kind', type: 'enum (20 kinds)', required: true, example: '"SALES_LIFT_PCT"' },
              { key: 'performance.metrics[].value', type: 'number', required: true, example: '31' },
              { key: 'performance.metrics[].displayValue', type: 'string?', required: false, example: '"+31 % de ventes en ligne sur 10 jours"' },
              { key: 'performance.metrics[].goal', type: 'OperationGoal', required: true, example: '"DIRECT_SALE"' },
              { key: 'performance.metrics[].scope', type: '"OPERATION" | "ASSET"', required: true, example: '"OPERATION"' },
              { key: 'performance.metrics[].attribution', type: 'AttributionConfidence', required: true, example: '"CORRELATED"' },
              { key: 'performance.metrics[].source', type: 'string', required: true, example: '"Nike Q1 FY2019 investor disclosures"' },
              { key: 'performance.metrics[].measuredAtYearMonth', type: 'string? (YYYY-MM)', required: false, example: '"2018-09"' },
            ]}
          />
          <SubBlock title="Métriques disponibles (20 kinds)">
            <EnumTable rows={METRIC_KINDS.map((k) => ({ value: k }))} />
          </SubBlock>
          <SubBlock title="Attribution (4 niveaux)">
            <EnumTable rows={ATTRIBUTIONS.map((a) => ({ value: a.value, label: a.label, desc: a.description }))} />
          </SubBlock>
        </Section>

        {/* 8. VICTORIES */}
        <Section
          title="8. victoryTypes"
          intro="Les preuves de réussite documentées (awards, longévité, statut culte, imitations)."
        >
          <EnumTable rows={VICTORY_TYPES.map((v) => ({ value: v, label: VICTORY_LABELS[v] }))} />
        </Section>

        {/* 9. NARRATIVE */}
        <Section
          title="9. champs narratifs top-level"
          intro="Les 3 champs qui font le récit éditorial d'Argos."
        >
          <Fields
            fields={[
              {
                key: 'summary',
                type: 'string',
                required: true,
                example: '"Trois mots en impératif, un coureur de 80 ans sur le Golden Gate Bridge…"',
              },
              {
                key: 'patternObservation',
                type: 'string?',
                required: false,
                example: '"Posture de Facilitateur poussée à son extrême. Le produit n\'apparaît presque pas…"',
              },
              {
                key: 'significance',
                type: 'string?',
                required: false,
                example: '"Point d\'inflexion pour la publicité sportswear…"',
              },
              { key: 'confidence', type: '"HIGH" | "MEDIUM" | "LOW" | "ESTIMATED"', required: true, example: '"HIGH"' },
            ]}
          />
          <SubBlock title="Niveaux de confiance">
            <EnumTable rows={CONFIDENCE_LEVELS.map((c) => ({ value: c.value, desc: c.description }))} />
          </SubBlock>
        </Section>

        {/* WORKFLOW */}
        <Section
          title="Workflow d'ingestion"
          intro="Trois étapes, idempotent par slug."
        >
          <ol style={{ paddingLeft: 22, margin: 0, display: 'grid', gap: 10, fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            <li>
              <b>Préparer</b> le JSON conformément à ce schema (utiliser <code style={inlineCode}>dossier-template.json</code> comme point de départ).
            </li>
            <li>
              <b>Soumettre</b> via{' '}
              <Link href="/admin/ingest" style={accent}>
                /admin/ingest
              </Link>{' '}
              (UI) ou <code style={inlineCode}>POST /api/v1/ingest/dossier</code> (programmatique).
            </li>
            <li>
              <b>Validation Zod</b> stricte : si une seule contrainte échoue, tout le dossier est refusé.
              Pas de stockage partiel. Le slug est généré depuis brand + title + year.
            </li>
            <li>
              <b>Idempotence</b> : ré-ingérer le même JSON met à jour les champs ; pas de duplication.
            </li>
          </ol>
        </Section>
      </div>
    </section>
  );
}

/* -------------------------------- helpers -------------------------------- */

function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        marginBottom: 40,
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: 22,
        padding: 28,
      }}
    >
      <header style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 24, letterSpacing: '-0.015em', fontWeight: 600 }}>
          {title}
        </h2>
        {intro && (
          <p style={{ marginTop: 6, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            {intro}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

function Fields({
  fields,
}: {
  fields: { key: string; type: string; required: boolean; example: string }[];
}) {
  return (
    <div style={{ display: 'grid', gap: 0 }}>
      <div
        className="mono"
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 2fr 1fr 3fr',
          fontSize: 11,
          color: 'var(--ink-3)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          padding: '8px 0',
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        <span>Champ</span>
        <span>Type</span>
        <span>Requis</span>
        <span>Exemple</span>
      </div>
      {fields.map((f) => (
        <div
          key={f.key}
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr 1fr 3fr',
            fontSize: 13,
            padding: '10px 0',
            borderBottom: '1px solid var(--line-soft)',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          <code style={inlineCode}>{f.key}</code>
          <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono), monospace', fontSize: 12 }}>
            {f.type}
          </span>
          <span style={{ fontSize: 11 }}>
            {f.required ? (
              <span
                className="pill"
                style={{ background: 'var(--coral-soft)', color: '#74281a', padding: '2px 8px', fontSize: 10 }}
              >
                requis
              </span>
            ) : (
              <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>optionnel</span>
            )}
          </span>
          <code
            style={{
              ...inlineCode,
              color: 'var(--ink-3)',
              fontSize: 11.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {f.example}
          </code>
        </div>
      ))}
    </div>
  );
}

function EnumTable({
  rows,
}: {
  rows: { value: string; label?: string; desc?: string }[];
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 8,
      }}
    >
      {rows.map((r) => (
        <div
          key={r.value}
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--line-soft)',
            borderRadius: 12,
            padding: 12,
          }}
        >
          <code style={{ ...inlineCode, fontSize: 11.5 }}>{r.value}</code>
          {r.label && (
            <div style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
              {r.label}
            </div>
          )}
          {r.desc && (
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.45 }}>
              {r.desc}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SubBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 22 }}>
      <h3
        style={{
          margin: 0,
          marginBottom: 10,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--ink)',
          letterSpacing: '-0.005em',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--line-soft)',
        borderRadius: 12,
        padding: 16,
        fontSize: 12.5,
        fontFamily: 'var(--font-mono), monospace',
        color: 'var(--ink)',
        overflow: 'auto',
        lineHeight: 1.5,
        margin: 0,
      }}
    >
      <code>{children}</code>
    </pre>
  );
}

const inlineCode = {
  fontFamily: 'var(--font-mono), monospace',
  fontSize: 12,
  background: 'var(--bg-2)',
  padding: '2px 6px',
  borderRadius: 4,
  color: 'var(--ink)',
} as const;

const accent = { color: 'var(--coral)', textDecoration: 'underline' } as const;
const chipStyle = { textDecoration: 'none' } as const;
const subText = { fontSize: 13, color: 'var(--ink-3)', margin: 0, marginBottom: 10 } as const;
