import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Comment Argos traite vos données personnelles.',
};

export default function PrivacyPage() {
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
          Confidentialité · v1 · dernière mise à jour 2026-05-13
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
          Confidentialité <span className="serif">simple.</span>
        </h1>

        <p
          style={{
            fontSize: 16,
            color: 'var(--ink-2)',
            lineHeight: 1.65,
            marginBottom: 36,
            textWrap: 'pretty',
          }}
        >
          Argos est une bibliothèque en lecture libre. Le strict minimum est collecté, rien
          n'est revendu, aucun cookie publicitaire n'est posé.
        </p>

        <Section title="1. Ce qu'Argos collecte">
          <ul style={listStyle}>
            <li><b>Logs d'accès anonymes</b> côté serveur (pour mesurer l'audience et déboguer) : IP tronquée, page consultée, horodatage. Conservés 30 jours.</li>
            <li><b>Email</b> uniquement si vous vous inscrivez à la <a href="/sign-in" style={linkStyle}>newsletter</a>.</li>
            <li>Aucun compte utilisateur, aucun bookmark, aucun board, aucune préférence — la bibliothèque est en consultation libre.</li>
          </ul>
        </Section>

        <Section title="2. Ce qu'Argos ne collecte pas">
          <ul style={listStyle}>
            <li>Pas de cookies de tracking tiers (pas de Google Analytics, pas de Facebook Pixel, pas de Hotjar).</li>
            <li>Pas de fingerprinting.</li>
            <li>Pas de partage avec des régies publicitaires.</li>
          </ul>
        </Section>

        <Section title="3. Newsletter">
          Votre email est utilisé exclusivement pour l'envoi de la newsletter Argos. Il n'est
          ni revendu, ni partagé, ni croisé. La désinscription est disponible en bas de chaque
          envoi.
        </Section>

        <Section title="4. Vos droits (RGPD)">
          Vous avez le droit d'accéder, rectifier, supprimer vos données. Demande par email :
          argos@example.com (placeholder v1). Délai de réponse 30 jours.
        </Section>

        <Section title="5. Hébergement">
          Le site est hébergé en Europe (Vercel + base SQLite locale en v1, PostgreSQL européen
          en production).
        </Section>

        <Section title="6. Modifications">
          En cas de modification de cette politique, les inscrits à la newsletter sont prévenus
          dans le prochain envoi.
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
      <div
        style={{
          fontSize: 15,
          color: 'var(--ink-2)',
          lineHeight: 1.65,
          textWrap: 'pretty',
        }}
      >
        {children}
      </div>
    </section>
  );
}

const linkStyle = { color: 'var(--coral)', textDecoration: 'underline' } as const;
const listStyle = { paddingLeft: 22, margin: 0, display: 'grid', gap: 8 } as const;
