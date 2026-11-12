#!/usr/bin/env -S node --no-warnings
// Argos-studio — retention purge of the private space (ADR-0010), explicit and logged.
//
//   docker exec <conteneur> argos-purge-private --dry-run   # aperçu, aucune écriture
//   docker exec <conteneur> argos-purge-private --purge     # supprime les dossiers privés échus
//
// A private dossier is due 24 months after its last modification (content or visibility),
// unless it has been made public. The command asks the running server to do the work, with the
// administration key of the container (ARGOS_ADMIN_KEY): the server stays the only writer of the
// SQLite library (ADR-0009), and the purge is the one tested and logged by the application.
// ARGOS_URL overrides the address of the server (default http://127.0.0.1:$PORT, port 3000).
// CommonJS on purpose: the file is installed without extension as /usr/local/bin/argos-purge-private.
'use strict';

const args = process.argv.slice(2);
const usage = 'usage : argos-purge-private --dry-run | --purge';
const modes = { '--dry-run': 'dry-run', '--purge': 'purge' };
if (args.length !== 1 || !(args[0] in modes)) {
  console.error(`[argos] ${usage}`);
  console.error('[argos] Le mode est obligatoire : --dry-run montre les dossiers privés échus sans rien écrire, --purge les supprime.');
  process.exit(64);
}
const mode = modes[args[0]];
const key = process.env.ARGOS_ADMIN_KEY ?? '';
if (key.length < 24) {
  console.error('[argos] ARGOS_ADMIN_KEY absente ou trop courte : administration fermée, purge impossible.');
  process.exit(78);
}
const base = (process.env.ARGOS_URL || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/+$/, '');

const day = (iso) => (typeof iso === 'string' ? iso.slice(0, 10) : '?');

(async () => {
  let response;
  try {
    response = await fetch(`${base}/api/admin/private-purge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
  } catch (error) {
    console.error(`[argos] Le serveur ne répond pas sur ${base} : ${error instanceof Error ? error.message : error}`);
    process.exit(69);
  }
  const text = await response.text();
  let report;
  try { report = JSON.parse(text); } catch { report = null; }
  if (!response.ok || !report || report.ok !== true) {
    console.error(`[argos] Purge refusée : HTTP ${response.status} ${report?.error ?? ''} ${report?.message ?? text.slice(0, 200)}`.trim());
    process.exit(1);
  }
  const candidates = Array.isArray(report.candidates) ? report.candidates : [];
  const title = mode === 'dry-run' ? 'Aperçu (dry-run), aucune écriture' : 'Purge effectuée';
  console.log(`${title} — rétention ${report.retentionMonths} mois, dernière modification au plus tard ${day(report.cutoff)}`);
  console.log(`Dossiers privés échus : ${candidates.length}`);
  for (const c of candidates) {
    console.log(`  - ${c.slug} (dernière modification ${day(c.lastModifiedAt)}, échéance ${day(c.purgeDueAt)})`);
  }
  if (mode === 'purge') console.log(`Supprimés : ${report.purgedCount}`);
  if (report.backups && report.backups.count > 0) {
    console.log(`Attention : ${report.backups.count} sauvegarde(s) dans ${report.backups.directory} peuvent encore contenir des dossiers purgés ; supprimez celles qui dépassent la rétention.`);
  }
})();
