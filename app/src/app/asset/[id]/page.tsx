import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllReferences, getAssetById, getAssetsByFunction } from '@/lib/library';
import { ASSET_FUNCTION_LABELS } from '@/lib/taxonomy';
import type { Asset, AssetFunction, Reference } from '@/lib/types';

interface AssetPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const refs = await getAllReferences();
  return refs.flatMap((r) => r.assets.map((a) => ({ id: a.id })));
}

export async function generateMetadata({ params }: AssetPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getAssetById(id);
  if (!result) return { title: 'Asset introuvable' };
  const { asset, reference } = result;
  const fn = ASSET_FUNCTION_LABELS[asset.function as AssetFunction] ?? asset.function;
  const fullTitle = `${fn} — ${reference.title} (${reference.brandEmitter})`;
  const description =
    asset.caption ?? `${fn} de l'opération ${reference.title} par ${reference.brandEmitter}.`;
  // Asset detail re-uses the parent reference's OG image so the social card shows the dossier card.
  const ogImage = `/work/${reference.slug}/opengraph-image`;
  return {
    title: fullTitle,
    description,
    openGraph: {
      type: 'article',
      title: fullTitle,
      description,
      url: `/asset/${asset.id}`,
      siteName: 'Argos',
      images: [{ url: ogImage }],
      tags: [reference.brandEmitter, reference.sector, asset.function, asset.role, asset.kind],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `/asset/${asset.id}`,
    },
  };
}

