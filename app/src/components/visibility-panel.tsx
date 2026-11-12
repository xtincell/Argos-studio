// Visibility of a dossier, for the holder of the administration key only (ADR-0010): its state,
// its retention and the explicit action that publishes it or withdraws it into the private space.
// A plain form: it works without script, through the session cookie, and returns to this page.

import { FreshTime } from '@/components/fresh-time';
import type { Reference } from '@/lib/types';
import { ADMIN_CHANNEL_LABELS } from '@/lib/visibility';

/** Outcomes sent back by POST /api/v1/references/{slug}/visibility in `?visibilite=`. */
const OUTCOMES: Record<string, { error: boolean; text: string }> = {
  publique: { error: false, text: 'Dossier publié : il est désormais lisible par tous, sans clé.' },
  privee: { error: false, text: 'Dossier retiré dans l’espace privé : sans la clé, il n’existe plus pour les lecteurs.' },
  inchangee: { error: false, text: 'Visibilité inchangée.' },
  refusee: { error: true, text: 'Publication refusée : le dossier conservé ne respecte plus les règles d’admission. Corrigez-le (Modifier le dossier), puis publiez-le.' },
  conflit: { error: true, text: 'La référence a changé depuis son affichage. Cette page la montre à jour : vérifiez-la, puis recommencez.' },
  invalide: { error: true, text: 'La demande n’a pas pu être lue. Recommencez depuis cette page.' },
};

export function VisibilityPanel({ reference, outcome }: { reference: Reference; outcome?: string }) {
  const isPrivate = reference.visibility === 'private';
  const message = outcome ? OUTCOMES[outcome] : undefined;
  const channel = reference.visibilityChangedBy
    ? (ADMIN_CHANNEL_LABELS[reference.visibilityChangedBy] ?? reference.visibilityChangedBy)
    : null;
  return (
    <section className="visibility-panel print:hidden" aria-labelledby="visibilite-titre" data-visibility={isPrivate ? 'private' : 'public'}>
      <h2 id="visibilite-titre">
        Visibilité · <span className="serif">{isPrivate ? 'dossier privé' : 'dossier public'}</span>
      </h2>
      <p>
        {isPrivate
          ? 'Visible avec la clé d’administration seulement : absent des listes, de la recherche, des compteurs, du plan du site, des images de partage et de l’API publique.'
          : 'Lisible par tous, sans clé.'}
      </p>
      {isPrivate && reference.purgeDueAt && (
        <p>
          <FreshTime value={reference.purgeDueAt} prefix="Purge prévue le" /> — 24 mois après la dernière
          modification, sauf publication d’ici là.
        </p>
      )}
      {reference.visibilityChangedAt && (
        <p className="mono visibility-change">
          <FreshTime value={reference.visibilityChangedAt} prefix="Dernier changement de visibilité le" />
          {channel ? ` · ${channel}` : ''}
        </p>
      )}
      {message?.error && (
        <p role="alert" className="visibility-outcome error">
          {message.text}
        </p>
      )}
      {message && !message.error && <output className="visibility-outcome">{message.text}</output>}
      <form method="post" action={`/api/v1/references/${encodeURIComponent(reference.slug)}/visibility`}>
        <input type="hidden" name="visibility" value={isPrivate ? 'public' : 'private'} />
        {reference.updatedAt && <input type="hidden" name="version" value={reference.updatedAt} />}
        <button type="submit" className="pill dark">
          {isPrivate ? 'Publier le dossier' : 'Rendre privé'}
        </button>
      </form>
    </section>
  );
}
