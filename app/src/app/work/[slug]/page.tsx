import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WorkViewTabs } from '@/components/work-view-tabs';
import { JsonLd } from '@/components/json-ld';
import { getAllReferences, getReferenceBySlug } from '@/lib/library';
import {
  type Asset,
  type PerformanceMetric,
  type Reference,
  getHeroAsset,
  metricEvidenceKey,
} from '@/lib/types';

interface WorkPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return (await getAllReferences()).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: WorkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const reference = await getReferenceBySlug(slug);
  if (!reference) return { title: 'Reference not found' };
  const fullTitle = `${reference.title} — ${reference.brandEmitter}`;
  return {
    title: fullTitle,
    description: reference.summary,
    openGraph: {
      type: 'article',
      title: fullTitle,
      description: reference.summary,
      url: `/work/${reference.slug}`,
      siteName: 'Argos',
      publishedTime: reference.researchDate,
      authors: reference.researcherName ? [reference.researcherName] : undefined,
      tags: [
        reference.brandEmitter,
        reference.sector,
        reference.patternKind,
        reference.manipulationMode,
        ...reference.victoryTypes,
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: reference.summary,
    },
    alternates: {
      canonical: `/work/${reference.slug}`,
    },
  };
}

export default async function ReadView({ params }: WorkPageProps) {
  const { slug } = await params;
  const reference = await getReferenceBySlug(slug);
  if (!reference) notFound();

  const hero = getHeroAsset(reference);
  const sidebarMetrics = pickSidebarMetrics(reference);
  const jsonLd = buildArticleJsonLd(reference);

  return (
    <section className="view" data-view="read">
      <JsonLd data={jsonLd} />
      <div className="wrap">
        <WorkViewTabs slug={slug} active="read" />
        <DossierGrid reference={reference} hero={hero} sidebarMetrics={sidebarMetrics} />
        <DossierBody reference={reference} />
        <DossierEssay reference={reference} />
        <DossierFiliations reference={reference} />
        <DossierSources reference={reference} />
      </div>
    </section>
  );
}

/**
 * Schema.org Article — gives Google + LinkedIn rich-card context.
 * We use Article rather than CreativeWork because Argos publishes editorial analyses.
 */
