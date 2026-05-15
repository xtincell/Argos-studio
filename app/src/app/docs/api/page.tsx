import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API REST v1 — documentation',
  description:
    "Documentation de l'API REST publique d'Argos : endpoints, paramètres, exemples curl, schemas de réponse. Lecture libre, ingest manuel.",
};

interface Endpoint {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  example?: string;
  responseShape?: string;
}

const ENDPOINTS: Array<{ section: string; intro: string; routes: Endpoint[] }> = [
  {
    section: 'Index',
    intro: "Point d'entrée auto-descriptif.",
    routes: [
      {
        method: 'GET',
        path: '/api/v1',
        description: "Index des endpoints disponibles + version du schema.",
        example: 'curl https://argos.studio/api/v1',
        responseShape: `{ "version": "v1", "endpoints": [...] }`,
      },
    ],
  },
  {
    section: 'Références (opérations)',
    intro: 'Lecture des dossiers indexés.',
    routes: [
      {
        method: 'GET',
        path: '/api/v1/references',
        description: 'Liste paginée des références avec filtres facettés.',
        example:
          'curl "https://argos.studio/api/v1/references?limit=20&sector=Sportswear&yearFrom=2010"',
        responseShape: `{ "data": [{ "slug": "...", "title": "...", "brandEmitter": "...", ... }], "meta": { "total": 8 } }`,
      },
      {
        method: 'GET',
        path: '/api/v1/references/[slug]',
        description: "Détail complet d'une référence : assets, axes, métriques, sources.",
        example: 'curl https://argos.studio/api/v1/references/nike-just-do-it-1988',
        responseShape: `{ "data": { "slug": "nike-just-do-it-1988", "assets": [...], "axes": [...], "performance": {...}, "researchSources": [...] } }`,
      },
    ],
  },
  {
    section: 'Index entités',
    intro: 'Énumération des dimensions taxonomiques.',
    routes: [
      {
        method: 'GET',
        path: '/api/v1/brands',
        description: 'Liste des marques avec count de références.',
      },
      {
        method: 'GET',
        path: '/api/v1/brands/[slug]',
        description: 'Références associées à une marque.',
      },
      {
        method: 'GET',
        path: '/api/v1/sectors',
        description: 'Liste des secteurs.',
      },
      {
        method: 'GET',
        path: '/api/v1/sectors/[slug]',
        description: "Références d'un secteur.",
      },
      {
        method: 'GET',
        path: '/api/v1/agencies',
        description: 'Liste des agences créatrices.',
      },
      {
        method: 'GET',
        path: '/api/v1/agencies/[slug]',
        description: "Œuvre d'une agence.",
      },
      {
        method: 'GET',
        path: '/api/v1/markets',
        description: 'Liste des marchés couverts.',
      },
      {
        method: 'GET',
        path: '/api/v1/markets/[slug]',
        description: "Références actives sur un marché.",
      },
      {
        method: 'GET',
        path: '/api/v1/years',
        description: "Liste des années d'émission représentées.",
      },
      {
        method: 'GET',
        path: '/api/v1/years/[year]',
        description: "Références émises cette année.",
      },
      {
        method: 'GET',
        path: '/api/v1/awards',
        description: 'Liste des types de victoire (VictoryType).',
      },
      {
        method: 'GET',
        path: '/api/v1/awards/[slug]',
        description: 'Références reconnues par ce type de victoire.',
      },
    ],
  },
  {
    section: 'Assets',
    intro: 'Pour les intégrateurs qui consomment au niveau asset.',
    routes: [
      {
        method: 'GET',
        path: '/api/v1/assets',
        description: 'Liste de tous les assets de la bibliothèque (avec leur référence parente).',
        example: 'curl https://argos.studio/api/v1/assets',
      },
      {
        method: 'GET',
        path: '/api/v1/asset-functions',
        description: "Liste des 47 fonctions d'asset avec count.",
      },
    ],
  },
  {
    section: 'Ingest',
    intro: 'Écriture programmatique de nouveaux dossiers.',
    routes: [
      {
        method: 'POST',
        path: '/api/v1/ingest/dossier',
        description:
          "Soumettre un dossier JSON conforme à research-dossier-v1. Idempotent par slug.",
        example: `curl -X POST https://argos.studio/api/v1/ingest/dossier \\
  -H "Content-Type: application/json" \\
  -d @dossier.json`,
        responseShape: `// Succès (201 si nouveau, 200 si mise à jour)
{ "ok": true, "slug": "...", "assetCount": 5, "newlyCreated": true, "audit": {...} }

// JSON invalide (400)
{ "ok": false, "error": "INVALID_JSON", "message": "..." }

// Schema invalide (422)
{ "ok": false, "error": "INVALID_DOSSIER", "issues": [{ "path": "...", "message": "..." }] }`,
      },
    ],
  },
];

