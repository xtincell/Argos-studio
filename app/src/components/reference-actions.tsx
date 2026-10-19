'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Reference } from '@/lib/types';

export function ReferenceActions({ reference }: { reference: Reference }) {
  const [message, setMessage] = useState('');
  if (!reference.updatedAt) return null;
  const href = `/work/${encodeURIComponent(reference.slug)}`;
  async function copyLink() {
    try { await navigator.clipboard.writeText(new URL(href, window.location.origin).href); setMessage('Lien copié'); }
    catch { setMessage('La copie a échoué. Le lien reste disponible dans la barre d’adresse.'); }
  }
  return <div className="flex flex-wrap items-center gap-3 py-4 text-sm print:hidden">
    <Link className="pill" href={`/admin/ingest?slug=${encodeURIComponent(reference.slug)}`}>Modifier le dossier</Link>
    <a className="pill" href={`/api/v1/references/${encodeURIComponent(reference.slug)}${reference.hasSourceDossier ? '?format=dossier' : ''}`} download>Exporter {reference.hasSourceDossier ? 'le dossier' : 'la référence'} JSON</a>
    <button type="button" className="pill" onClick={copyLink}>Copier le lien</button>
    <button type="button" className="pill" onClick={() => window.print()}>Imprimer</button>
    <output>{message}</output>
  </div>;
}
