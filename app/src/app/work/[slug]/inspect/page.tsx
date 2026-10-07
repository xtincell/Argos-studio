import type { Metadata } from 'next';
import type React from 'react';
import { notFound } from 'next/navigation';
import { WorkViewTabs } from '@/components/work-view-tabs';
import { getAllReferences, getReferenceBySlug } from '@/lib/library';
import {
  type Asset,
  type AttributionConfidence,
  type Reference,
  type StructuralAxis,
  type VictoryType,
  getHeroAsset,
  metricEvidenceKey,
} from '@/lib/types';

interface InspectPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await getAllReferences()).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: InspectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const reference = await getReferenceBySlug(slug);
  if (!reference) return { title: 'Inspect — reference not found' };
  return {
    title: `${reference.title} — inspect`,
    description: `Analytical view of ${reference.title} by ${reference.brandEmitter}.`,
  };
}

export default async function InspectView({ params }: InspectPageProps) {
  const { slug } = await params;
  const reference = await getReferenceBySlug(slug);
  if (!reference) notFound();
  const hero = getHeroAsset(reference);

  return (
    <section className="view" data-view="inspect">
      <div className="wrap">
        <WorkViewTabs slug={slug} active="inspect" />
        <SpecTop reference={reference} hero={hero} />
        <WinsRow reference={reference} />
        <AxisBento axes={reference.axes} />
        <PerfBento reference={reference} />
        <SpecBot reference={reference} />
      </div>
    </section>
  );
}

