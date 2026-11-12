#!/usr/bin/env bash
# Recette de l'image Argos-studio : lecture publique, clé unique d'administration et
# persistance de la bibliothèque SQLite sur son volume, à travers un redémarrage puis une
# recréation du conteneur (ce que fait un redéploiement Coolify).
#
#   docker/recette.sh <image> [préfixe des ressources] [port local]
#
# Les ressources créées portent le préfixe donné et sont supprimées à la fin, réussite ou
# échec. La clé est tirée au hasard pour la recette et n'est jamais affichée.
set -euo pipefail

IMAGE=${1:?usage: docker/recette.sh <image> [préfixe] [port]}
PREFIX=${2:-argos-recette-}
PORT=${3:-3990}
VOLUME="${PREFIX}data"
NAME="${PREFIX}app"
BASE="http://127.0.0.1:${PORT}"
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d "${TMPDIR:-/tmp}/${PREFIX}XXXXXX")
KEY=$(node -e "process.stdout.write(require('node:crypto').randomBytes(24).toString('base64url'))")

remove_resources() {
  docker rm -f "$NAME" "${PREFIX}closed" "${PREFIX}nodata" >/dev/null 2>&1 || true
  docker volume rm -f "$VOLUME" "${PREFIX}restored" >/dev/null 2>&1 || true
}
trap 'remove_resources; rm -rf "$WORK"' EXIT
remove_resources

