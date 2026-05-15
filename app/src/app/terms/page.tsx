import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions',
  description: 'Conditions d\'utilisation du site Argos.',
};

export default function TermsPage() {
  return (
    <section className="view">
      <div
        className="wrap"
        style={{
          maxWidth: 720,
          paddingTop: 60,
          paddingBottom: 80,
        }}
      >
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
          Mentions légales · v1 · dernière mise à jour 2026-05-13
        </p>
        <h1
          style={{
            fontSize: 44,
            letterSpacing: '-0.025em',
            margin: 0,
            marginBottom: 28,
            fontWeight: 600,
          }}
        >
          Conditions <span className="serif">d'utilisation.</span>
        </h1>

        <Section title="1. Objet">
          Argos est une bibliothèque éditoriale en lecture libre, qui documente des opérations
          marketing à des fins d'analyse et de référence. Le site n'est ni un service marchand
          ni un outil de manipulation de données utilisateur.
        </Section>

        <Section title="2. Accès">
          L'accès à la bibliothèque est gratuit et ne requiert pas d'inscription. Seule l'inscription
          à la <a href="/sign-in" style={linkStyle}>newsletter</a> est proposée — facultative,
          désinscription en un clic, pas de tracking publicitaire.
        </Section>

        <Section title="3. Sources et licences">
          Chaque dossier est documenté à la main par l'équipe éditoriale. Les images sont
          systématiquement issues de sources libres de droits (Wikimedia Commons, press-kits
          de marque, Unsplash) ou citées en fair-use éditorial avec mention explicite.
          La licence de chaque source est visible sur la fiche de la référence.
        </Section>

        <Section title="4. Propriété intellectuelle">
          Les analyses éditoriales (résumés, observations de pattern, scores d'axes, métriques
          sourcées) sont la propriété d'Argos. Les opérations marketing référencées appartiennent
          à leurs marques émettrices et agences créatrices respectives, mentionnées sur chaque
          fiche.
        </Section>

        <Section title="5. Données personnelles">
          Voir la <a href="/privacy" style={linkStyle}>politique de confidentialité</a>.
        </Section>

        <Section title="6. API">
          L'API REST <a href="/api/v1" style={linkStyle}>/api/v1</a> est ouverte en lecture
          pour usage non commercial. Toute utilisation commerciale requiert une autorisation
          écrite préalable.
        </Section>

        <Section title="7. Contact">
          Pour toute question : argos@example.com (placeholder v1).
        </Section>
      </div>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontSize: 20,
          margin: 0,
          marginBottom: 10,
          fontWeight: 600,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: 15,
          color: 'var(--ink-2)',
          lineHeight: 1.65,
          textWrap: 'pretty',
        }}
      >
        {children}
      </p>
    </section>
  );
}

const linkStyle = { color: 'var(--coral)', textDecoration: 'underline' } as const;