export default async function AssetPage({ params }: AssetPageProps) {
  const { id } = await params;
  const result = await getAssetById(id);
  if (!result) notFound();
  const { asset, reference } = result;

  const fnLabel = ASSET_FUNCTION_LABELS[asset.function as AssetFunction] ?? asset.function;
  const showImg = !!asset.url && (asset.kind === 'IMAGE' || !!asset.posterUrl);
  const imgSrc = asset.posterUrl ?? asset.url;
  const isText = asset.kind === 'TEXT' && !!asset.text;
  const isLongText = isText && (asset.text?.length ?? 0) > 200;

  // Find scoped metrics (asset-level)
  const scopedMetrics = reference.performance.metrics.filter(
    (m) => m.scope === 'ASSET' && m.scopedAssetId === asset.id,
  );

  // Siblings dans la même opération (autres assets du bundle)
  const siblings = reference.assets.filter((a) => a.id !== asset.id);

  // Mêmes fonctions ailleurs (autres opérations avec un asset de même fonction)
  const sameFunctionAssets = (await getAssetsByFunction(asset.function as AssetFunction))
    .filter((a) => a.asset.id !== asset.id)
    .slice(0, 6);

  return (
    <section className="view" data-view="asset-detail">
      <div className="wrap" style={{ maxWidth: 1100, paddingTop: 28, paddingBottom: 80 }}>
        {/* Breadcrumbs */}
        <nav
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
            marginBottom: 14,
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
          }}
          aria-label="Fil d'Ariane"
        >
          <Link href="/works" style={{ color: 'inherit', textDecoration: 'none' }}>
            Opérations
          </Link>
          <span aria-hidden>›</span>
          <Link
            href={`/work/${reference.slug}`}
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            {reference.title}
          </Link>
          <span aria-hidden>›</span>
          <span style={{ color: 'var(--ink-2)' }}>{fnLabel}</span>
        </nav>

        {/* Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <span className="pill coral">
            <span className="sp" style={{ color: '#fff' }}>✦</span> {asset.role}
          </span>
          <span className="pill butter">{fnLabel}</span>
          <span className="pill">{asset.kind}</span>
          <span className="pill">{asset.aspectRatio}</span>
          {asset.durationSec && (
            <span className="pill">{asset.durationSec}s</span>
          )}
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 44,
            letterSpacing: '-0.025em',
            margin: 0,
            marginBottom: 8,
            fontWeight: 600,
            textWrap: 'balance',
          }}
        >
          {fnLabel} <span className="serif">— {reference.title}</span>
        </h1>
        <p style={{ margin: 0, marginBottom: 28, fontSize: 14, color: 'var(--ink-3)' }}>
          <Link href={`/work/${reference.slug}`} style={{ color: 'var(--ink-2)', textDecoration: 'underline' }}>
            {reference.brandEmitter}
          </Link>
          {reference.agencyCreator ? ` · ${reference.agencyCreator}` : ''} · {reference.emissionYear}
        </p>

        {/* Main display zone */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: 32,
            alignItems: 'start',
          }}
        >
          {/* Left : the asset itself */}
          <div>
            {showImg && imgSrc && (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: aspectRatioToCSS(asset.aspectRatio),
                  borderRadius: 18,
                  overflow: 'hidden',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--line)',
                }}
              >
                <Image
                  src={imgSrc}
                  alt={asset.alt ?? asset.caption ?? fnLabel}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 70vw"
                  style={{ objectFit: 'contain', background: 'var(--bg-2)' }}
                />
              </div>
            )}

            {isText && (
              <blockquote
                style={{
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                  borderRadius: 18,
                  padding: '48px 32px',
                  margin: 0,
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: isLongText ? 22 : 36,
                  lineHeight: isLongText ? 1.5 : 1.2,
                  color: 'var(--ink)',
                  letterSpacing: '-0.01em',
                  textAlign: 'center',
                  textWrap: 'balance',
                }}
              >
                « {asset.text} »
              </blockquote>
            )}

            {!showImg && !isText && (
              <div
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 18,
                  padding: 48,
                  textAlign: 'center',
                  color: 'var(--ink-3)',
                  fontSize: 14,
                }}
              >
                Asset sans média associé.
              </div>
            )}

            {asset.caption && (
              <p
                style={{
                  marginTop: 18,
                  fontSize: 14.5,
                  lineHeight: 1.6,
                  color: 'var(--ink-2)',
                  textWrap: 'pretty',
                  fontStyle: 'italic',
                  borderLeft: '2px solid var(--line)',
                  paddingLeft: 14,
                }}
              >
                {asset.caption}
              </p>
            )}
          </div>

          {/* Right : metadata */}
          <aside
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: 18,
              padding: 20,
              fontSize: 13,
              display: 'grid',
              gap: 16,
            }}
          >
            <MetaSection title="Fonction marketing">
              <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{fnLabel}</div>
              <Link
                href={`/by/asset-function/${asset.function.toLowerCase().replace(/_/g, '-')}`}
                style={{
                  fontSize: 11,
                  color: 'var(--coral)',
                  textDecoration: 'underline',
                  marginTop: 4,
                  display: 'inline-block',
                }}
              >
                Voir tous les assets {fnLabel.toLowerCase()} →
              </Link>
            </MetaSection>

            <MetaSection title="Rôle dans le bundle">
              <div style={{ fontSize: 14, color: 'var(--ink)' }}>
                {humanRole(asset.role)}
              </div>
            </MetaSection>

            <MetaSection title="Type média">
              <div style={{ fontSize: 14, color: 'var(--ink)' }}>{humanKind(asset.kind)}</div>
            </MetaSection>

            {asset.format && (
              <MetaSection title="Format">
                <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>
                  {asset.format}
                </div>
              </MetaSection>
            )}

            {asset.durationSec && (
              <MetaSection title="Durée">
                <div style={{ fontSize: 14, color: 'var(--ink)' }}>{asset.durationSec}s</div>
              </MetaSection>
            )}

            <MetaSection title="Ratio">
              <div style={{ fontSize: 14, color: 'var(--ink)' }}>{asset.aspectRatio}</div>
            </MetaSection>

            {asset.alt && (
              <MetaSection title="Alt (a11y)">
                <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.45 }}>
                  {asset.alt}
                </div>
              </MetaSection>
            )}

            {asset.extractionMethod && (
              <MetaSection title="Méthode d'extraction">
                <code style={inlineCode}>{asset.extractionMethod}</code>
              </MetaSection>
            )}

            {scopedMetrics.length > 0 && (
              <MetaSection title="Métriques de cet asset">
                <div style={{ display: 'grid', gap: 4 }}>
                  {scopedMetrics.map((m, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                      <b>{m.displayValue ?? `${m.value}`}</b> · {m.kind}
                    </div>
                  ))}
                </div>
              </MetaSection>
            )}

            <MetaSection title="Opération parente">
              <Link
                href={`/work/${reference.slug}`}
                style={{
                  fontSize: 14,
                  color: 'var(--ink)',
                  textDecoration: 'underline',
                  fontWeight: 500,
                }}
              >
                {reference.title}
              </Link>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
                {reference.brandEmitter} · {reference.emissionYear}
              </div>
            </MetaSection>
          </aside>
        </div>

        {/* Siblings dans la même opération */}
        {siblings.length > 0 && (
          <section
            style={{
              marginTop: 56,
              paddingTop: 32,
              borderTop: '1px solid var(--line)',
            }}
          >
            <h2 style={{ margin: 0, marginBottom: 14, fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>
              Les autres <span className="serif">assets de cette opération.</span>
            </h2>
            <p style={{ margin: 0, marginBottom: 16, fontSize: 13, color: 'var(--ink-3)' }}>
              Bundle complet : {reference.assets.length} asset{reference.assets.length > 1 ? 's' : ''}.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              {siblings.map((a) => (
                <SiblingCard key={a.id} asset={a} />
              ))}
            </div>
          </section>
        )}

        {/* Mêmes fonctions ailleurs */}
        {sameFunctionAssets.length > 0 && (
          <section
            style={{
              marginTop: 56,
              paddingTop: 32,
              borderTop: '1px solid var(--line)',
            }}
          >
            <h2 style={{ margin: 0, marginBottom: 14, fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>
              Autres <span className="serif">{fnLabel.toLowerCase()}</span> dans la bibliothèque.
            </h2>
            <p style={{ margin: 0, marginBottom: 16, fontSize: 13, color: 'var(--ink-3)' }}>
              {sameFunctionAssets.length} asset{sameFunctionAssets.length > 1 ? 's' : ''} de même fonction marketing —{' '}
              <Link
                href={`/by/asset-function/${asset.function.toLowerCase().replace(/_/g, '-')}`}
                style={{ color: 'var(--coral)', textDecoration: 'underline' }}
              >
                voir toutes les opérations →
              </Link>
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 14,
              }}
            >
              {sameFunctionAssets.map((item) => (
                <CrossCard key={item.asset.id} asset={item.asset} parentRef={item.reference} />
              ))}
            </div>
          </section>
        )}

        {/* Footer nav */}
        <div
          style={{
            marginTop: 56,
            paddingTop: 24,
            borderTop: '1px solid var(--line)',
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <Link href={`/work/${reference.slug}`} className="pill" style={{ textDecoration: 'none' }}>
            ← Retour à l'opération
          </Link>
          <Link href={`/work/${reference.slug}/inspect`} className="pill" style={{ textDecoration: 'none' }}>
            Vue analytique →
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiblingCard({ asset }: { asset: Asset }) {
  const fnLabel = ASSET_FUNCTION_LABELS[asset.function as AssetFunction] ?? asset.function;
  const hasImg = !!asset.url && (asset.kind === 'IMAGE' || !!asset.posterUrl);
  const imgSrc = asset.posterUrl ?? asset.url;
  return (
    <Link
      href={`/asset/${asset.id}`}
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--line-soft)',
        borderRadius: 12,
        padding: 12,
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 120,
      }}
    >
      {hasImg && imgSrc ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4 / 3',
            borderRadius: 8,
            overflow: 'hidden',
            background: 'var(--bg-2)',
          }}
        >
          <Image src={imgSrc} alt={asset.alt ?? fnLabel} fill sizes="220px" style={{ objectFit: 'cover' }} />
        </div>
      ) : (
        <div
          style={{
            fontFamily: 'var(--font-serif), serif',
            fontStyle: 'italic',
            fontSize: 13,
            color: 'var(--ink-2)',
            padding: 12,
            textAlign: 'center',
            background: 'var(--bg-2)',
            borderRadius: 8,
            minHeight: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {asset.text ? `« ${asset.text.slice(0, 60)}${asset.text.length > 60 ? '…' : ''} »` : fnLabel}
        </div>
      )}
      <div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
          {asset.role}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginTop: 2 }}>
          {fnLabel}
        </div>
      </div>
    </Link>
  );
}