ok() { echo "  ✓ $*"; }
fail() {
  echo "  ✗ $*" >&2
  docker logs "$NAME" 2>&1 | tail -40 >&2 || true
  exit 1
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
expect() { # expect <attendu> <libellé> <arguments curl…>
  local expected=$1 label=$2 actual
  shift 2
  actual=$(code "$@")
  [ "$actual" = "$expected" ] || fail "$label : HTTP $actual au lieu de $expected"
  ok "$label : HTTP $actual"
}
start() { # start <nom> <arguments docker run…>
  local name=$1
  shift
  docker run -d --name "$name" -p "127.0.0.1:${PORT}:3000" "$@" "$IMAGE" >/dev/null
  for _ in $(seq 1 90); do
    [ "$(code "$BASE/api/v1")" = 200 ] && return 0
    [ "$(docker inspect -f '{{.State.Running}}' "$name")" = true ] || { docker logs "$name" >&2; return 1; }
    sleep 1
  done
  docker logs "$name" >&2
  return 1
}

node -e "
const d = JSON.parse(require('node:fs').readFileSync(process.argv[1], 'utf8'));
d.operation.title = 'Recette Docker AR3';
d.operation.brandEmitter = 'Recette Docker';
d.filiations = [];
require('node:fs').writeFileSync(process.argv[2], JSON.stringify(d));
d.operation.title = 'Recette Docker espace privé';
require('node:fs').writeFileSync(process.argv[3], JSON.stringify(d));
" "$ROOT/app/public/dossier-example.json" "$WORK/dossier.json" "$WORK/private.json"

echo "1. Premier démarrage, volume neuf, clé configurée"
docker volume create "$VOLUME" >/dev/null
start "$NAME" -v "$VOLUME:/data" -e "ARGOS_ADMIN_KEY=$KEY" || fail "le conteneur ne démarre pas"
expect 200 "lecture publique /api/v1/references" "$BASE/api/v1/references"
expect 200 "page d'accueil" "$BASE/"
expect 303 "page d'administration sans session" "$BASE/admin/ingest"
location=$(curl -s -o /dev/null -w '%{redirect_url}' -H 'X-Forwarded-Host: argos.example.org' -H 'X-Forwarded-Proto: https' "$BASE/admin/ingest")
[ "$location" = "https://argos.example.org/admin/login?next=%2Fadmin%2Fingest" ] || fail "redirection derrière le proxy : $location"
ok "derrière le proxy, la connexion reste à l'adresse publique"
expect 401 "écriture sans clé" -X POST -H 'Content-Type: application/json' --data-binary "@$WORK/dossier.json" "$BASE/api/v1/ingest/dossier"
expect 401 "écriture avec une mauvaise clé" -X POST -H 'Authorization: Bearer mauvaise-cle-de-recette-000000000' -H 'Content-Type: application/json' --data-binary "@$WORK/dossier.json" "$BASE/api/v1/ingest/dossier"
created=$(curl -s -w '\n%{http_code}' -X POST -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' --data-binary "@$WORK/dossier.json" "$BASE/api/v1/ingest/dossier")
[ "$(echo "$created" | tail -1)" = 201 ] || fail "admission par la clé : $created"
SLUG=$(echo "$created" | head -1 | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>process.stdout.write(JSON.parse(s).slug))")
ok "admission par la clé : HTTP 201 ($SLUG)"
expect 200 "fiche admise, lue sans clé" "$BASE/api/v1/references/$SLUG"
created=$(curl -s -w '\n%{http_code}' -X POST -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' --data-binary "@$WORK/private.json" "$BASE/api/v1/ingest/dossier?visibility=private")
[ "$(echo "$created" | tail -1)" = 201 ] || fail "admission privée par la clé : $created"
PSLUG=$(echo "$created" | head -1 | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>process.stdout.write(JSON.parse(s).slug))")
ok "admission dans l'espace privé : HTTP 201 ($PSLUG)"
expect 404 "dossier privé sans clé, comme une adresse inconnue" "$BASE/api/v1/references/$PSLUG"
# ADR-0010 : sans session, la page d'un dossier privé répond exactement comme une adresse
# inconnue : HTTP 404 avec la page introuvable, pour l'une comme pour l'autre.
unknown=$(code "$BASE/work/argos-recette-adresse-inconnue")
private=$(code "$BASE/work/$PSLUG")
[ "$unknown" = 404 ] || fail "page d'une adresse inconnue : HTTP $unknown au lieu de 404"
[ "$private" = "$unknown" ] || fail "page du dossier privé sans session : HTTP $private, adresse inconnue : HTTP $unknown"
curl -s "$BASE/work/$PSLUG" | grep -qF 'Recette Docker espace privé' && fail "la page du dossier privé montre son titre sans session"
curl -s "$BASE/work/$PSLUG" | grep -qF 'Pas encore dans la' || fail "la page du dossier privé sans session n'est pas la page introuvable"
ok "page du dossier privé sans session : HTTP $private comme une adresse inconnue, page introuvable, sans son titre"
expect 404 "page d'une marque inconnue" "$BASE/brand/argos-recette-marque-inconnue"
expect 200 "dossier privé lu avec la clé" -H "Authorization: Bearer $KEY" "$BASE/api/v1/references/$PSLUG"
curl -s "$BASE/api/v1/references?limit=100" | grep -q "$PSLUG" && fail "le dossier privé apparaît dans la liste publique"
ok "absent de la liste publique"
docker exec "$NAME" argos-purge-private --dry-run | grep -q 'Aperçu' || fail "argos-purge-private --dry-run"
ok "purge de rétention : aperçu sans écriture"
set +e
docker exec "$NAME" argos-purge-private >/dev/null 2>&1
status=$?
set -e
[ "$status" = 64 ] || fail "argos-purge-private sans mode : sortie $status au lieu de 64"
ok "purge de rétention : le mode est obligatoire"
curl -s -o /dev/null -D "$WORK/login.headers" -X POST -H "Origin: $BASE" \
  --data-urlencode "key=$KEY" --data-urlencode 'next=/admin/ingest' "$BASE/api/admin/login"
grep -qi '^HTTP/1.1 303' "$WORK/login.headers" || fail "connexion par formulaire"
cookie=$(grep -i '^set-cookie: argos_admin=' "$WORK/login.headers" | tr -d '\r')
for attribute in HttpOnly Secure 'SameSite=strict' 'Path=/'; do
  echo "$cookie" | grep -qi "$attribute" || fail "attribut $attribute absent du cookie de session"
done
case "$cookie" in *"$KEY"*) fail "le cookie contient la clé" ;; esac
ok "session : cookie HttpOnly, Secure, SameSite=Strict, signé, sans la clé"
session=$(echo "$cookie" | sed -E 's/^[Ss]et-[Cc]ookie: ([^;]*).*/\1/')
expect 200 "page d'administration avec session" -H "Cookie: $session" "$BASE/admin/ingest"
expect 200 "page du dossier privé avec session" -H "Cookie: $session" "$BASE/work/$PSLUG"
mode=$(docker exec "$NAME" stat -c '%a %U' /data/argos.db)
[ "$mode" = "600 node" ] || fail "droits du fichier de base : $mode"
ok "base /data/argos.db : $mode"

echo "2. Redémarrage du même conteneur"
docker restart "$NAME" >/dev/null
for _ in $(seq 1 90); do [ "$(code "$BASE/api/v1")" = 200 ] && break; sleep 1; done
expect 200 "fiche conservée après redémarrage" "$BASE/api/v1/references/$SLUG"

echo "3. Nouveau conteneur sur le même volume (redéploiement)"
docker rm -f "$NAME" >/dev/null
start "$NAME" -v "$VOLUME:/data" -e "ARGOS_ADMIN_KEY=$KEY" || fail "le nouveau conteneur ne démarre pas"
expect 200 "fiche conservée dans un nouveau conteneur" "$BASE/api/v1/references/$SLUG"
expect 404 "dossier privé toujours privé dans le nouveau conteneur" "$BASE/api/v1/references/$PSLUG"
expect 200 "dossier privé conservé, lu avec la clé" -H "Authorization: Bearer $KEY" "$BASE/api/v1/references/$PSLUG"
expect 200 "session toujours valide avec la même clé" -H "Cookie: $session" "$BASE/admin/ingest"

echo "4. Sauvegarde à chaud, puis restauration sur un volume neuf"
backup=$(docker exec "$NAME" argos-backup)
case "$backup" in /data/backups/argos-*.db) ;; *) fail "chemin de sauvegarde inattendu : $backup" ;; esac
ok "sauvegarde à chaud : $backup ($(docker exec "$NAME" stat -c '%a %U' "$backup"))"
docker cp "$NAME:$backup" "$WORK/backup.db"
chmod 755 "$WORK" && chmod 644 "$WORK/backup.db"
docker rm -f "$NAME" >/dev/null
docker volume create "${PREFIX}restored" >/dev/null
docker run --rm -v "${PREFIX}restored:/data" -v "$WORK:/in:ro" --entrypoint sh "$IMAGE" -c 'cp /in/backup.db /data/argos.db && chmod 600 /data/argos.db'
start "$NAME" -v "${PREFIX}restored:/data" -e "ARGOS_ADMIN_KEY=$KEY" || fail "le conteneur restauré ne démarre pas"
expect 200 "fiche retrouvée dans la base restaurée" "$BASE/api/v1/references/$SLUG"
docker rm -f "$NAME" >/dev/null
docker volume rm -f "${PREFIX}restored" >/dev/null

