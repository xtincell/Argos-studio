import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'À propos d\'Argos',
  description:
    "Argos est une bibliothèque éditoriale des opérations marketing qui ont fait école. Manifeste, méthode, et personnes derrière le projet.",
};

export default function AboutPage() {
  return (
    <section className="view">
      <div className="wrap" style={{ maxWidth: 760, paddingTop: 40, paddingBottom: 80 }}>
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
          À propos · manifeste éditorial
        </p>
        <h1
          style={{
            fontSize: 56,
            letterSpacing: '-0.025em',
            margin: 0,
            fontWeight: 600,
            lineHeight: 1.05,
            textWrap: 'balance',
          }}
        >
          Une bibliothèque, <span className="serif">pas un moteur de recherche.</span>
        </h1>
        <div
          style={{
            marginTop: 28,
            fontSize: 16.5,
            lineHeight: 1.65,
            color: 'var(--ink-2)',
            textWrap: 'pretty',
          }}
        >
          <p>
            Argos existe parce que le créatif au travail — le directeur artistique, le planneur,
            le copywriter, le fondateur-CMO — n'a aucun bon moyen d'interroger le corpus dont
            son métier dépend. WARC paywalls tout. Cannes Lions Archive ne montre que les
            gagnants. Adforum dump sans curation. Aucun ne creuse sérieusement les marchés qui
            comptent pour une génération de créatifs africains et francophones qui émerge
            aujourd'hui.
          </p>
          <h2 style={h2Style}>Densité plutôt qu'étendue</h2>
          <p>
            Une référence entre dans Argos avec ses vingt-deux axes structurels notés, son
            pattern kind classifié, son mode de manipulation nommé, ses piliers marqués, ses
            signaux de performance collectés, ses filiations cartographiées. Ou elle n'entre
            pas. Cinq mille références qualifiées valent mieux que cinquante mille à moitié
            classées.
          </p>
          <h2 style={h2Style}>Éditorial plutôt qu'algorithmique</h2>
          <p>
            La v1 est <b>entièrement manuelle</b>. Les chercheurs et l'équipe éditoriale
            rédigent un dossier JSON pour chaque référence, citant chaque source, scorant
            chaque axe avec une évidence. Aucun LLM ne fait d'extraction, aucune recherche
            sémantique, aucune auto-classification. La bibliothèque est construite par des
            mains qui connaissent le travail — et cette signature est le produit.
          </p>
          <h2 style={h2Style}>Afrique et francophonie d'abord</h2>
          <p>
            On sur-indexe les marchés que personne ne couvre correctement. Loeries, Pikine, le
            Cristal Festival, les équivalents régionaux de Cannes pour les créatifs africains.
            Les guerres telco en pidgin nigérian. Le pattern Dealer émotionnel ivoirien. Le
            code-switch publicitaire Maroc-Algérie. La scène OOH camerounaise où les
            billboards restent le medium dominant.
          </p>
          <p>
            On les connecte ensuite au canon global — parce qu'un pattern d'anti-claim
            Patagonia peut surgir dans une pub bancaire sénégalaise, et l'autorité pidgin d'un
            telco nigérian peut faire écho à une directness Wieden+Kennedy des années 90.
            Le croisement est la valeur éditoriale.
          </p>
          <h2 style={h2Style}>Accessibilité programmatique</h2>
          <p>
            Chaque référence visible dans l'UI publique est accessible via l'API REST v1.
            JSON typé, aucune dépendance LLM côté stockage. La face que vous regardez est une
            interface. La face qu'une plateforme aval consulte en est une autre. Même
            bibliothèque, surfaces différentes.
          </p>
          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '36px 0' }} />
          <h2 style={h2Style}>Méthode</h2>
          <p>
            Chaque opération est documentée à la main : <b>sources vérifiables</b>, images
            sous <b>licence libre</b> (Wikimedia Commons, press-kits, Unsplash) ou citation
            éditoriale en fair-use avec mention. Les <b>22 axes structurels</b> sont notés
            avec une confidence entre 0 et 1. Les <b>métriques</b> portent leur attribution
            (causale prouvée, corrélée, estimée, revendiquée) et leur source.
          </p>
          <p>
            Tout est documenté dans la{' '}
            <a href="/docs/research-dossier-spec" style={accent}>
              spec du dossier de recherche
            </a>
            . L'ingest se fait via{' '}
            <a href="/admin/ingest" style={accent}>
              /admin/ingest
            </a>{' '}
            (UI) ou{' '}
            <a href="/api/v1/ingest/dossier" style={accent}>
              <code>POST /api/v1/ingest/dossier</code>
            </a>{' '}
            (programmatique).
          </p>
        </div>
      </div>
    </section>
  );
}

const h2Style: React.CSSProperties = {
  marginTop: 38,
  marginBottom: 14,
  fontFamily: 'var(--font-display)',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 28,
  letterSpacing: '-0.01em',
  color: 'var(--ink)',
};

const accent = { color: 'var(--coral)', textDecoration: 'underline' } as const;
