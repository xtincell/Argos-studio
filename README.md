# Argos

> Ambition : constituer une bibliothèque qualifiée de campagnes marketing.

Argos est un répertoire éditorial de patterns créatifs gagnants, exploitable comme moteur de recherche public ou via API/MCP pour les systèmes IA.

La bibliothèque et son parcours manuel conservent des opérations, leurs actifs, leurs analyses et leurs sources. Une clé unique d’administration (`ARGOS_ADMIN_KEY`) protège les écritures et l’administration ; la lecture, la recherche et l’API v1 restent publiques pour les dossiers publics ([ADR-0009](docs/decisions/0009-vps-sqlite-cle-unique.md)). Un espace privé, détenu par UPgraders et lu avec la même clé, garde des dossiers invisibles du public et les purge 24 mois après leur dernière modification ([ADR-0010](docs/decisions/0010-espace-prive-upgraders-retention.md)). L’accès MCP reste à recevoir.
L’[état de réception](docs/RECEPTION-INTEGRITE.md) distingue le code, ses tests
et les parcours effectivement éprouvés. Les personas décrivent des responsabilités
spécialisées ; leur présence ne prouve pas des agents actifs.

## Quick start

Node 22 est recommandé pour le runtime et requis pour la suite de réception. npm ships with Node; pnpm is optional.

```bash
cd app
npm install         # or: pnpm install
cp .env.example .env
# Configurer ARGOS_ADMIN_KEY (24 caractères minimum) pour l’administration.
# Initialisation de l’exemple SQLite local uniquement, sans écraser un fichier existant :
node -e "const fs=require('node:fs');if(!fs.existsSync('prisma/dev.db'))fs.writeFileSync('prisma/dev.db','',{flag:'wx',mode:0o600})"
npx prisma migrate deploy
npm run dev         # or: pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). L’administration s’ouvre sur
`/admin/login` avec la clé.

## Déploiement (VPS, Coolify)

Arbitrage 5.8 : SQLite sur un volume persistant et une clé unique
([ADR-0009](docs/decisions/0009-vps-sqlite-cle-unique.md)). Le `Dockerfile` à la racine
construit le serveur Next.js *standalone* et embarque le CLI Prisma : au démarrage, l’image
vérifie le volume, applique `prisma migrate deploy`, puis sert le port 3000 sous l’utilisateur
`node` (uid 1000). Aucun secret n’est dans l’image.

Dans Coolify : ressource *Dockerfile* sur ce dépôt (répertoire de base `/`), port 3000, un
stockage persistant monté en **`/data`**. Sans volume monté sur le répertoire de la base,
le conteneur refuse de démarrer (sortie 78) plutôt que de perdre la bibliothèque au
redéploiement suivant.

| Variable | Où | Valeur |
|---|---|---|
| `ARGOS_ADMIN_KEY` | exécution seulement, secret | 24 caractères au moins, par exemple `openssl rand -base64 33` |
| `NEXT_PUBLIC_SITE_URL` | exécution **et** construction (*Build Variable*) | adresse publique, par exemple `https://argos.exemple.org` |
| `DATABASE_URL` | facultative | défaut de l’image `file:/data/argos.db` ; un autre chemin doit rester sur le volume |
| `ARGOS_PRIVATE_PURGE` | facultative | `off` désactive la purge quotidienne des dossiers privés (défaut : quotidienne) |

Sans `ARGOS_ADMIN_KEY` (ou avec moins de 24 caractères), l’administration est fermée :
écritures en 503, pages d’administration renvoyées à la connexion, qui le dit. L’ancienne
`ARGOS_INGEST_API_KEY` est ignorée. Changer la clé ferme toutes les sessions ouvertes ;
La Fusée doit alors recevoir la nouvelle valeur dans sa connexion Argos Studio (en-tête
`Authorization: Bearer`). Les autres variables de `app/.env.example` (LLM, Auth.js, R2,
analytics) ne sont pas lues par l’application.

Un volume nommé neuf prend le propriétaire de l’image. Un montage de répertoire de l’hôte
doit appartenir à l’uid 1000 : `install -d -m 700 -o 1000 -g 1000 /srv/argos-data`.

La bibliothèque démarre vide ; elle se remplit par l’admission, jamais par le corpus de
démonstration (`db:seed` ajoute aussi des références fictives). Les dossiers publics du dépôt
s’admettent par la voie gouvernée :

```bash
for f in app/public/dossier-*.json; do
  case "$f" in *template*|*example*) continue ;; esac
  curl -fsS -X POST -H "Authorization: Bearer $ARGOS_ADMIN_KEY" \
    -H 'Content-Type: application/json' --data-binary "@$f" \
    https://argos.exemple.org/api/v1/ingest/dossier
done
```

### Espace privé et rétention

Un dossier est **public** (défaut, tous les dossiers existants) ou **privé**. Un dossier privé
appartient à UPgraders et ne se lit qu’avec la clé d’administration (en-tête
`Authorization: Bearer` ou session de `/admin/login`). Sans elle, il n’existe pas : absent des
listes, de la recherche, des compteurs et facettes, du plan du site, des images de partage, des
exports et de l’API ; sa fiche et son API répondent exactement comme une adresse inconnue, et une
filiation d’un dossier public vers lui est retirée de la lecture publique.

