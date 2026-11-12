# Changelog Argos

## Adresses introuvables en HTTP 404 — non publiée (2026-11-12)

- Défaut : toute page dynamique inconnue (dossier, vue analytique, actif, marque, agence,
  marché, secteur, année, victoire, dimension) répondait HTTP 200 avec la page introuvable, y
  compris pour un robot d’indexation. Cause : le `loading.tsx` racine plaçait toutes les pages
  derrière une frontière Suspense ; Next envoie le statut avec le premier octet, et la réponse
  partait avec le squelette avant que la page lève `notFound()`. Seule une adresse sans route
  répondait 404.
- Correction : le `loading.tsx` racine est retiré ; aucun chargement n’englobe plus une page qui
  peut répondre introuvable. Le squelette (`PageSkeleton`) reste :
  - sur les listes, qui ne répondent jamais introuvable (accueil, opérations, recherche,
    parcours, actifs, patterns, glossaire, index des marques, agences, marchés, secteurs,
    années et victoires), regroupées sans changement d’adresse dans le groupe de routes
    `(listes)` ;
  - sur la fiche, sa vue analytique et la page d’actif : leur mise en page résout l’existence
    avant la frontière (`referenceExists`, `assetExists` : une lecture indexée, même filtre de
    visibilité que la page).
  Les pages d’entité (marque, agence, marché, secteur, année, victoire, dimension) n’existent
  qu’après lecture de toute la bibliothèque : elles répondent sans squelette, plutôt que de
  refaire cette lecture à chaque préchargement de lien.
- ADR-0010 : sans la clé, la page d’un dossier privé (fiche, vue analytique, actif, marque,
  agence, marché, secteur, année) répond HTTP 404 exactement comme une adresse inconnue ; avec
  la session, HTTP 200.
- La page introuvable porte le titre « Introuvable » et `noindex, follow`, au lieu du titre
  par défaut et d’un `index, follow` contraire au `noindex` ajouté par Next.
- Une panne de lecture de la fiche ou d’une page d’entité répond HTTP 500 (et non plus 200)
  avec la même page d’erreur lisible ; elle ne devient jamais la page introuvable. Les listes,
  derrière leur squelette, gardent 200 et la page d’erreur. `/admin` redirige par un vrai
  HTTP 307 (observé après correction).
- Tests : `not-found-status.test.ts` (3 cas, garde de structure ; 1 rouge sur `main`) ;
  `production-flow.mjs` éprouve 15 adresses inconnues (tous types de pages) en 404, 11 paires
  privé/inconnu identiques (404, sauf l’image de partage générique) et 7 pages privées lues par
  la session en 200 (rouge sur `main` à la première adresse) ; `test:ui` 26 scénarios (24 verts / 2 rouges sur `main`), dont le
  squelette gardé pendant la navigation vers une liste, une fiche et un actif ; recette Docker
  resserrée (404 pour l’adresse inconnue et le dossier privé, 200 avec la session).

## Espace privé — non publiée (2026-11-12)

Décision du propriétaire, ADR-0010 : un espace privé détenu par UPgraders, lu avec la clé
unique, purgé 24 mois après la dernière modification sauf publication.

- `Reference.visibility` (`public` | `private`), `visibilityChangedAt`, `visibilityChangedBy` ;
  tables `VisibilityChange` (historique) et `PrivatePurgeRun` (comptes seulement). Migration
  `20261112090000_private_space` additive (`ALTER TABLE … ADD COLUMN`) : tous les dossiers
  existants restent publics, aucune ligne réécrite.
- Toute lecture passe par la bibliothèque, portée publique par défaut ; la clé (Bearer ou
  session) l’élargit. Sans clé, un dossier privé n’apparaît dans aucune liste, recherche,
  facette, compte, plan du site, image de partage ni export, et répond comme un slug inconnu.
  Une filiation publique vers un dossier privé est retirée de la lecture publique et de
  l’export. API : `Vary: Authorization, Cookie`, `Cache-Control: private, no-store` avec la clé.
- Admission `?visibility=private` ; un amendement garde la visibilité (409
  `VISIBILITY_CONFLICT` sinon). `POST /api/v1/references/{slug}/visibility` : publication
  revalidée par les règles d’admission (409 `PUBLICATION_REFUSED`), retrait permis ; date et
  canal de la clé enregistrés, `updatedAt` (ETag) conservé.
- Purge de rétention : quotidienne dans le serveur (`ARGOS_PRIVATE_PURGE=off`), route
  `POST /api/admin/private-purge` à mode obligatoire, commande `argos-purge-private --dry-run |
  --purge` dans l’image. Cascade complète, `secure_delete`, dossiers publics jamais touchés.
- Interface : `/admin/prive`, panneau de visibilité de la fiche (session), marque « Privé » dans
  les listes de la session, case « Admettre dans l’espace privé » ; dossier privé `noindex`.
- Corrigé en passant : l’image Open Graph d’une fiche ne se générait jamais (le moteur d’image
  refusait un bloc à plusieurs enfants) ; elle se génère, toujours en portée publique.
- Tests : 14 nouveaux cas unitaires (13 rouges sur `main`) ; recette du serveur construit
  étendue (rouge sur `main` à l’admission privée) ; 25 scénarios Playwright (2 rouges sur `main`) ;
  recette Docker étendue (non exécutée localement, job CI `docker`).

