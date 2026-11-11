#!/bin/sh
# Argos-studio — start sequence of the image: check the library volume, apply the
# migrations, then serve. Nothing here creates or reads a secret.
set -eu
umask 077

say() { echo "[argos] $*" >&2; }

case "${DATABASE_URL:-}" in
  file:/*) ;;
  *)
    say "DATABASE_URL doit désigner un fichier SQLite par un chemin absolu, par exemple file:/data/argos.db."
    exit 64
    ;;
esac
db_file=${DATABASE_URL#file:}
db_file=${db_file%%\?*}
db_dir=$(dirname "$db_file")

# A library outside a mounted volume would vanish with the container, at the next deployment.
if [ "${ARGOS_ALLOW_EPHEMERAL_DB:-}" != "1" ] && ! mountpoint -q "$db_dir"; then
  say "$db_dir n'est pas un volume monté : la bibliothèque serait perdue avec ce conteneur."
  say "Montez un volume persistant sur $db_dir (ARGOS_ALLOW_EPHEMERAL_DB=1 pour un essai jetable)."
  exit 78
fi
if [ ! -w "$db_dir" ]; then
  say "$db_dir n'est pas inscriptible par l'utilisateur $(id -u):$(id -g) du conteneur."
  exit 73
fi

if [ -z "${ARGOS_ADMIN_KEY:-}" ] || [ "${#ARGOS_ADMIN_KEY}" -lt 24 ]; then
  say "ARGOS_ADMIN_KEY absente ou de moins de 24 caractères : administration fermée, lecture publique ouverte."
fi
if [ -n "${ARGOS_INGEST_API_KEY:-}" ]; then
  say "ARGOS_INGEST_API_KEY est ignorée : la clé unique s'appelle ARGOS_ADMIN_KEY."
fi

# Run from the CLI's own directory: the application's package.json carries no migration setting.
(cd /opt/prisma-cli && node node_modules/prisma/build/index.js migrate deploy --schema /app/prisma/schema.prisma)
cd /app
exec node /app/server.js
