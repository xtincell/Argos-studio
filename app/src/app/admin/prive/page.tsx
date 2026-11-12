import type { Metadata } from 'next';
import Link from 'next/link';
import { FreshTime } from '@/components/fresh-time';
import { ADMIN_CHANNEL_LABELS, PRIVATE_RETENTION_MONTHS } from '@/lib/visibility';
import { requireAdminPage } from '@/server/admin-page';
import { listPrivateDossiers, recentPurgeRuns } from '@/server/private-retention';

// The private space (ADR-0010) is rendered per request, for an open session only.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Espace privé',
  description: 'Dossiers privés de la bibliothèque, leur rétention et leur purge.',
  robots: { index: false, follow: false },
};

interface PrivateSpacePageProps {
  searchParams: Promise<{ purge?: string }>;
}

const label = { fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 } as const;
const panel = { marginTop: 28, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 22, padding: 20 } as const;

export default async function PrivateSpacePage({ searchParams }: PrivateSpacePageProps) {
  await requireAdminPage('/admin/prive');
  const { purge } = await searchParams;
  const now = new Date();
  const [dossiers, runs] = await Promise.all([listPrivateDossiers(now), recentPurgeRuns()]);
  const due = dossiers.filter((dossier) => dossier.due);
  const purged = purge !== undefined && /^\d+$/.test(purge) ? Number(purge) : null;
  return (
    <section className="view private-space">
      <div className="wrap" style={{ paddingTop: 24, paddingBottom: 60 }}>
        <header style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <p className="mono" style={label}>Admin · Espace privé · session ouverte</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Link href="/admin/ingest" className="pill" style={{ minHeight: 44, textDecoration: 'none' }}>
                Admettre un dossier
              </Link>
              <form method="post" action="/api/admin/logout">
                <button type="submit" className="pill" style={{ minHeight: 44, cursor: 'pointer' }}>
                  Fermer la session
                </button>
              </form>
            </div>
          </div>
          <h1 style={{ fontSize: 44, letterSpacing: '-0.025em', margin: 0, fontWeight: 600, textWrap: 'balance' }}>
            Espace <span className="serif">privé.</span>
          </h1>
          <p style={{ marginTop: 12, maxWidth: 760, fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.55, textWrap: 'pretty' }}>
            Les dossiers privés appartiennent à UPgraders. Ils ne se lisent qu’avec la clé
            d’administration : sans elle, ils n’apparaissent dans aucune liste, recherche, compteur,
            plan du site, image de partage ni réponse de l’API, et leur adresse répond comme une
            adresse inconnue. Un dossier privé est purgé {PRIVATE_RETENTION_MONTHS} mois après sa
            dernière modification (contenu ou visibilité), sauf s’il a été publié d’ici là. La purge
            tourne chaque jour dans le serveur ; la commande <code>argos-purge-private --dry-run</code>{' '}
            en donne l’aperçu.
          </p>
        </header>

        {purged !== null && (
          <output style={{ display: 'block', marginTop: 16, padding: '12px 14px', borderRadius: 14, background: 'rgba(58, 142, 92, 0.1)', color: '#1f5d3a', fontSize: 14 }}>
            Purge effectuée : {purged} dossier{purged > 1 ? 's' : ''} supprimé{purged > 1 ? 's' : ''}.
          </output>
        )}
        {purge === 'invalide' && (
          <p role="alert" style={{ marginTop: 16, padding: '12px 14px', borderRadius: 14, background: '#fff1ec', color: '#7a2614', fontSize: 14 }}>
            La demande de purge n’a pas pu être lue. Recommencez depuis cette page.
          </p>
        )}

        <section style={panel} aria-labelledby="prives-titre">
          <h2 id="prives-titre" style={{ fontSize: 22, margin: 0, letterSpacing: '-0.015em', fontWeight: 600 }}>
            {dossiers.length} dossier{dossiers.length > 1 ? 's' : ''} privé{dossiers.length > 1 ? 's' : ''}
          </h2>
          {dossiers.length === 0 ? (
            <p style={{ marginTop: 8, fontSize: 14, color: 'var(--ink-2)' }}>
              Aucun dossier privé. Un dossier s’admet dans l’espace privé depuis l’admission, ou
              s’y retire depuis sa fiche (« Rendre privé »).
            </p>
          ) : (
            <table style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th scope="col">Dossier</th>
                  <th scope="col">Dernière modification</th>
                  <th scope="col">Purge prévue</th>
                  <th scope="col">Visibilité changée</th>
                </tr>
              </thead>
              <tbody>
                {dossiers.map((dossier) => (
                  <tr key={dossier.slug}>
                    <td data-label="Dossier">
                      <Link href={`/work/${encodeURIComponent(dossier.slug)}`} style={{ color: 'var(--ink)', fontWeight: 600 }}>
                        {dossier.title}
                      </Link>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{dossier.brandEmitter}</div>
                    </td>
                    <td data-label="Dernière modification"><FreshTime value={dossier.lastModifiedAt} /></td>
                    <td data-label="Purge prévue">
                      <FreshTime value={dossier.purgeDueAt} />
                      {dossier.due && <b> · échue</b>}
                    </td>
                    <td data-label="Visibilité changée">
                      {dossier.visibilityChangedAt ? (
                        <>
                          <FreshTime value={dossier.visibilityChangedAt} />
                          {dossier.visibilityChangedBy ? ` · ${ADMIN_CHANNEL_LABELS[dossier.visibilityChangedBy] ?? dossier.visibilityChangedBy}` : ''}
                        </>
                      ) : (
                        'admis privé'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section style={panel} aria-labelledby="purge-titre">
          <h2 id="purge-titre" style={{ fontSize: 22, margin: 0, letterSpacing: '-0.015em', fontWeight: 600 }}>
            Purge de <span className="serif">rétention</span>
          </h2>
          <p style={{ marginTop: 8, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            Aperçu à cet instant : {due.length === 0 ? 'aucun dossier privé n’est échu.' : `${due.length} dossier${due.length > 1 ? 's' : ''} privé${due.length > 1 ? 's' : ''} échu${due.length > 1 ? 's' : ''}.`}{' '}
            La purge supprime chaque dossier échu avec ses actifs, sources, analyses, révisions,
            filiations et historique ; les dossiers publics ne sont jamais touchés. Les copies de
            sauvegarde déjà faites conservent les dossiers purgés jusqu’à leur propre suppression.
          </p>
          {due.length > 0 && (
            <form method="post" action="/api/admin/private-purge" style={{ marginTop: 12 }}>
              <input type="hidden" name="mode" value="purge" />
              <button type="submit" className="pill dark" style={{ minHeight: 44, padding: '0 18px', cursor: 'pointer', fontSize: 13 }}>
                Purger maintenant {due.length} dossier{due.length > 1 ? 's' : ''} échu{due.length > 1 ? 's' : ''}
              </button>
            </form>
          )}
          <h3 style={{ marginTop: 18, fontSize: 15, fontWeight: 600 }}>Dernières purges</h3>
          {runs.length === 0 ? (
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>Aucune purge enregistrée.</p>
          ) : (
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.7 }}>
              {runs.map((run) => (
                <li key={run.id}>
                  <FreshTime value={run.ranAt.toISOString()} /> · {run.purgedCount} supprimé{run.purgedCount > 1 ? 's' : ''} ·{' '}
                  {ADMIN_CHANNEL_LABELS[run.trigger] ?? run.trigger}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
