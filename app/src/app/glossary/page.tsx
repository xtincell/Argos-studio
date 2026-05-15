import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ASSET_FUNCTION_GROUPS,
  ASSET_FUNCTION_LABELS,
  MANIPULATION_MODE_DESCRIPTIONS,
  MANIPULATION_MODE_LABELS,
  OPERATION_GOAL_LABELS,
  PATTERN_KIND_LABELS,
  PILLAR_LABELS,
  STRUCTURAL_AXIS_LABELS,
  VICTORY_LABELS,
} from '@/lib/taxonomy';
import {
  listAssetFunctions,
  listAwards,
  listManipulationModes,
  listOperationGoals,
  listPatternKinds,
  listStructuralAxes,
} from '@/lib/library';
import type {
  AssetFunction,
  ManipulationMode,
  OperationGoal,
  PatternKind,
  Pillar,
  StructuralAxisName,
  VictoryType,
} from '@/lib/types';

export const metadata: Metadata = {
  title: 'Glossaire — taxonomie Argos',
  description:
    "Définitions des 22 axes structurels, 14 pattern kinds, 4 postures, 47 fonctions d'asset, 14 victoires, 10 objectifs et niveaux de licence — la taxonomie complète de la bibliothèque Argos.",
};

const AXIS_DEFINITIONS: Record<StructuralAxisName, string> = {
  FILIATION: 'Ce que l\'opération hérite (qui l\'a inspirée) et ce qu\'elle transmet (qui elle inspire).',
  PROVOCATION: "L'intensité de la rupture avec les conventions de la catégorie.",
  AUCTORIALITY: "La force de la voix d'auteur (agence, fondateur, réalisateur) reconnaissable dans l'opération.",
  SERIAL_RECURRENCE: "La régularité avec laquelle un motif réapparaît dans la marque ou l'agence.",
  CULTURAL_DECALAGE: "L'écart entre le langage de l'opération et celui de son audience cible.",
  COGNITIVE_MECHANISM: 'Le mécanisme mental que l\'opération active (compression, inversion, répétition…).',
  CULTURAL_TEMPO: "L'alignement entre le tempo de l'opération et le moment culturel.",
  MORAL_VALENCE: 'La position éthique assumée — neutre, progressiste, conservatrice, contestataire.',
  META_CONSCIOUSNESS: "Le degré de conscience que l'opération a de sa propre nature publicitaire.",
  NARRATIVE_DENSITY: "Combien d'information narrative est compressée par seconde / par cm².",
  TEMPORAL_MODALITY: "L'opération vit dans le présent, anticipe, ou réécrit le passé.",
  RECIPIENT_AUTHORSHIP: "Le degré auquel l'audience co-écrit le sens de l'opération (UGC, remix, parodie).",
  EXTERNAL_REFERENTIALITY: 'Les références extra-marque convoquées (films, œuvres, faits historiques).',
  REQUIRED_CULTURAL_CAPITAL: "Le capital culturel nécessaire pour comprendre pleinement l'opération.",
  INFO_VS_EMOTION_DENSITY: "Le ratio rationalité / émotion dans la mécanique persuasive.",
  PROMISE_STRATEGY: 'La nature de la promesse (fonctionnelle, identitaire, spirituelle, anti-promesse).',
  MEME_CREATION_VS_RECOVERY: "Création d'un nouveau motif culturel vs reprise/détournement d'un motif existant.",
  ATTENTION_PATTERN: 'Le canal et le rythme par lesquels l\'opération capte l\'attention (broadcast, viral, sériel).',
  CATEGORICAL_FIDELITY: 'Le degré de respect des conventions de la catégorie (high = sage, low = transgressif).',
  COMPETITOR_POSTURE: 'La manière dont l\'opération se positionne face à un concurrent nommé ou implicite.',
  ASSUMED_AMBIGUITY: "Combien d'ambiguïté l'opération assume sans la résoudre.",
  BRAND_CHARACTER_STRATEGY: 'La stratégie de personnage : marque-narratrice, marque-discrète, marque-héros, etc.',
};

