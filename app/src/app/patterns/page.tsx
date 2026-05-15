import type { Metadata } from 'next';
import Link from 'next/link';
import {
  listManipulationModes,
  listPatternKinds,
  listStructuralAxes,
  listAwards,
} from '@/lib/library';
import {
  PATTERN_KIND_LABELS,
  STRUCTURAL_AXIS_LABELS,
  VICTORY_LABELS,
} from '@/lib/taxonomy';
import type { ManipulationMode } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Patterns — taxonomie Argos',
  description:
    "Visualisation de la taxonomie Argos : pattern kinds, postures de manipulation, axes structurels, types de victoire. Compte de références par valeur.",
};

const MODE_LABEL_FR: Record<ManipulationMode, string> = {
  PEDDLER: 'Vendeur (Peddler)',
  DEALER: 'Marchand (Dealer)',
  FACILITATOR: 'Facilitateur',
  ENTERTAINER: 'Animateur (Entertainer)',
};

const MODE_DESC_FR: Record<ManipulationMode, string> = {
  PEDDLER: 'Pousse, insiste, répète. La marque parle, beaucoup, fort.',
  DEALER:
    "Place une dépendance émotionnelle ou pratique. La marque cherche à ce qu'on revienne sans y penser.",
  FACILITATOR:
    "S'efface. Met en scène le client, sa décision, son contexte. La marque arrive après — comme une signature.",
  ENTERTAINER:
    "Détourne, joue, divertit. La marque devient un personnage culturel.",
};

export default async function PatternsView() {
  const [patternKinds, manipulationModes, axes, awards] = await Promise.all([
    listPatternKinds(),
    listManipulationModes(),
    listStructuralAxes(),
    listAwards(),
  ]);

  // Sort each facet by descending count, then alpha
  const sortByCountDesc = <T extends { count: number }>(arr: T[]) =>
    [...arr].sort((a, b) => b.count - a.count);

  return (
    <section className="view" data-view="patterns">
      <div className="wrap" style={{ paddingTop: 24 }}>
        <header style={{ marginBottom: 28 }}>
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
            Taxonomie Argos · 22 axes structurels · 14 pattern kinds · 4 manipulation modes
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
            Comment Argos <span className="serif">classe</span> les opérations.
          </h1>
          <p
            style={{
              marginTop: 12,
              maxWidth: 760,
              fontSize: 15,
              color: 'var(--ink-2)',
              lineHeight: 1.55,
            }}
          >
            Chaque dossier est qualifié sur quatre dimensions : <b>posture</b> (4 modes), <b>kind</b> (14 patterns),
            <b> axes structurels</b> (22 axes scorables) et <b>victoires</b> (preuves de réussite). Cliquez sur une
            valeur pour voir toutes les opérations qui en relèvent.
          </p>
        </header>

        <FacetGroup
          title="Postures"
          subtitle="Le rapport que la marque entretient avec son audience."
          facets={sortByCountDesc(manipulationModes).map((f) => ({
            slug: f.slug,
            count: f.count,
            label: MODE_LABEL_FR[f.value],
            description: MODE_DESC_FR[f.value],
            href: `/by/manipulation-mode/${f.slug}`,
          }))}
        />

        <FacetGroup
          title="Pattern kinds"
          subtitle="La forme matérielle dominante de l'opération."
          facets={sortByCountDesc(patternKinds).map((f) => ({
            slug: f.slug,
            count: f.count,
            label: PATTERN_KIND_LABELS[f.value] ?? f.value,
            href: `/by/pattern-kind/${f.slug}`,
          }))}
        />

        <FacetGroup
          title="Axes structurels"
          subtitle="Les 22 dimensions sur lesquelles chaque dossier est noté."
          facets={sortByCountDesc(axes).map((f) => ({
            slug: f.slug,
            count: f.count,
            label: STRUCTURAL_AXIS_LABELS[f.value] ?? f.value,
            href: `/by/axis/${f.slug}`,
          }))}
        />

        <FacetGroup
          title="Victoires documentées"
          subtitle="Les preuves de réussite attachées aux dossiers."
          facets={sortByCountDesc(awards).map((f) => ({
            slug: f.slug,
            count: f.count,
            label: VICTORY_LABELS[f.value] ?? f.value,
            href: `/award/${f.slug}`,
          }))}
        />
      </div>
    </section>
  );
}

interface FacetCell {
  slug: string;
  count: number;
  label: string;
  description?: string;
  href: string;
}

function FacetGroup({
  title,
  subtitle,
  facets,
}: {
  title: string;
  subtitle: string;
  facets: FacetCell[];
}) {
  if (facets.length === 0) return null;
  return (
    <section
      style={{
        marginBottom: 40,
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: 22,
        padding: 24,
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22, letterSpacing: '-0.015em', fontWeight: 600 }}>
          {title}
        </h2>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-3)' }}>{subtitle}</p>
      </header>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 12,
        }}
      >
        {facets.map((f) => (
          <Link
            key={f.slug}
            href={f.href}
            className="pill"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: 14,
              textDecoration: 'none',
              minHeight: 80,
              background: 'var(--bg-2)',
              border: '1px solid var(--line-soft)',
              borderRadius: 14,
            }}
          >
            <div
              style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 12 }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                {f.label}
              </span>
              <span
                className="mono"
                style={{
                  fontSize: 12,
                  color: f.count > 0 ? 'var(--coral)' : 'var(--ink-3)',
                  fontWeight: 600,
                }}
              >
                {f.count}
              </span>
            </div>
            {f.description && (
              <p
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: 'var(--ink-2)',
                  lineHeight: 1.4,
                  fontStyle: 'italic',
                }}
              >
                {f.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
