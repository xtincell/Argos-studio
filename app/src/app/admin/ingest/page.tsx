import type { Metadata } from 'next';
import Link from 'next/link';
import { DossierIngestForm } from '@/components/dossier-ingest-form';

export const metadata: Metadata = {
  title: 'Ingestion manuelle',
  description: "Soumettre un dossier de recherche JSON à Argos pour ingestion.",
  robots: { index: false, follow: false },
};

export default async function IngestPage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const { slug } = await searchParams;
  return (
    <section className="view">
      <div className="wrap" style={{ paddingTop: 24 }}>
        <header style={{ marginBottom: 24 }}>
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
            Admin · Ingestion manuelle
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
            Ingérer un dossier de <span className="serif">recherche.</span>
          </h1>
          <p
            style={{
              marginTop: 12,
              maxWidth: 760,
              fontSize: 15,
              color: 'var(--ink-2)',
              lineHeight: 1.55,
              textWrap: 'pretty',
            }}
          >
            Apportez un dossier JSON structuré issu de votre toolkit de recherche : Argos le valide,
            le transforme, le stocke. Le dossier porte ses propres citations de sources, sa licence
            et son audit trail. L'opération est <b>idempotente</b> par slug — re-soumettre le même
            dossier met à jour, ne duplique pas.
          </p>
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              fontSize: 12,
            }}
          >
            <Link href="/docs/research-dossier-spec" className="pill" style={{ textDecoration: 'none' }}>
              → Spec du dossier
            </Link>
            <a href="/dossier-template.json" download className="pill" style={{ textDecoration: 'none' }}>
              ↓ template.json
            </a>
            <a href="/dossier-example.json" download className="pill" style={{ textDecoration: 'none' }}>
              ↓ example.json (SGCI 2023)
            </a>
          </div>
        </header>

        <DossierIngestForm initialSlug={slug} />

        <section
          style={{
            marginTop: 48,
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 22,
            padding: 24,
          }}
        >
          <h2
            style={{
              fontSize: 22,
              margin: 0,
              letterSpacing: '-0.015em',
              fontWeight: 600,
            }}
          >
            Cette voie dans l'<span className="serif">architecture d'ingestion</span>.
          </h2>
          <p
            style={{
              marginTop: 8,
              fontSize: 13,
              color: 'var(--ink-2)',
              lineHeight: 1.55,
            }}
          >
            La v1 d'Argos n'a qu'<b>une seule voie d'ingestion : les dossiers JSON manuels</b>.
            L'architecture crawler (Layer 1 crawlers de sources + Layer 2 brand watch agents) est
            documentée pour v2+ mais ne tourne pas en v1. Pas de LLM, pas d'auto-extraction, pas
            de pipeline async.
          </p>
          <div
            style={{
              marginTop: 18,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <Pillar
              number="M"
              title="Ingestion manuelle (v1)"
              description="La seule voie d'écriture aujourd'hui. Chercheur + toolkit + cette page."
              highlight
            />
            <Pillar
              number="L1"
              title="Crawlers de sources (v2+)"
              description="Cannes Lions, Loeries, AdAge, bulk social brand. Moisson passive, large. Différé."
            />
            <Pillar
              number="L2"
              title="Brand watch agents (v2+)"
              description="Un agent par marque, interroge tous les périmètres, assemble les dossiers. Différé."
            />
          </div>
        </section>
      </div>
    </section>
  );
}

function Pillar({
  number,
  title,
  description,
  highlight,
}: {
  number: string;
  title: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        background: highlight ? 'var(--coral-soft)' : 'var(--bg-2)',
        border: highlight ? '1px solid transparent' : '1px solid var(--line-soft)',
        borderRadius: 16,
        padding: 14,
      }}
    >
      <p
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: highlight ? '#74281a' : 'var(--ink-3)',
          margin: 0,
        }}
      >
        Layer {number}
      </p>
      <h3
        style={{
          marginTop: 4,
          fontSize: 14.5,
          fontWeight: 600,
          color: highlight ? '#4a1810' : 'var(--ink)',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          marginTop: 4,
          fontSize: 12,
          color: highlight ? '#74281a' : 'var(--ink-2)',
          lineHeight: 1.45,
        }}
      >
        {description}
      </p>
    </div>
  );
}