const PATTERN_DEFINITIONS: Record<PatternKind, string> = {
  IMAGE: 'Affiches, posters, KV, photographies, illustrations — assets fixes 2D.',
  VIDEO: 'TVC, brand films, social videos, teasers — assets en mouvement.',
  AUDIO: 'Jingles, sound logos, podcasts sponsorisés, spots radio.',
  TEXT: 'Manifestes, slogans, body copies, microcopy — opérations textuelles pures.',
  SPATIAL: 'Activations physiques, installations, expériences immersives en lieu.',
  DIGITAL_INTERACTION: 'Sites, micro-sites, app, AR filters, interactive experiences.',
  MIXED: "Bundles cross-média dont aucun médium ne domine clairement.",
  BRAND_SYSTEM: "Système de marque (identité, design system) cohérent traité comme opération.",
  PERFORMANCE_LIVE: 'Performances live, prises de parole en direct, événements émetteurs.',
  EDITORIAL_LONG_FORM: 'Articles, books, dossiers de presse longs portés par la marque.',
  OBJECT: 'Produit ou packaging élevé au rang d\'opération marketing à part entière.',
  SERVICE_SIGNATURE: "Geste de service répétable qui fonctionne comme signature de marque.",
  PERSONAL_BRAND: "Personnalité publique (fondateur, créateur) traitée comme une marque opérée.",
  RITUAL: "Rituel récurrent que la marque met en scène ou s'approprie.",
};

const FUNNEL_STAGE_DEFINITIONS = {
  AWARENESS: 'Faire connaître — la marque entre dans le radar.',
  CONSIDERATION: 'Faire considérer — la marque rentre dans la short-list.',
  CONVERSION: 'Faire acheter — la marque transforme l\'intention en acte.',
  RETENTION: 'Faire revenir — la marque garde le client après le premier achat.',
  ADVOCACY: 'Faire évangéliser — le client porte la marque à d\'autres.',
};

const PILLAR_DEFINITIONS: Record<Pillar, string> = {
  A: 'Attention — capter le regard, traverser le bruit.',
  D: 'Distinction — être identifiable d\'un coup d\'œil.',
  V: 'Valence — porter une charge émotionnelle ou éthique.',
  E: 'Emotion — produire un sentiment.',
  R: 'Reframe — recadrer une catégorie ou une représentation.',
  T: 'Truth — porter une vérité contre-narrative.',
  I: 'Imitation — devenir un modèle reproduit par d\'autres.',
  S: 'Substance — densité narrative et conceptuelle.',
};

const OPERATION_GOAL_DEFINITIONS: Record<OperationGoal, string> = {
  DIRECT_SALE: 'Vendre directement.',
  AWARENESS: 'Construire la notoriété.',
  CONSIDERATION: 'Entrer dans la considération.',
  CONVERSION: 'Convertir une intention en achat.',
  RETENTION: 'Retenir les clients existants.',
  ADVOCACY: 'Activer l\'évangélisme client.',
  BRAND_WORLD_BUILDING: "Construire un monde de marque cohérent dans la durée.",
  CATEGORY_DEFINITION: "Redéfinir les codes d'une catégorie.",
  CRISIS_RESPONSE: 'Répondre à une crise (réputation, marché).',
  RECRUITMENT: 'Recruter des talents.',
};

const VICTORY_DEFINITIONS: Record<VictoryType, string> = {
  CANNES_LIONS_GOLD: 'Or au Festival International de la Créativité de Cannes.',
  CANNES_LIONS_SILVER: 'Argent au Festival International de la Créativité de Cannes.',
  CANNES_LIONS_BRONZE: 'Bronze au Festival International de la Créativité de Cannes.',
  DANDAD_PENCIL: 'D&AD Pencil — récompense British design and advertising.',
  EFFIE_GOLD: 'Effie Or — récompense l\'efficacité publicitaire mesurée.',
  LOERIES_GRAND_PRIX: 'Grand Prix des Loeries — sommet de la créativité africaine.',
  PIKINE_GRAND_PRIX: 'Grand Prix de Pikine — récompense francophone d\'Afrique de l\'Ouest.',
  LOCAL_DOMINANCE_PROVEN: 'Domination locale documentée sur un marché géographique.',
  VIRAL_REACH: 'Reach viral organique mesuré (partages, mentions, parodies).',
  LONGEVITY_PROVEN: 'Longévité prouvée — pattern actif sur 5+ années.',
  CULT_STATUS_DOCUMENTED: 'Statut culte documenté (citations académiques, musées, références récurrentes).',
  COMMERCIAL_IMPACT_PROVEN: 'Impact commercial prouvé avec données (ventes, market cap, market share).',
  BRAND_WORLD_DOOR: "Porte d'entrée vers le monde de marque — ouvre un univers cohérent à venir.",
  COMPETITOR_IMITATED: "Imité par la concurrence directe (preuve d'influence par copie).",
};

