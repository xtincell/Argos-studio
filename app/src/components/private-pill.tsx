// Marker of a private dossier (ADR-0010). Private dossiers only ever reach a reader holding the
// administration key; the marker keeps them from being taken for public ones in a list.
export function PrivatePill({ visibility }: { visibility?: string }) {
  if (visibility !== 'private') return null;
  return (
    <span className="pill dark" title="Dossier privé : visible avec la clé d’administration seulement">
      Privé
    </span>
  );
}