export default function ApiDocsPage() {
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
            Documentation API · v1
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
            L'API <span className="serif">REST.</span>
          </h1>
          <p style={{ marginTop: 14, maxWidth: 760, fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            Toutes les données visibles sur Argos sont accessibles via une API REST publique en
            JSON typé. Lecture libre sans clé. Ingestion via{' '}
            <Link href="/docs/research-dossier-spec" style={accent}>
              dossier JSON
            </Link>{' '}
            (manuel ou programmatique).
          </p>

          <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
            <span className="pill"><span className="sp">✦</span> Format : JSON</span>
            <span className="pill"><span className="sp">✦</span> Lecture libre</span>
            <span className="pill"><span className="sp">✦</span> Pas de clé requise (v1)</span>
            <a href="/api/v1" className="pill" style={{ textDecoration: 'none' }}>
              → Index brut /api/v1
            </a>
          </div>
        </header>

        {ENDPOINTS.map((section) => (
          <SectionBlock key={section.section} title={section.section} intro={section.intro}>
            {section.routes.map((r) => (
              <EndpointRow key={r.path + r.method} endpoint={r} />
            ))}
          </SectionBlock>
        ))}

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
          <h3 style={{ margin: 0, marginBottom: 10, fontSize: 17, fontWeight: 600 }}>Notes v1</h3>
          <ul style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 4 }}>
            <li>Pas d'authentification — la lecture est ouverte.</li>
            <li>Pas de rate-limit appliqué — sera ajouté quand le trafic le demandera.</li>
            <li>Le format JSON est typé strictement (voir <code style={inlineCode}>app/src/lib/types.ts</code>).</li>
            <li>L'ingest valide via Zod (voir <Link href="/docs/research-dossier-spec" style={{ color: '#4a1810', textDecoration: 'underline' }}>la spec</Link>).</li>
            <li>L'opération d'ingest est idempotente par slug : re-soumettre = mettre à jour.</li>
          </ul>
        </section>
      </div>
    </section>
  );
}

function SectionBlock({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        marginBottom: 36,
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: 18,
        padding: 24,
      }}
    >
      <header style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em' }}>
          {title}
        </h2>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-3)' }}>{intro}</p>
      </header>
      <div style={{ display: 'grid', gap: 16 }}>{children}</div>
    </section>
  );
}

function EndpointRow({ endpoint }: { endpoint: Endpoint }) {
  return (
    <div
      style={{
        padding: 14,
        border: '1px solid var(--line-soft)',
        borderRadius: 12,
        background: 'var(--bg-2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span
          className="mono"
          style={{
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 4,
            background: endpoint.method === 'POST' ? 'var(--coral)' : 'var(--dark)',
            color: '#fff',
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          {endpoint.method}
        </span>
        <code
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 13,
            color: 'var(--ink)',
            fontWeight: 500,
          }}
        >
          {endpoint.path}
        </code>
      </div>
      <p style={{ margin: 0, marginTop: 8, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
        {endpoint.description}
      </p>
      {endpoint.example && (
        <div style={{ marginTop: 12 }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--ink-3)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Exemple
          </div>
          <pre
            style={{
              margin: 0,
              padding: 12,
              background: 'var(--paper)',
              border: '1px solid var(--line-soft)',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'var(--font-mono), monospace',
              color: 'var(--ink)',
              overflow: 'auto',
            }}
          >
            <code>{endpoint.example}</code>
          </pre>
        </div>
      )}
      {endpoint.responseShape && (
        <div style={{ marginTop: 10 }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--ink-3)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Réponse
          </div>
          <pre
            style={{
              margin: 0,
              padding: 12,
              background: 'var(--paper)',
              border: '1px solid var(--line-soft)',
              borderRadius: 8,
              fontSize: 11.5,
              fontFamily: 'var(--font-mono), monospace',
              color: 'var(--ink-2)',
              overflow: 'auto',
              lineHeight: 1.5,
            }}
          >
            <code>{endpoint.responseShape}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

const accent = { color: 'var(--coral)', textDecoration: 'underline' } as const;
const inlineCode = {
  fontFamily: 'var(--font-mono), monospace',
  fontSize: 11,
  background: 'var(--bg-2)',
  padding: '2px 6px',
  borderRadius: 4,
  color: 'var(--ink)',
} as const;