```bash
# Admettre un nouveau dossier dans l'espace privé (sans paramètre : public)
curl -fsS -X POST -H "Authorization: Bearer $ARGOS_ADMIN_KEY" -H 'Content-Type: application/json' \
  --data-binary @dossier.json 'https://argos.exemple.org/api/v1/ingest/dossier?visibility=private'

# Publier (privé → public) ou retirer (public → privé) : action explicite, qui et quand enregistrés
curl -fsS -X POST -H "Authorization: Bearer $ARGOS_ADMIN_KEY" -H 'Content-Type: application/json' \
  -d '{"visibility":"public"}' https://argos.exemple.org/api/v1/references/<slug>/visibility
```

Un amendement garde la visibilité enregistrée. La publication applique au dossier conservé les
règles d’admission des dossiers publics ; refusé, il reste privé (409 `PUBLICATION_REFUSED`).
Depuis le navigateur : case « Admettre dans l’espace privé » de l’admission, bouton
« Publier le dossier » / « Rendre privé » sur la fiche, liste et échéances sur `/admin/prive`.

**Rétention.** Un dossier privé est purgé **24 mois après sa dernière modification** (contenu ou
changement de visibilité, le plus récent des deux), sauf s’il a été publié. La purge supprime le
dossier et tout ce qui lui appartient (actifs, sources, axes, métriques, annotations, révisions,
filiations, historique), écrase les pages libérées (`secure_delete`) et journalise un compte, sans
garder ni titre ni slug. Elle ne touche jamais un dossier public. Elle tourne chaque jour dans le
serveur (première exécution cinq minutes après le démarrage ; `ARGOS_PRIVATE_PURGE=off` la
désactive), et à la demande :

```bash
docker exec <conteneur> argos-purge-private --dry-run   # aperçu : dossiers échus, aucune écriture
docker exec <conteneur> argos-purge-private --purge     # suppression, journalisée
```

Sans mode, la commande refuse (sortie 64). Elle demande le travail au serveur en cours avec la clé
du conteneur, qui reste ainsi l’unique écrivain de la base. Hors conteneur :
`ARGOS_URL=https://argos.exemple.org ARGOS_ADMIN_KEY=… node docker/purge-private.cjs --dry-run`,
ou `POST /api/admin/private-purge` avec `{"mode":"dry-run"}` ou `{"mode":"purge"}`.

Les copies `argos-backup` sont des bases entières : une sauvegarde antérieure à une purge garde
les dossiers purgés jusqu’à sa propre suppression. La purge indique combien de copies existent ;
supprimez celles qui dépassent la rétention. Argos n’écrit aucun fichier d’actif sur `/data` (les
actifs sont des URL) : la base, son journal et les sauvegardes sont les seuls fichiers du volume.

### Sauvegarde et restauration du volume

`argos-backup` produit une copie cohérente de la base sans arrêter le serveur
(`VACUUM INTO`, droits 600) et affiche son chemin :

```bash
docker exec <conteneur> argos-backup          # → /data/backups/argos-AAAAMMJJTHHMMSSZ.db
docker cp <conteneur>:/data/backups/argos-….db ./
```

Le répertoire `/data/backups` est sur le même volume : copiez la sauvegarde hors du VPS (ou
sauvegardez le volume par Coolify). Pour restaurer : arrêter le conteneur, remplacer
`/data/argos.db` par la copie (droits 600, propriétaire uid 1000, sans fichier
`argos.db-journal` résiduel), redémarrer ; les migrations manquantes s’appliquent seules.

### Recette locale de l’image

```bash
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://argos.exemple.org -t argos-studio .
docker/recette.sh argos-studio
```

La recette (aussi lancée en CI) vérifie la lecture publique, les refus 401/503, la session, un
dossier privé introuvable sans clé et lu avec elle, l’aperçu de purge,
la conservation après redémarrage et après recréation du conteneur, la sauvegarde puis sa
restauration sur un volume neuf, le refus de démarrer sans volume et l’absence de secret dans
l’image. Elle supprime les conteneurs et volumes qu’elle crée.

## Structure du repo

```
argos-finder/
├── README.md (this file)
├── personas/             # Persona definitions (Daedalus, Hephaistos, ...)
│   ├── README.md
│   ├── product-architect.md
│   ├── tech-lead.md
│   ├── crawler-engineer.md
│   ├── ux-ui-designer.md
│   ├── editorial-curator.md
│   └── growth-lead.md
├── Dockerfile            # Image du VPS (ADR-0009)
├── docker/               # Démarrage, sauvegarde et recette de l’image
├── docs/                 # Common documentation
│   ├── PRD.md
│   ├── architecture.md
│   ├── conventions.md
│   ├── glossary.md
│   ├── workflows.md
│   └── decisions/        # ADRs
└── app/                  # Next.js web application
    └── README.md
```

## Where to start (by role)

- **Founder / new joiner** : read [`personas/README.md`](personas/README.md), then [`docs/PRD.md`](docs/PRD.md)
- **Product** : [`docs/PRD.md`](docs/PRD.md), [`personas/product-architect.md`](personas/product-architect.md)
- **Engineering** : [`docs/architecture.md`](docs/architecture.md), [`docs/conventions.md`](docs/conventions.md), [`app/README.md`](app/README.md)
- **Design** : [`personas/ux-ui-designer.md`](personas/ux-ui-designer.md)
- **Editorial** : [`personas/editorial-curator.md`](personas/editorial-curator.md), [`docs/glossary.md`](docs/glossary.md)
- **Growth** : [`personas/growth-lead.md`](personas/growth-lead.md)

## Licence et propriété

Argos appartient à [Argos Inc.] (entité légale en cours d'établissement). Tout droit réservé. Pas de licence open-source publique en phase 0-2.

Les références indexées dans Argos sont des œuvres tierces ; Argos détient le copyright de ses propres classifications, annotations, et structure du répertoire.
