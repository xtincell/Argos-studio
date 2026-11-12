# ADR-0009: VPS du propriétaire, SQLite sur volume et clé unique d’administration

Date: 2026-11-11
Status: Accepted
Decision-makers: Founder (Xtincell), arbitrage 5.8 du programme Shinkiro

## Contexte

Argos-studio est la bibliothèque publique commune de références créatives (SHK-0002) :
La Fusée la lit par l’API v1 (`ARGOS_STUDIO_URL`) et y projette des dossiers par
`POST /api/v1/ingest/dossier`. Elle n’était déployée nulle part. Les ADR 0004 (hébergement
Vercel, Railway, Neon) et 0005 (Auth.js, Google, lien magique) décrivaient une cible qui n’a
jamais été construite : le schéma Prisma et ses migrations sont SQLite, aucun compte n’existe,
et la page d’administration n’était pas gardée.

## Options considérées

### Option A — PostgreSQL et comptes Auth.js
- Pros : cible annoncée par les ADR 0001, 0004 et 0005 ; plusieurs administrateurs nommés.
- Cons : nouveau jeu de migrations et preuve de restauration ; fournisseur d’e-mails ; un
  service de plus sur le VPS ; rien de cela n’existe aujourd’hui.

### Option B — SQLite sur un volume et une clé unique
- Pros : le schéma et les migrations existants ; une seule pièce à sauvegarder ; pas de
  fournisseur ; le contrat Bearer déjà attendu par La Fusée.
- Cons : un seul secret partagé, sans identité ; un seul processus d’écriture ; pas de
  séparation par client.

## Décision

**Option B.** L’image tourne sur le VPS du propriétaire (Coolify) avec la base SQLite sur un
volume persistant monté en `/data`, et une clé unique `ARGOS_ADMIN_KEY` pour l’administration.

## Rationale

La bibliothèque est publique ; seules l’admission et la correction sont réservées. Une clé
couvre ce besoin, sans inventer d’identité ni de fournisseur, et reprend le contrat Bearer de
La Fusée. SQLite tient le volume prévisible d’une bibliothèque éditoriale manuelle.

## Conséquences

**Positives :**
- Toute écriture et toute page ou route d’administration exigent la clé : en-tête
  `Authorization: Bearer`, ou session de navigateur ouverte par un formulaire (cookie signé
  `HttpOnly`, `Secure`, `SameSite=Strict`, huit heures). Sans clé configurée, l’administration
  est fermée ; la lecture publique, API v1 comprise, reste publique.
- Une image (`Dockerfile` à la racine), des migrations appliquées au démarrage, une sauvegarde
  à chaud (`argos-backup`) et une recette Docker en CI.

**Négatives :**
- Pas d’identité : le journal ne dit pas qui a admis un dossier, au-delà du chercheur déclaré
  dans le dossier. Une session ne se révoque pas seule : changer la clé les ferme toutes.
- Un seul conteneur doit écrire dans la base ; pas de réplique.

**Neutres :**
- Les ADR 0004 et 0005 sont remplacés pour l’hébergement et l’authentification de cette phase.
  PostgreSQL et des comptes demanderaient un nouvel ADR, des migrations et une recette de
  restauration propres.
- L’espace privé des consultations (ADR-0006, point 3) n’est pas tranché par cette décision :
  voir `docs/RECEPTION-INTEGRITE.md`, section du 11 novembre. Tranché depuis par l’ADR-0010.

## Suivi

- Taille de `/data/argos.db` et durée de `argos-backup` ; au-delà d’un écrivain concurrent ou
  de plusieurs administrateurs à distinguer, rouvrir la décision.

## Liens

- Arbitrage 5.8, `xtincell/shinkiro` `docs/PLAN-ACHEVEMENT.md`
- SHK-0002 — Argos : une bibliothèque, deux surfaces
- ADR-0006 — Architecture dual-face stricte