echo "5. Sans clé configurée : administration fermée, lecture ouverte"
start "${PREFIX}closed" -v "$VOLUME:/data" || fail "le conteneur sans clé ne démarre pas"
expect 200 "lecture publique sans clé configurée" "$BASE/api/v1/references/$SLUG"
expect 503 "écriture refusée, administration fermée" -X POST -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' --data-binary "@$WORK/dossier.json" "$BASE/api/v1/ingest/dossier"
expect 303 "page d'administration renvoyée à la connexion" -H "Cookie: $session" "$BASE/admin/ingest"
curl -s "$BASE/admin/login" | grep -q 'administration est fermée' || fail "la page de connexion ne dit pas que l'administration est fermée"
ok "la page de connexion dit que l'administration est fermée"
docker rm -f "${PREFIX}closed" >/dev/null

echo "6. Sans volume : démarrage refusé"
set +e
timeout 120 docker run --name "${PREFIX}nodata" -e "ARGOS_ADMIN_KEY=$KEY" "$IMAGE" >"$WORK/nodata.log" 2>&1
status=$?
set -e
[ "$status" = 78 ] || { cat "$WORK/nodata.log" >&2; fail "sans volume, sortie $status au lieu de 78"; }
grep -q "n'est pas un volume monté" "$WORK/nodata.log" || fail "message d'absence de volume"
ok "sans volume, le conteneur refuse de démarrer (sortie 78)"

echo "7. Aucun secret dans l'image"
if docker image inspect "$IMAGE" --format '{{json .Config.Env}}' | grep -q 'ARGOS_ADMIN_KEY'; then fail "variable de clé dans l'image"; fi
if docker history --no-trunc "$IMAGE" | grep -q 'ARGOS_ADMIN_KEY='; then fail "clé dans l'historique de l'image"; fi
docker run --rm --entrypoint sh "$IMAGE" -c 'test ! -e /app/.env && ! ls /app/prisma/*.db >/dev/null 2>&1' || fail "fichier .env ou base dans l'image"
ok "ni clé, ni .env, ni base dans l'image"

echo "Recette Docker réussie."