function CrossCard({
  asset,
  parentRef,
}: {
  asset: Asset;
  parentRef: Pick<Reference, 'slug' | 'title' | 'brandEmitter' | 'emissionYear'>;
}) {
  const hasImg = !!asset.url && (asset.kind === 'IMAGE' || !!asset.posterUrl);
  const imgSrc = asset.posterUrl ?? asset.url;
  return (
    <Link
      href={`/asset/${asset.id}`}
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--line-soft)',
        borderRadius: 12,
        padding: 12,
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {hasImg && imgSrc ? (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-2)' }}>
          <Image src={imgSrc} alt={asset.alt ?? ''} fill sizes="220px" style={{ objectFit: 'cover' }} />
        </div>
      ) : (
        <div
          style={{
            fontFamily: 'var(--font-serif), serif',
            fontStyle: 'italic',
            fontSize: 13,
            color: 'var(--ink-2)',
            padding: 12,
            background: 'var(--bg-2)',
            borderRadius: 8,
            minHeight: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          {asset.text ? `« ${asset.text.slice(0, 50)}${asset.text.length > 50 ? '…' : ''} »` : asset.function}
        </div>
      )}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{parentRef.title}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
          {parentRef.brandEmitter} · {parentRef.emissionYear}
        </div>
      </div>
    </Link>
  );
}

function MetaSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        className="mono"
        style={{
          fontSize: 10.5,
          color: 'var(--ink-3)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          margin: 0,
          marginBottom: 6,
          fontWeight: 500,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function aspectRatioToCSS(ar: Asset['aspectRatio']): string {
  return ar.replace(':', ' / ');
}

function humanRole(r: Asset['role']): string {
  return ({
    HERO: 'Hero — pièce centrale',
    PRIMARY: 'Primaire',
    DECLINATION: 'Déclinaison',
    COMPANION: 'Compagnon',
    EXTRACTED: 'Extrait',
  } as Record<Asset['role'], string>)[r];
}

function humanKind(k: Asset['kind']): string {
  return ({
    IMAGE: 'Image',
    VIDEO: 'Vidéo',
    AUDIO: 'Audio',
    TEXT: 'Texte',
    EMBED_YOUTUBE: 'Vidéo YouTube',
    EMBED_VIMEO: 'Vidéo Vimeo',
  } as Record<Asset['kind'], string>)[k];
}

const inlineCode = {
  fontFamily: 'var(--font-mono), monospace',
  fontSize: 11,
  background: 'var(--bg-2)',
  padding: '2px 6px',
  borderRadius: 4,
  color: 'var(--ink)',
} as const;