## Clé unique et image du VPS — non publiée (2026-11-11)

Arbitrage 5.8, ADR-0009 : SQLite sur volume et une clé unique d’administration.

- `ARGOS_ADMIN_KEY` remplace `ARGOS_INGEST_API_KEY`, désormais ignorée. Toute
  écriture et toute page ou route `/admin` l’exigent : `Authorization: Bearer`
  (La Fusée) ou session ouverte par `/admin/login`, cookie signé `HttpOnly`,
  `Secure`, `SameSite=Strict`, huit heures, sans la clé. Comparaison à temps
  constant ; une écriture par session doit porter l’`Origin` de la bibliothèque.
  Sans clé configurée, l’administration est fermée ; la lecture et l’API v1
  restent publiques. Codes `ADMIN_UNAUTHORIZED` et `ADMIN_NOT_CONFIGURED`.
- Avant : `/admin/ingest` répondait 200 sans clé ; la clé se saisissait dans le
  formulaire. Après : 303 vers la connexion, formulaire soumis par la session,
  bouton « Fermer la session ». `/admin/ingest` sort du sitemap.
- `Dockerfile` à la racine : serveur *standalone*, utilisateur non root, base sur
  `/data` (refus de démarrer sans volume monté), migrations au démarrage,
  sauvegarde à chaud `argos-backup`. `docker/recette.sh` et job CI `docker`.
- L’aperçu d’un actif affiche sa licence et sa source déclarées, ou leur absence.
- Tests : 13 cas de clé unique (12 rouges sur `main`, avec 2 cas d’accès existants),
  recette du serveur construit étendue à la session, 24 scénarios d’interface
  (17 rouges sur `main`).

## Interface — non publiée (2026-11-11)

- Erreurs lisibles et réessayables dans l’admission (réseau, statut HTTP,
  problèmes du serveur, référence inconnue) ; « Réessayer » de la page d’erreur
  relit la page ; refus d’inscription affiché sur la page ; listes vides dites.
- Lien d’évitement, `<main>`, langue `fr`, focus au titre après navigation,
  focus visible restauré, dialogue d’aperçu qui piège Tab et rend le focus.
- 390 px sans défilement horizontal, en-tête sur deux rangées, commandes
  principales d’au moins 44 px.
- Dates enregistrées affichées ; JSON-LD sans date inventée.
- `npm run test:ui` : 23 scénarios Playwright sur serveur construit, ajoutés à
  la CI build. Lecteur d’écran réel et cibles secondaires restent ouverts.

## 0.2.0 — 2026-10-19

Parcours manuel de référence : lecture canonique, correction avec version attendue,
révision précédente et export du dossier sourcé. Le POST exige le Bearer de la
bibliothèque avant parsing. Les actifs gardent citation et licence ; le contact
privé du chercheur reste absent des exports publics. Une performance non mesurée
reste inconnue, et le lecteur n’invente plus de récit à partir de champs absents.
Les routes de données lisent les nouvelles références après le build.

Validation : 20 tests de contrat, migration peuplée, typage, lint et contrôle du
serveur construit ; usage natif isolé sur une référence publique SPAWT. La release
complète, les consultations privées et le déploiement TPE restent ouverts.


## App 0.1.2 — 2026-10-07

- Aperçus en dialogue natif, recherche/séparateur sémantiques, score accessible
  au clavier et clés stables pour les preuves affichées.
- JSON-LD sans interprétation HTML du texte d'un dossier importé ; recette SSR
  conserve le JSON original et refuse l'injection d'un deuxième script.
- Compteur de recherche non mesuré et forme d'onde décorative retirés.
- Passif lint corrigé sans règle désactivée ni périmètre réduit. Réception native,
  authentification, isolation et revue avant release toujours ouvertes.

## Workers 0.1.1 — 2026-10-07

- Refuse les options inconnues avant le choix du mode et la substitution de
  fixtures à une source vivante indisponible.
- Conserve les observations en cas de collecte partielle et qualifie chaque source.
- Sépare les opérations sous une même ombrelle et conserve les mesures distinctes.
- Dix tests hors réseau/LLM payant et typecheck ; collecte vivante et admission
  canonique non reçues, dépendance au dossier manuel encore en brouillon.

## 0.1.1 — Intégrité du dossier manuel (2026-10-07)

Les citations suivent le dossier transformé. Les axes et métriques conservent
l’URL qu’ils citent ; un index inexistant ou une licence d’actif inconnue est
refusé. Les amendements retirent réellement les champs optionnels supprimés.
Les filiations déclarées sont stockées sans doublon ; une cible absente refuse
toute l’écriture. Une collision du slug tronqué ne remplace plus une autre
opération. Le contact du chercheur reste privé dans la projection publique.

Le chargement du corpus préserve les dossiers et annotations présents, au lieu
de supprimer la base. La normalisation des slugs est partagée avec la recherche.
Onze tests sur base jetable passent ; build sur base vide et typecheck reçus.

Cette correction ne reçoit pas l’authentification, les consultations privées,
l’interface hydratée ni la boucle de résultat. Le lint complet reste rouge sur
un passif reproduit au commit initial : 28 erreurs avant, 26 après, aucune
nouvelle erreur. La revue et les portes de release restent obligatoires.