const ALL_VICTORIES: VictoryType[] = [
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

function SpecTop({ reference, hero }: { reference: Reference; hero?: Asset }) {
  const heroText = hero?.text ?? reference.title;
  const titleTail = pickTail(reference.title);
  const titleHead = reference.title.replace(titleTail, '').trimEnd();
  return (
    <div className="spec-top">
      <div className="l">
        <div className="pills">
          <span className="pill coral">
            <span className="sp" style={{ color: '#fff' }}>✦</span>{' '}
            {hero?.role === 'HERO' ? 'Asset hero' : 'Référence'}
          </span>
          <span className="pill butter">{(hero?.function ?? 'TAGLINE').replace(/_/g, ' ').toLowerCase()}</span>
          <span className="pill">
            {(hero?.kind ?? 'TEXT')} · {hero?.aspectRatio ?? '4:3'}
          </span>
          <span className="pill sage">
            {reference.axes.length} / 22 axes notés
          </span>
        </div>
        <h1>
          {titleHead} <span className="serif">{titleTail}</span>
        </h1>
        <p className="deck">{reference.summary}</p>
        <div className="meta">
          <div className="m">
            <div className="k">Marque</div>
            <div className="v">{reference.brandEmitter}</div>
          </div>
          <div className="m">
            <div className="k">Agence</div>
            <div className="v">{reference.agencyCreator ?? 'In-house'}</div>
          </div>
          <div className="m">
            <div className="k">Année</div>
            <div className="v">
              <span className="serif">{reference.emissionYear}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="r">
        <div className="corner tl">
          {reference.brandEmitter.split(' ')[0]} · {reference.emissionYear}
        </div>
        <div className="corner tr">{(hero?.role ?? 'HERO')} · {(hero?.function ?? 'TAGLINE').replace(/_/g, ' ')}</div>
        <div className="word">{heroText}</div>
        <div className="corner bl">
          {reference.marketPrimary.slice(0, 2).toUpperCase()}{' '}
          {reference.marketsSecondary.slice(0, 2).map((m) => `· ${m.slice(0, 2).toUpperCase()}`).join(' ')}
        </div>
        <div className="corner br">{reference.agencyCreator ?? '—'}</div>
      </div>
    </div>
  );
}

function WinsRow({ reference }: { reference: Reference }) {
  return (
    <div className="wins">
      <div className="lab">
        Victoires <span>· 14 types</span>
      </div>
      {ALL_VICTORIES.map((v) => {
        const on = reference.victoryTypes.includes(v);
        return (
          <span key={v} className={`w${on ? ' on' : ''}`}>
            <span className="sp">★</span>
            {humanVictory(v)}
          </span>
        );
      })}
    </div>
  );
}

function AxisBento({ axes }: { axes: StructuralAxis[] }) {
  const scored = [...axes].sort((a, b) => b.confidence - a.confidence);
  const empties = Math.max(0, 6 - scored.length);
  return (
    <div className="ax-bento">
      {scored.slice(0, 3).map((axis) => (
        <AxisCard key={axis.name} axis={axis} span={4} />
      ))}
      {scored.slice(3, 7).map((axis) => (
        <AxisCard key={axis.name} axis={axis} span={3} />
      ))}
      {scored.slice(7, 9).map((axis) => (
        <AxisCard key={axis.name} axis={axis} span={6} />
      ))}
      {['axis-a', 'axis-b', 'axis-c', 'axis-d', 'axis-e', 'axis-f'].slice(0, empties).map((slot) => (
        <div key={slot} className="ax-c empty" style={{ gridColumn: 'span 3' }}>
          <h4>Axe à scorer</h4>
          <div className="ev">Aucune évidence renseignée</div>
        </div>
      ))}
    </div>
  );
}

function AxisCard({ axis, span }: { axis: StructuralAxis; span: number }) {
  const confClass = axis.confidence >= 0.8 ? 'hi' : axis.confidence >= 0.6 ? 'md' : 'lo';
  const confLabel = axis.confidence >= 0.8 ? 'Forte' : axis.confidence >= 0.6 ? 'Moyenne' : 'Faible';
  return (
    <div className="ax-c" style={{ gridColumn: `span ${span}` }}>
      <div className="top">
        <span className="nm">{humanAxisName(axis.name)}</span>
        <span className={`conf ${confClass}`}>
          <span className="d" />
          {confLabel} · {axis.confidence.toFixed(2)}
        </span>
      </div>
      <h4>{splitForSerif(axis.value)}</h4>
      <div className="ev">
        {axis.evidence ?? 'Aucune évidence citée.'}
      </div>
      <div className="bar">
        <span
          className={`fl ${confClass}`}
          style={{ width: `${Math.round(axis.confidence * 100)}%` }}
        />
      </div>
    </div>
  );
}

function PerfBento({ reference }: { reference: Reference }) {
  const palette: ('sage' | 'butter' | 'coral' | '' | 'dark')[] = [
    'sage',
    'butter',
    'coral',
    '',
    'dark',
  ];
  const top = reference.performance.metrics.slice(0, 5);
  return (
    <div className="perf-bento">
      {palette.map((tone, i) => {
        const m = top[i];
        if (!m) {
          return (
            <div key={`empty-${tone || 'neutral'}`} className={`perf-c${tone ? ` ${tone}` : ''}`}>
              <div className="k">À renseigner</div>
              <div className="v" style={{ opacity: 0.4 }}>—</div>
              <div className="src">Aucune métrique</div>
            </div>
          );
        }
        const attClass = attributionClass(m.attribution);
        return (
          <div key={metricEvidenceKey(m)} className={`perf-c${tone ? ` ${tone}` : ''}`}>
            <div className="k">{humanMetricName(m.kind)}</div>
            <div className={`v ${m.kind.endsWith('_PCT') && m.value > 0 ? 'up' : ''}`}>
              {formatBigValue(m)}
            </div>
            <div className={`att ${attClass}`}>
              <span className="d" />
              {humanAttribution(m.attribution)}
            </div>
            <div className="src">
              <b>{m.source.split(' ').slice(0, 3).join(' ')}</b>{' '}
              {m.source.split(' ').slice(3).join(' ')}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SpecBot({ reference }: { reference: Reference }) {
  return (
    <div className="spec-bot">
      <SourcesCard reference={reference} />
      <BundleCard reference={reference} />
    </div>
  );
}

function SourcesCard({ reference }: { reference: Reference }) {
  const sources = (reference.researchSources ?? []).slice(0, 6);
  if (sources.length === 0) {
    return (
      <div className="srcs-c">
        <h3>
          Sources <span className="serif">— aucune</span>
        </h3>
        <div className="sub">Ce dossier n'a pas encore de sources documentées.</div>
      </div>
    );
  }
  const licenseClass = (l: string) =>
    l === 'free-to-use' ? 'free' : l === 'fair-use' ? 'fair' : 'press';
  const licenseLabel = (l: string) =>
    ({
      'free-to-use': 'Libre',
      'press-kit': 'Press-kit',
      'fair-use': 'Fair-use',
      'creator-permission': 'Avec permission',
      'paid-license': 'Sous licence',
      unknown: 'Licence inconnue',
    } as Record<string, string>)[l] ?? l;
  return (
    <div className="srcs-c">
      <h3>
        Sources <span className="serif">— {sources.length} tracée{sources.length > 1 ? 's' : ''}</span>
      </h3>
      <div className="sub">
        Toutes vérifiées · zéro <em className="serif">licence inconnue</em>
      </div>
      {sources.map((s, i) => (
        <div key={s.url} className="it">
          <div className="n">{String(i + 1).padStart(2, '0')}</div>
          <div className="t">
            <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
              <b>{s.title}</b>
            </a>
            <span className="pub">
              {s.publisher ?? ''}
              {s.publishedDate ? ` · ${s.publishedDate}` : ''}
            </span>
            {s.excerpt ? <span className="ex">« {s.excerpt} »</span> : null}
          </div>
          <div className={`lic ${licenseClass(s.license)}`}>
            {licenseLabel(s.license)}
          </div>
        </div>
      ))}
    </div>
  );
}

function BundleCard({ reference }: { reference: Reference }) {
  const assets = reference.assets;
  return (
    <div className="bund-c">
      <h3>
        Le <span className="serif">bundle</span>
      </h3>
      <div className="sub">
        {assets.length} assets · {assets.filter((a) => a.role === 'HERO').length} hero ·{' '}
        {assets.filter((a) => a.role === 'PRIMARY').length} primaires ·{' '}
        {assets.filter((a) => a.role === 'DECLINATION').length} déclinaisons ·{' '}
        {assets.filter((a) => a.role === 'COMPANION').length} compagnons ·{' '}
        {assets.filter((a) => a.role === 'EXTRACTED').length} extraits
      </div>
      <div className="g">
        {assets.slice(0, 14).map((a) => (
          <div key={a.id} className={`cl${a.role === 'HERO' ? ' hero' : ''}`}>
            <div className="r">
              {a.role.slice(0, 4)} · {a.kind}
            </div>
            <div className="nm">
              <span className="serif">{a.function.replace(/_/g, ' ').toLowerCase()}</span>
            </div>
            <div className="k">{a.kind}</div>
          </div>
        ))}
        {assets.length < 15 && (
          <div className="cl empty">
            <div className="r">—</div>
            <div className="nm">+ add</div>
            <div className="k" />
          </div>
        )}
      </div>
    </div>
  );
}

/* helpers */
function pickTail(title: string): string {
  const m = title.match(/[\s—-]+([^\s—-]+\.?)$/);
  return m?.[1] ?? title.split(/\s+/).pop() ?? title;
}

function humanAxisName(s: string): string {
  return (STRUCTURAL_AXIS_FR[s] ?? s.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()));
}

const STRUCTURAL_AXIS_FR: Record<string, string> = {
  FILIATION: 'Filiation',
  PROVOCATION: 'Provocation',
  AUCTORIALITY: 'Auctorialité',
  SERIAL_RECURRENCE: 'Récurrence sérielle',
  CULTURAL_DECALAGE: 'Décalage culturel',
  COGNITIVE_MECHANISM: 'Mécanisme cognitif',
  CULTURAL_TEMPO: 'Tempo culturel',
  MORAL_VALENCE: 'Valence morale',
  META_CONSCIOUSNESS: 'Méta-conscience',
  NARRATIVE_DENSITY: 'Densité narrative',
  TEMPORAL_MODALITY: 'Modalité temporelle',
  RECIPIENT_AUTHORSHIP: 'Auctorialité du récepteur',
  EXTERNAL_REFERENTIALITY: 'Référentialité externe',
  REQUIRED_CULTURAL_CAPITAL: 'Capital culturel requis',
  INFO_VS_EMOTION_DENSITY: 'Densité info/émotion',
  PROMISE_STRATEGY: 'Stratégie de promesse',
  MEME_CREATION_VS_RECOVERY: 'Création vs reprise de mème',
  ATTENTION_PATTERN: 'Pattern d\'attention',
  CATEGORICAL_FIDELITY: 'Fidélité catégorielle',
  COMPETITOR_POSTURE: 'Posture concurrent',
  ASSUMED_AMBIGUITY: 'Ambiguïté assumée',
  BRAND_CHARACTER_STRATEGY: 'Personnage de marque',
};

function humanMetricName(s: string): string {
  const map: Record<string, string> = {
    SALES_LIFT_PCT: 'Lift des ventes',
    UNITS_SOLD: 'Unités vendues',
    REVENUE_USD: 'Revenu',
    ROAS: 'ROAS',
    CONVERSION_RATE_PCT: 'Conversion',
    REACH_PERSONS: 'Reach',
    IMPRESSIONS: 'Impressions',
    RECALL_UNAIDED_PCT: 'Notoriété spontanée',
    BRAND_SEARCH_LIFT_PCT: 'Recherches marque',
    SHARE_OF_VOICE_PCT: 'Part de voix',
    NPS_DELTA: 'Δ NPS',
    BRAND_PREFERENCE_PCT: 'Préférence marque',
    CULT_INDEX_0_100: 'Indice culte',
    CULTURAL_PENETRATION_0_100: 'Pénétration culturelle',
    AWARDS_GOLD_COUNT: 'Awards Or',
    IMITATION_COUNT: 'Imitations',
    LONGEVITY_MONTHS: 'Longévité',
    ENGAGEMENT_RATE_PCT: 'Engagement',
    UGC_VOLUME: 'Volume UGC',
    COMPLETION_RATE_PCT: 'Complétion',
  };
  return map[s] ?? humanAxisName(s);
}

function humanVictory(s: string): string {
  const fr: Record<string, string> = {
    CANNES_LIONS_GOLD: 'Cannes Lions Or',
    CANNES_LIONS_SILVER: 'Cannes Lions Argent',
    CANNES_LIONS_BRONZE: 'Cannes Lions Bronze',
    DANDAD_PENCIL: 'D&AD Pencil',
    EFFIE_GOLD: 'Effie Or',
    LOERIES_GRAND_PRIX: 'Loeries Grand Prix',
    PIKINE_GRAND_PRIX: 'Pikine Grand Prix',
    LOCAL_DOMINANCE_PROVEN: 'Domination locale',
    VIRAL_REACH: 'Reach viral',
    LONGEVITY_PROVEN: 'Longévité prouvée',
    CULT_STATUS_DOCUMENTED: 'Statut culte',
    COMMERCIAL_IMPACT_PROVEN: 'Impact prouvé',
    BRAND_WORLD_DOOR: 'Marque-univers',
    COMPETITOR_IMITATED: 'Imité',
  };
  return fr[s] ?? s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatBigValue(m: { kind: string; value: number; displayValue?: string }): React.ReactNode {
  // For LONGEVITY_MONTHS, convert to years.
  if (m.kind === 'LONGEVITY_MONTHS') {
    const years = Math.round(m.value / 12);
    return (
      <>
        {years}
        <span className="u"> ans</span>
      </>
    );
  }
  // For *_PCT, append %.
  if (m.kind.endsWith('_PCT')) {
    // Try to extract a numeric/sign-prefixed token from displayValue first.
    if (m.displayValue) {
      const match = m.displayValue.match(/^[+\-]?[\d,.]+/);
      if (match) {
        return (
          <>
            {match[0]}
            <span className="u"> %</span>
          </>
        );
      }
    }
    return (
      <>
        {m.value}
        <span className="u"> %</span>
      </>
    );
  }
  // For 0_100 scales.
  if (m.kind.endsWith('_0_100')) {
    return (
      <>
        {m.value}
        <span className="u">/100</span>
      </>
    );
  }
  // Big numbers → compact.
  if (m.value >= 1_000_000_000) {
    return (
      <>
        {(m.value / 1_000_000_000).toFixed(1).replace('.', ',')}
        <span className="u"> G$</span>
      </>
    );
  }
  if (m.value >= 1_000_000) {
    return (
      <>
        {(m.value / 1_000_000).toFixed(0)}
        <span className="u"> M</span>
      </>
    );
  }
  if (m.value >= 1_000) {
    return (
      <>
        {(m.value / 1_000).toFixed(0)}
        <span className="u"> k</span>
      </>
    );
  }
  // Default — just the value.
  return <>{m.value}</>;
}

function humanAttribution(s: AttributionConfidence): string {
  return ({
    PROVEN_CAUSAL: 'causale prouvée',
    CORRELATED: 'corrélée',
    ESTIMATED: 'estimée',
    CLAIMED: 'revendiquée',
  } as Record<string, string>)[s] ?? s.toLowerCase().replace('_', ' ');
}

function attributionClass(a: AttributionConfidence): '' | 'cor' | 'clm' {
  if (a === 'PROVEN_CAUSAL') return '';
  if (a === 'CORRELATED' || a === 'ESTIMATED') return 'cor';
  return 'clm';
}

function splitForSerif(s: string): React.ReactNode {
  // Italicize the second half of the axis value for editorial visual rhythm
  const words = s.split(/\s+/);
  if (words.length < 4) return s;
  const split = Math.ceil(words.length / 2);
  return (
    <>
      {words.slice(0, split).join(' ')} <span className="serif">{words.slice(split).join(' ')}</span>
    </>
  );
}