function buildArticleJsonLd(reference: Reference) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://argos.studio';
  const url = `${site}/work/${reference.slug}`;
  const heroAsset = getHeroAsset(reference);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${reference.title} — ${reference.brandEmitter}`,
    description: reference.summary,
    url,
    mainEntityOfPage: url,
    inLanguage: 'fr',
    isAccessibleForFree: true,
    image: heroAsset?.url || `${site}/work/${reference.slug}/opengraph-image`,
    author: reference.researcherName
      ? { '@type': 'Person', name: reference.researcherName }
      : { '@type': 'Organization', name: 'Argos' },
    publisher: {
      '@type': 'Organization',
      name: 'Argos',
      url: site,
    },
    datePublished: reference.researchDate ?? `${reference.emissionYear}-01-01`,
    dateModified: reference.researchDate ?? new Date().toISOString().slice(0, 10),
    about: [
      { '@type': 'Brand', name: reference.brandEmitter },
      { '@type': 'Thing', name: reference.sector },
      ...(reference.agencyCreator
        ? [{ '@type': 'Organization', name: reference.agencyCreator }]
        : []),
    ],
    keywords: [
      reference.brandEmitter,
      reference.sector,
      reference.patternKind,
      reference.manipulationMode,
      ...reference.victoryTypes,
      ...reference.operationGoals,
    ].join(', '),
    citation: (reference.researchSources ?? []).slice(0, 12).map((s) => ({
      '@type': 'CreativeWork',
      name: s.title,
      url: s.url,
      publisher: s.publisher ? { '@type': 'Organization', name: s.publisher } : undefined,
      datePublished: s.publishedDate,
    })),
  };
}

function DossierGrid({
  reference,
  hero,
  sidebarMetrics,
}: {
  reference: Reference;
  hero?: Asset;
  sidebarMetrics: PerformanceMetric[];
}) {
  const titleTail = pickTail(reference.title);
  const titleHead = reference.title.replace(titleTail, '').trimEnd();
  const heroImage = pickHeroImage(reference, hero);
  return (
    <div className="doss-grid">
      <div className="doss-cover">
        {heroImage && (
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              borderRadius: 16,
              overflow: 'hidden',
              marginBottom: 18,
              background: 'var(--bg-2)',
            }}
          >
            <Image
              src={heroImage.url}
              alt={heroImage.alt ?? heroImage.caption ?? reference.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 60vw"
              style={{ objectFit: 'cover' }}
            />
          </div>
        )}
        <div className="top-row">
          <div className="pills">
            <span className="pill coral">
              <span className="sp" style={{ color: '#fff' }}>✦</span> Hero
            </span>
            {reference.victoryTypes.slice(0, 2).map((v) => (
              <span key={v} className="pill">
                {humanVictory(v)}
              </span>
            ))}
          </div>
          <div className="meta">
            DOSSIER · {reference.id.slice(-4).toUpperCase()} · {reference.marketPrimary.split(' ')[0]?.slice(0, 2).toUpperCase() ?? '—'} {reference.emissionYear}
          </div>
        </div>
        <div className="kicker">
          <b>{reference.brandEmitter}</b> &middot; a long read
        </div>
        <h1>
          {titleHead} <span className="serif">{titleTail}</span>
        </h1>
        <div className="deck">{reference.summary}</div>
        {reference.researchDate && (
          <div
            className="mono"
            style={{
              marginTop: 14,
              fontSize: 11,
              color: 'var(--ink-3)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Dossier vérifié {reference.researchDate}
          </div>
        )}
      </div>

      <div className="doss-side">
        <div className="ss coral">
          <div className="k">Score d'imitabilité</div>
          <div className="v">
            {reference.performance.composite}
            <span className="u"> / 100</span>
          </div>
          <div className="sub">
            Attribution <b>{humanAttribution(reference.performance.overallAttribution)}</b>
          </div>
        </div>
        {sidebarMetrics.slice(0, 3).map((m, i) => {
          const tone = (['butter', '', 'dark'] as const)[i] ?? '';
          const color = (['#3a8e5c', 'var(--coral)', '#fff'] as const)[i] ?? 'inherit';
          return (
            <div key={metricEvidenceKey(m)} className={`ss ${tone}`.trim()}>
              <div className="k">{humanMetricLabel(m.kind)}</div>
              <div className="v" style={{ color }}>
                {m.displayValue ?? formatMetricValue(m)}
              </div>
              {m.source && (
                <div className="sub">
                  {humanAttribution(m.attribution)} · {shortify(m.source, 56)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DossierBody({ reference }: { reference: Reference }) {
  const axes = reference.axes.slice(0, 6);
  return (
    <div className="doss-body">
      <article className="doss-art">
        <div className="act">
          <div className="act-h">
            <span className="n">ACTE 01</span>
            <h3>
              Le <span className="serif">pari</span>
            </h3>
          </div>
          <p>
            {reference.patternObservation ??
              `${reference.brandEmitter} a fait un pari à contre-courant de chaque réflexe de la catégorie : retirer la marque du centre du récit. Le choix de confier le brief à ${reference.agencyCreator ?? 'leur agence'} relève de la même logique d'effacement.`}
            <sup>1</sup>
          </p>
          <div className="callout">
            <div className="ic">✦</div>
            <div className="ct">
              <div className="k">La décision qui a tout joué</div>
              <div className="v">
                {axes[0]?.value ??
                  'Sortir la marque du centre. Laisser le client parler en premier. Faire de la marque le verbe, jamais le sujet.'}
              </div>
            </div>
          </div>
        </div>

        <div className="act">
          <div className="act-h">
            <span className="n">ACTE 02</span>
            <h3>
              L'<span className="serif">exécution</span>
            </h3>
          </div>
          <p>
            {axes[1]?.evidence ??
              "Production menée en sprints courts et délibérés. Casting non-professionnel, codes culturels natifs, lieux réels. Le mix média inverse la norme de la catégorie."}
            <sup>2</sup>
          </p>
          <div className="pull">
            {axes[2]?.value ??
              "On ne vend rien. On documente un basculement déjà en cours — la marque arrive après, comme l'état civil arrive après la naissance."}
          </div>
        </div>

        <div className="act">
          <div className="act-h">
            <span className="n">ACTE 03</span>
            <h3>
              Ce qui s'est <span className="serif">vraiment</span> passé
            </h3>
          </div>
          <p>
            {reference.performance.rationale ??
              `Performance solide sur toute la ligne. C'est le différentiel contre contrôle qui qualifie l'attribution de causale prouvée.`}
            <sup>3</sup>
          </p>
        </div>

        <div className="act">
          <div className="act-h">
            <span className="n">ACTE 04</span>
            <h3>
              Ce qu'il faut <span className="serif">retenir</span>
            </h3>
          </div>
          <p>
            {reference.significance ??
              "Trois leçons transférables. Un — la posture choisie paye commercialement, mais seulement si la discipline est totale. Deux — ancrer dans un média, prouver dans un autre. Trois — l'auctorialité protège l'opération de l'exotisme."}
          </p>
        </div>
      </article>

      <aside className="doss-marg">
        <div className="mc">
          <h4>Notes de marge · paramètres</h4>
          {axes.map((axis, i) => (
            <div key={axis.name} className="it">
              <span className="sup">{i + 1}</span>
              <div className="body">
                <div className="k">{humanAxisName(axis.name)}</div>
                <div className="v">
                  <b>{shortify(axis.value, 28)}</b>{' '}
                  <span className="serif">· {axis.confidence.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mc">
          <h4>Confiance</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
            <div style={{ background: 'var(--sage-soft)', borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#3e5128', lineHeight: 1 }}>
                {axes.length}
              </div>
              <div style={{ fontSize: 10.5, color: '#3e5128', marginTop: 3, fontWeight: 500 }}>
                axes notés
              </div>
            </div>
            <div style={{ background: 'var(--bg-2)', borderRadius: 14, padding: 12 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
                {reference.performance.metrics.length}
              </div>
              <div
                style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 3, fontWeight: 500 }}
              >
                métriques
              </div>
            </div>
            <div
              style={{
                background: 'var(--coral-soft)',
                borderRadius: 14,
                padding: 12,
                gridColumn: 'span 2',
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 700, color: '#74281a', lineHeight: 1 }}>
                {(reference.axes.reduce((s, a) => s + a.confidence, 0) / Math.max(1, reference.axes.length)).toFixed(2)}
              </div>
              <div style={{ fontSize: 10.5, color: '#74281a', marginTop: 3, fontWeight: 500 }}>
                confiance moyenne · {humanAttribution(reference.performance.overallAttribution)}
              </div>
            </div>
          </div>
        </div>

        <div className="mc">
          <h4>Poursuivre la lecture</h4>
          <Link
            href={`/work/${reference.slug}/inspect`}
            className="pill"
            style={{ marginTop: 6, display: 'inline-flex' }}
          >
            ↗ Inspect — vue analytique
          </Link>
        </div>
      </aside>
    </div>
  );
}

function DossierEssay({ reference }: { reference: Reference }) {
  const assets = reference.assets;
  const counts = {
    hero: assets.filter((a) => a.role === 'HERO').length,
    primary: assets.filter((a) => a.role === 'PRIMARY').length,
    declination: assets.filter((a) => a.role === 'DECLINATION').length,
    companion: assets.filter((a) => a.role === 'COMPANION').length,
    extracted: assets.filter((a) => a.role === 'EXTRACTED').length,
  };
  const featured = assets.slice(0, 6);
  return (
    <div className="doss-essay">
      <div className="head">
        <h2>
          Le <span className="serif">bundle</span> · {assets.length} asset{assets.length > 1 ? 's' : ''}
        </h2>
        <div className="ct">
          <b>{counts.hero}</b> hero · <b>{counts.primary}</b> primaires · <b>{counts.declination}</b>{' '}
          déclinaisons · <b>{counts.companion}</b> compagnons · <b>{counts.extracted}</b> extraits
        </div>
      </div>
      <div className="grid">
        {featured.map((asset, i) => {
          const showImg = !!asset.url && (asset.kind === 'IMAGE' || !!asset.posterUrl);
          const imgSrc = asset.posterUrl ?? asset.url;
          const isText = asset.kind === 'TEXT' && !!asset.text;
          const isLongText = isText && asset.text!.length > 80;
          return (
            <Link
              key={asset.id}
              href={`/asset/${asset.id}`}
              className={`cl e${i + 1} ${phaseClassFor(asset.id)}`}
              style={{ cursor: 'pointer', textDecoration: 'none' }}
              aria-label={`Voir l'asset ${asset.role} · ${asset.function}`}
            >
              {showImg && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'inherit',
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    src={imgSrc}
                    alt={asset.alt ?? asset.caption ?? asset.function}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    style={{ objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.7) 100%)',
                    }}
                  />
                </div>
              )}
              <span
                className="tag"
                style={
                  showImg
                    ? { zIndex: 2, background: 'rgba(255,255,255,0.92)', color: 'var(--ink)' }
                    : { zIndex: 2, background: 'rgba(0,0,0,0.45)', color: '#fff' }
                }
              >
                {asset.role} · {asset.function.replace(/_/g, ' ')}
              </span>
              {isText && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '36px 18px 56px',
                    zIndex: 0,
                  }}
                >
                  <blockquote
                    style={{
                      fontFamily: 'var(--font-serif), Georgia, serif',
                      fontStyle: 'italic',
                      fontWeight: 400,
                      fontSize: isLongText ? 14 : 22,
                      lineHeight: isLongText ? 1.45 : 1.15,
                      color: '#fff',
                      textShadow: '0 1px 3px rgba(0,0,0,0.45)',
                      textAlign: 'center',
                      margin: 0,
                      letterSpacing: '-0.01em',
                      maxHeight: '100%',
                      overflow: 'hidden',
                    }}
                  >
                    « {shortify(asset.text!, isLongText ? 180 : 70)} »
                  </blockquote>
                </div>
              )}
              <div
                className="lbl"
                style={
                  showImg || isText
                    ? { position: 'relative', zIndex: 1, color: '#fff' }
                    : undefined
                }
              >
                <b>{shortify(asset.caption ?? asset.function, 64)}</b>
                {asset.format ? ` ${asset.format}` : ''}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function DossierFiliations({ reference }: { reference: Reference }) {
  const filiations = reference.filiations ?? [];
  if (filiations.length === 0) return null;
  const inspiredBy = filiations.filter((f) => f.type === 'inspired_by');
  const inspires = filiations.filter((f) => f.type === 'inspires');

  return (
    <section
      style={{
        marginTop: 48,
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: 22,
        padding: 28,
      }}
    >
      <header style={{ marginBottom: 22 }}>
        <p
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--ink-3)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin: 0,
            marginBottom: 8,
          }}
        >
          Filiations · {filiations.length} lien{filiations.length > 1 ? 's' : ''} éditorial
          {filiations.length > 1 ? 's' : ''}
        </p>
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: '-0.015em', fontWeight: 600 }}>
          Comment cette opération <span className="serif">se situe.</span>
        </h2>
        <p
          style={{
            marginTop: 10,
            fontSize: 13.5,
            color: 'var(--ink-2)',
            lineHeight: 1.55,
            maxWidth: 720,
          }}
        >
          Argos suit la généalogie des opérations : ce qui a inspiré cette campagne, ce qu'elle a
          rendu possible. Chaque lien est argumenté ; la nature du lien (homage direct,
          reproduction de pattern, inversion positionnelle…) est explicite.
        </p>
      </header>

      <div style={{ display: 'grid', gap: 24 }}>
        {inspiredBy.length > 0 && (
          <FiliationBlock
            label="Inspirée par"
            description="Opérations antérieures dont cette campagne hérite la grammaire, la posture, ou le geste."
            entries={inspiredBy}
          />
        )}
        {inspires.length > 0 && (
          <FiliationBlock
            label="A inspiré"
            description="Opérations postérieures qui prolongent, citent ou inversent cette campagne."
            entries={inspires}
          />
        )}
      </div>
    </section>
  );
}