export default async function GlossaryPage() {
  const [axesFacets, kindsFacets, modesFacets, fnsFacets, goalsFacets, awardsFacets] =
    await Promise.all([
      listStructuralAxes(),
      listPatternKinds(),
      listManipulationModes(),
      listAssetFunctions(),
      listOperationGoals(),
      listAwards(),
    ]);

  const axisCount = new Map(axesFacets.map((f) => [f.value, f.count]));
  const kindCount = new Map(kindsFacets.map((f) => [f.value, f.count]));
  const modeCount = new Map(modesFacets.map((f) => [f.value, f.count]));
  const goalCount = new Map(goalsFacets.map((f) => [f.value, f.count]));
  const victoryCount = new Map(awardsFacets.map((f) => [f.value, f.count]));

  return (
    <section className="view">
      <div className="wrap" style={{ paddingTop: 32, paddingBottom: 80, maxWidth: 1100 }}>
        <header style={{ marginBottom: 36 }}>
          <p
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--ink-3)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              margin: 0,
              marginBottom: 12,
            }}
          >
            Glossaire · taxonomie Argos
          </p>
          <h1
            style={{
              fontSize: 48,
              letterSpacing: '-0.025em',
              margin: 0,
              fontWeight: 600,
              textWrap: 'balance',
            }}
          >
            Le vocabulaire <span className="serif">Argos.</span>
          </h1>
          <p style={{ marginTop: 14, maxWidth: 760, fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            Chaque dossier Argos est qualifié sur cette taxonomie. Définitions précises, comptes
            actuels par valeur, liens directs vers les opérations qui la matérialisent.
          </p>

          {/* TOC */}
          <nav
            style={{
              marginTop: 24,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              fontSize: 12,
            }}
          >
            {[
              ['axes', '22 axes structurels'],
              ['kinds', '14 pattern kinds'],
              ['modes', '4 postures'],
              ['funnels', '5 étapes funnel'],
              ['pillars', '8 piliers'],
              ['goals', '10 objectifs'],
              ['victories', '14 victoires'],
              ['functions', '47 fonctions d\'asset'],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="pill" style={{ textDecoration: 'none' }}>
                {label}
              </a>
            ))}
          </nav>
        </header>

        <GlossarySection id="axes" title="22 axes structurels" subtitle="Les dimensions sur lesquelles chaque opération est notée, avec confidence entre 0 et 1.">
          <DefList>
            {(Object.keys(AXIS_DEFINITIONS) as StructuralAxisName[]).map((k) => (
              <DefRow
                key={k}
                term={STRUCTURAL_AXIS_LABELS[k]}
                code={k}
                count={axisCount.get(k) ?? 0}
                href={`/by/axis/${k.toLowerCase().replace(/_/g, '-')}`}
                definition={AXIS_DEFINITIONS[k]}
              />
            ))}
          </DefList>
        </GlossarySection>

        <GlossarySection id="kinds" title="14 pattern kinds" subtitle="La forme matérielle dominante de l'opération.">
          <DefList>
            {(Object.keys(PATTERN_DEFINITIONS) as PatternKind[]).map((k) => (
              <DefRow
                key={k}
                term={PATTERN_KIND_LABELS[k]}
                code={k}
                count={kindCount.get(k) ?? 0}
                href={`/by/pattern-kind/${k.toLowerCase().replace(/_/g, '-')}`}
                definition={PATTERN_DEFINITIONS[k]}
              />
            ))}
          </DefList>
        </GlossarySection>

        <GlossarySection id="modes" title="4 postures (manipulation modes)" subtitle="Le rapport que la marque entretient avec son audience.">
          <DefList>
            {(Object.keys(MANIPULATION_MODE_LABELS) as ManipulationMode[]).map((k) => (
              <DefRow
                key={k}
                term={MANIPULATION_MODE_LABELS[k]}
                code={k}
                count={modeCount.get(k) ?? 0}
                href={`/by/manipulation-mode/${k.toLowerCase()}`}
                definition={MANIPULATION_MODE_DESCRIPTIONS[k]}
              />
            ))}
          </DefList>
        </GlossarySection>

        <GlossarySection id="funnels" title="5 étapes du funnel" subtitle="L'étape du parcours d'achat ciblée par l'opération.">
          <DefList>
            {(Object.keys(FUNNEL_STAGE_DEFINITIONS) as Array<keyof typeof FUNNEL_STAGE_DEFINITIONS>).map(
              (k) => (
                <DefRow
                  key={k}
                  term={k.charAt(0) + k.slice(1).toLowerCase()}
                  code={k}
                  definition={FUNNEL_STAGE_DEFINITIONS[k]}
                />
              ),
            )}
          </DefList>
        </GlossarySection>

        <GlossarySection id="pillars" title="8 piliers (ADVERTIS)" subtitle="Les leviers persuasifs que l'opération mobilise.">
          <DefList>
            {(Object.keys(PILLAR_DEFINITIONS) as Pillar[]).map((k) => (
              <DefRow
                key={k}
                term={`${k} · ${PILLAR_LABELS[k]}`}
                code={k}
                href={`/by/pillar/${k.toLowerCase()}`}
                definition={PILLAR_DEFINITIONS[k]}
              />
            ))}
          </DefList>
        </GlossarySection>

        <GlossarySection id="goals" title="10 objectifs d'opération" subtitle="Ce que l'opération cherche à produire.">
          <DefList>
            {(Object.keys(OPERATION_GOAL_DEFINITIONS) as OperationGoal[]).map((k) => (
              <DefRow
                key={k}
                term={OPERATION_GOAL_LABELS[k]}
                code={k}
                count={goalCount.get(k) ?? 0}
                href={`/by/operation-goal/${k.toLowerCase().replace(/_/g, '-')}`}
                definition={OPERATION_GOAL_DEFINITIONS[k]}
              />
            ))}
          </DefList>
        </GlossarySection>

        <GlossarySection id="victories" title="14 victoires documentées" subtitle="Les preuves de réussite attachées aux opérations.">
          <DefList>
            {(Object.keys(VICTORY_DEFINITIONS) as VictoryType[]).map((k) => (
              <DefRow
                key={k}
                term={VICTORY_LABELS[k]}
                code={k}
                count={victoryCount.get(k) ?? 0}
                href={`/award/${k.toLowerCase().replace(/_/g, '-')}`}
                definition={VICTORY_DEFINITIONS[k]}
              />
            ))}
          </DefList>
        </GlossarySection>

        <GlossarySection
          id="functions"
          title="47 fonctions d'asset"
          subtitle="La fonction marketing précise de chaque pièce du bundle."
        >
          {Object.entries(ASSET_FUNCTION_GROUPS).map(([group, fns]) => (
            <div key={group} style={{ marginTop: 18 }}>
              <h4
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
                {group}
              </h4>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(fns as readonly AssetFunction[]).map((fn) => (
                  <Link
                    key={fn}
                    href={`/by/asset-function/${fn.toLowerCase().replace(/_/g, '-')}`}
                    className="pill"
                    style={{ textDecoration: 'none', fontSize: 11 }}
                    title={fn}
                  >
                    {ASSET_FUNCTION_LABELS[fn]}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </GlossarySection>

        <section
          style={{
            marginTop: 40,
            padding: 24,
            background: 'var(--coral-soft)',
            border: '1px solid var(--line-soft)',
            borderRadius: 18,
            fontSize: 13,
            color: '#4a1810',
            lineHeight: 1.6,
          }}
        >
          <h3 style={{ margin: 0, marginBottom: 8, fontSize: 17, fontWeight: 600 }}>
            Pour aller plus loin
          </h3>
          <p style={{ margin: 0 }}>
            La taxonomie complète, ses contraintes Zod et les exemples canoniques sont documentés
            dans la{' '}
            <Link href="/docs/research-dossier-spec" style={{ color: '#4a1810', textDecoration: 'underline' }}>
              spécification du dossier de recherche
            </Link>
            .
          </p>
        </section>
      </div>
    </section>
  );
}

function GlossarySection({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      style={{
        marginBottom: 40,
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: 18,
        padding: 24,
        scrollMarginTop: 80,
      }}
    >
      <header style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: '-0.015em', fontWeight: 600 }}>
          {title}
        </h2>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-3)' }}>{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

function DefList({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gap: 0 }}>{children}</div>;
}

function DefRow({
  term,
  code,
  definition,
  count,
  href,
}: {
  term: string;
  code: string;
  definition: string;
  count?: number;
  href?: string;
}) {
  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '180px 1fr 60px',
    gap: 16,
    padding: '12px 0',
    borderBottom: '1px solid var(--line-soft)',
    textDecoration: 'none',
    color: 'inherit',
    alignItems: 'baseline',
  } as const;
  const inner = (
    <>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{term}</div>
        <code
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 10.5,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
          }}
        >
          {code}
        </code>
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{definition}</div>
      {count !== undefined ? (
        <div
          className="mono"
          style={{
            fontSize: 12,
            color: count > 0 ? 'var(--coral)' : 'var(--ink-3)',
            textAlign: 'right',
            fontWeight: 600,
          }}
        >
          {count}
        </div>
      ) : (
        <div />
      )}
    </>
  );
  if (href) {
    return (
      <Link href={href} style={rowStyle}>
        {inner}
      </Link>
    );
  }
  return <div style={rowStyle}>{inner}</div>;
}