function FiliationBlock({
  label,
  description,
  entries,
}: {
  label: string;
  description: string;
  entries: NonNullable<Reference['filiations']>;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>
          {label}
        </h3>
        <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{description}</span>
      </div>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'grid',
          gap: 12,
        }}
      >
        {entries.map((f) => (
          <li
            key={f.refId}
            style={{
              border: '1px solid var(--line-soft)',
              borderRadius: 14,
              padding: 16,
              background: 'var(--bg-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <Link
                href={`/work/${f.refSlug}`}
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  textDecoration: 'none',
                  borderBottom: '1px dotted var(--ink-3)',
                }}
              >
                {f.refTitle}
              </Link>
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.04em',
                }}
              >
                {f.refBrand}
                {f.refYear ? ` · ${f.refYear}` : ''}
              </span>
              <span
                className="pill"
                style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  background: filiationColor(f.relationshipType),
                  color: '#fff',
                  marginLeft: 'auto',
                }}
              >
                {humanFiliationType(f.relationshipType)}
              </span>
            </div>
            {f.evidence && (
              <p
                style={{
                  marginTop: 10,
                  fontSize: 13.5,
                  color: 'var(--ink-2)',
                  lineHeight: 1.55,
                  fontStyle: 'italic',
                  borderLeft: '2px solid var(--line)',
                  paddingLeft: 12,
                }}
              >
                {f.evidence}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function humanFiliationType(t: string): string {
  return (
    {
      DIRECT_HOMAGE: 'Hommage direct',
      PARODY: 'Parodie',
      PASTICHE: 'Pastiche',
      PATTERN_REPRODUCTION: 'Reproduction de pattern',
      POSITIONAL_INVERSION: 'Inversion positionnelle',
      CITATION_EXPLICIT: 'Citation explicite',
      CITATION_IMPLICIT: 'Citation implicite',
    } as Record<string, string>
  )[t] ?? t;
}

function filiationColor(t: string): string {
  return (
    {
      DIRECT_HOMAGE: '#74281a',
      PARODY: '#7a4818',
      PASTICHE: '#7a4818',
      PATTERN_REPRODUCTION: '#1d3e54',
      POSITIONAL_INVERSION: '#3e3a6e',
      CITATION_EXPLICIT: '#3a8e5c',
      CITATION_IMPLICIT: '#3a8e5c',
    } as Record<string, string>
  )[t] ?? '#555';
}

function DossierSources({ reference }: { reference: Reference }) {
  const sources = reference.researchSources ?? [];
  if (sources.length === 0) return null;
  return (
    <section
      style={{
        marginTop: 48,
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: 22,
        padding: 28,
      }}
    >
      <header style={{ marginBottom: 18 }}>
        <p
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--ink-3)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin: 0,
            marginBottom: 8,
          }}
        >
          Sources · {sources.length} référence{sources.length > 1 ? 's' : ''} vérifiée{sources.length > 1 ? 's' : ''}
        </p>
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: '-0.015em', fontWeight: 600 }}>
          D'où vient <span className="serif">cette analyse.</span>
        </h2>
        {reference.researcherToolUsed && (
          <p
            style={{
              marginTop: 8,
              fontSize: 13,
              color: 'var(--ink-2)',
              lineHeight: 1.5,
              fontStyle: 'italic',
            }}
          >
            Recherche menée avec : {reference.researcherToolUsed}
          </p>
        )}
      </header>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 14 }}>
        {sources.map((s, i) => (
          <li
            key={s.url}
            style={{
              borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
              paddingTop: i === 0 ? 0 : 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.04em',
                  minWidth: 22,
                }}
              >
                [{i + 1}]
              </span>
              <div style={{ flex: 1 }}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 15,
                    color: 'var(--ink)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    borderBottom: '1px dotted var(--ink-3)',
                  }}
                >
                  {s.title}
                </a>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: 'var(--ink-3)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {s.publisher && <span>{s.publisher}</span>}
                  {s.publishedDate && <span>· publié {s.publishedDate}</span>}
                  {s.accessedDate && <span>· consulté {s.accessedDate}</span>}
                  <span style={{ marginLeft: 'auto' }}>
                    <span
                      className="pill"
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        background: licenseColor(s.license),
                        color: '#fff',
                      }}
                    >
                      {humanLicense(s.license)}
                    </span>
                    <span style={{ marginLeft: 6 }}>· rôle {humanSourceRole(s.role)}</span>
                  </span>
                </div>
                {s.excerpt && (
                  <p
                    style={{
                      marginTop: 8,
                      fontSize: 13.5,
                      color: 'var(--ink-2)',
                      lineHeight: 1.55,
                      fontStyle: 'italic',
                      borderLeft: '2px solid var(--line)',
                      paddingLeft: 12,
                    }}
                  >
                    « {s.excerpt} »
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function humanLicense(l: string): string {
  return ({
    'free-to-use': 'Libre',
    'press-kit': 'Press-kit',
    'fair-use': 'Fair-use',
    'creator-permission': 'Avec permission',
    'paid-license': 'Sous licence',
    unknown: 'Licence inconnue',
  } as Record<string, string>)[l] ?? l;
}

function licenseColor(l: string): string {
  return ({
    'free-to-use': '#3a8e5c',
    'press-kit': '#5e4710',
    'fair-use': '#74281a',
    'creator-permission': '#1d3e54',
    'paid-license': '#3e3a6e',
    unknown: '#6b6b6b',
  } as Record<string, string>)[l] ?? '#6b6b6b';
}

function humanSourceRole(r: string): string {
  return ({
    primary: 'primaire',
    secondary: 'secondaire',
    context: 'contexte',
  } as Record<string, string>)[r] ?? r;
}

/* helpers */
function pickTail(title: string): string {
  const m = title.match(/[\s—-]+([^\s—-]+\.?)$/);
  return m?.[1] ?? title.split(/\s+/).pop() ?? title;
}

function humanAxisName(s: string): string {
  return s.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
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
    LOCAL_DOMINANCE_PROVEN: 'Domination locale prouvée',
    VIRAL_REACH: 'Reach viral',
    LONGEVITY_PROVEN: 'Longévité prouvée',
    CULT_STATUS_DOCUMENTED: 'Statut culte documenté',
    COMMERCIAL_IMPACT_PROVEN: 'Impact commercial prouvé',
    BRAND_WORLD_DOOR: 'Porte de marque-univers',
    COMPETITOR_IMITATED: 'Imité par la concurrence',
  };
  return fr[s] ?? s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanAttribution(s: string): string {
  return ({
    PROVEN_CAUSAL: 'causale prouvée',
    CORRELATED: 'corrélée',
    ESTIMATED: 'estimée',
    CLAIMED: 'revendiquée',
  } as Record<string, string>)[s] ?? s.toLowerCase().replace('_', ' ');
}

function pickMetric(reference: Reference, kind: PerformanceMetric['kind']) {
  return reference.performance.metrics.find((m) => m.kind === kind);
}

const METRIC_PRIORITY: PerformanceMetric['kind'][] = [
  'SALES_LIFT_PCT',
  'AWARDS_GOLD_COUNT',
  'IMITATION_COUNT',
  'CULT_INDEX_0_100',
  'CULTURAL_PENETRATION_0_100',
  'LONGEVITY_MONTHS',
  'REVENUE_USD',
  'UNITS_SOLD',
  'BRAND_PREFERENCE_PCT',
  'RECALL_UNAIDED_PCT',
  'REACH_PERSONS',
  'IMPRESSIONS',
  'ENGAGEMENT_RATE_PCT',
  'UGC_VOLUME',
  'CONVERSION_RATE_PCT',
  'BRAND_SEARCH_LIFT_PCT',
  'SHARE_OF_VOICE_PCT',
  'NPS_DELTA',
  'COMPLETION_RATE_PCT',
  'ROAS',
];

function pickSidebarMetrics(reference: Reference): PerformanceMetric[] {
  const byKind = new Map<string, PerformanceMetric>();
  for (const m of reference.performance.metrics) {
    if (!byKind.has(m.kind)) byKind.set(m.kind, m);
  }
  return METRIC_PRIORITY.flatMap((k) => {
    const m = byKind.get(k);
    return m ? [m] : [];
  });
}

const METRIC_LABELS: Record<PerformanceMetric['kind'], string> = {
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
  IMITATION_COUNT: 'Imitations tracées',
  LONGEVITY_MONTHS: 'Longévité',
  ENGAGEMENT_RATE_PCT: 'Engagement',
  UGC_VOLUME: 'Volume UGC',
  COMPLETION_RATE_PCT: 'Complétion',
};

function humanMetricLabel(kind: PerformanceMetric['kind']): string {
  return METRIC_LABELS[kind] ?? kind;
}

function formatMetricValue(m: PerformanceMetric): string {
  if (m.kind === 'LONGEVITY_MONTHS') {
    const years = Math.round(m.value / 12);
    return `${years} an${years > 1 ? 's' : ''}`;
  }
  if (m.kind.endsWith('_PCT')) return `${m.value} %`;
  if (m.kind === 'CULT_INDEX_0_100' || m.kind === 'CULTURAL_PENETRATION_0_100') return `${m.value}/100`;
  if (m.value >= 1_000_000) return `${(m.value / 1_000_000).toFixed(1)}M`;
  if (m.value >= 1_000) return `${(m.value / 1_000).toFixed(0)}k`;
  return String(m.value);
}

function shortify(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1).trimEnd()}…`;
}

function phaseClassFor(seed: string): string {
  let n = 0;
  for (const c of seed) n = (n + c.charCodeAt(0)) % 6;
  return `ph-${n + 1}`;
}

function pickHeroImage(reference: Reference, hero?: Asset): Asset | undefined {
  if (hero?.url && (hero.kind === 'IMAGE' || hero.posterUrl)) return hero;
  const role = (r: Asset['role']) =>
    reference.assets.find((a) => a.role === r && a.url && (a.kind === 'IMAGE' || a.posterUrl));
  return role('HERO') ?? role('PRIMARY') ?? role('EXTRACTED') ?? role('DECLINATION');
}
