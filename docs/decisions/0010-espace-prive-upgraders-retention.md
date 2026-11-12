# ADR-0010: Espace privé de la bibliothèque, détenu par UPgraders, purgé après 24 mois

Date: 2026-11-12
Status: Accepted
Decision-makers: Founder (Xtincell), décision propriétaire du 12 novembre 2026

## Contexte

L’ADR-0006 (point 3) annonçait un namespace privé pour les consultations de La Fusée ; SHK-0002
place au contraire le contexte privé de la marque dans La Fusée. La réception du 11 novembre
(`docs/RECEPTION-INTEGRITE.md`) a refusé de construire cet espace sans décision sur son
titulaire, son accès, sa durée et sa purge. `ConsultationRecord` n’a toujours ni écrivain ni
lecteur.

## Décision du propriétaire

- **Titulaire** : UPgraders, l’opérateur du studio. Pas un espace par client ni par marque.
- **Accès** : la clé unique d’administration (`ARGOS_ADMIN_KEY`, ADR-0009), en-tête
  `Authorization: Bearer` ou session ouverte par `/admin/login`. Un lecteur anonyme ou public ne
  voit jamais un dossier privé, ni son existence, ni son nombre, ni ses actifs : listes,
  recherche, fiches, API, plan du site, images de partage et exports compris.
- **Rétention** : un dossier privé est purgé 24 mois après sa dernière modification, sauf s’il a
  été rendu public. La purge est explicite et journalisée, a un mode d’aperçu (`dry-run`), supprime
  le dossier et tout ce qui lui appartient, et ne touche jamais un dossier public.
- **Changement de visibilité** : privé → public est une action explicite d’administration, qui
  applique les règles d’admission des dossiers publics ; public → privé est permis à
  l’administration. Qui et quand sont enregistrés.

## Options considérées

### Option A — une visibilité sur `Reference`
- Pros : un seul modèle de dossier, un seul writer, la même validation, la même purge par
  cascade ; aucun nouveau service ni fournisseur.
- Cons : chaque lecture doit porter la portée ; un oubli exposerait un dossier privé.

### Option B — une base ou une table séparée pour l’espace privé
- Pros : isolation physique.
- Cons : deux modèles de dossier à tenir d’accord, une publication qui copie entre bases,
  une seconde sauvegarde ; contraire à SHK-0002 (une bibliothèque).

### Option C — réutiliser `ConsultationRecord`
- Cons : ce modèle décrit un moteur de consultation jamais construit (brief, diagnostic,
  positions) ; il ne porte pas un dossier de référence.

## Décision

**Option A.** `Reference.visibility` (`public` | `private`, défaut `public`), avec
`visibilityChangedAt` et `visibilityChangedBy`, un historique `VisibilityChange` et un journal de
purge `PrivatePurgeRun`. Migration additive : les dossiers existants restent publics.

## Mise en œuvre

- **Lecture.** Toute lecture passe par `app/src/lib/library.ts`, dont la portée par défaut est
  `public` (filtre `visibility = 'public'`, filiations dont l’autre extrémité est privée
  retirées, filiations d’un export public vers une cible non publique retirées). La portée
  `admin` vient seulement de `src/server/read-scope.ts` : Bearer valide ou session ouverte. Une
  clé absente, refusée ou expirée lit comme un anonyme. Le plan du site et l’image Open Graph
  lisent toujours la portée publique. Un test statique refuse tout accès direct à la base depuis
  `src/app`.
- **Réponses.** Un dossier privé lu sans clé répond exactement comme un slug inconnu (même statut,
  mêmes en-têtes, même corps). Les réponses de l’API portent `Vary: Authorization, Cookie` ;
  lues avec la clé, `Cache-Control: private, no-store`. Les pages lues avec la session sont
  rendues par requête (pas de cache partagé) et un dossier privé y est `noindex`.
- **Admission.** `POST /api/v1/ingest/dossier?visibility=private` admet un nouveau dossier dans
  l’espace privé ; sans paramètre, un nouveau dossier est public. Un amendement ou un rejeu
  garde la visibilité enregistrée ; demander l’autre est refusé (409 `VISIBILITY_CONFLICT`).
- **Changement.** `POST /api/v1/references/{slug}/visibility` (clé), JSON
  `{ "visibility": "public" | "private" }` et `If-Match` facultatif, ou formulaire de la fiche.
  La publication revalide le dossier canonique conservé avec `ResearchDossierSchema` ; un dossier
  absent ou refusé reste privé (409 `PUBLICATION_REFUSED`). Le changement garde `updatedAt` (la
  version du contenu, son ETag), enregistre la date et le canal de la clé (`admin-session` ou
  `admin-bearer` : la clé n’a pas d’identité, ADR-0009) sur la référence et dans
  `VisibilityChange`.
- **Rétention.** Dernière modification = la plus tardive de `updatedAt` et
  `visibilityChangedAt` (rendre privé un ancien dossier relance son délai). Échéance = 24 mois
  calendaires plus tard (UTC ; le 29–31 d’un mois plus court devient son dernier jour).
  `purgeExpiredPrivateDossiers` : `dry-run` lit seulement ; `purge` supprime en une transaction
  chaque dossier échu encore privé et inchangé depuis sa lecture (cascade : actifs, axes,
  métriques, sources, annotations, révisions, filiations, historique de visibilité), avec
  `PRAGMA secure_delete`, puis écrit une ligne `PrivatePurgeRun` de comptes seulement (aucun
  slug, titre ou identifiant conservé).
- **Déclencheurs.** Purge quotidienne dans le processus serveur (`src/instrumentation.ts`,
  première exécution cinq minutes après le démarrage), désactivable par
  `ARGOS_PRIVATE_PURGE=off` ; `POST /api/admin/private-purge` avec un mode obligatoire ;
  commande de l’image `argos-purge-private --dry-run | --purge`, qui appelle cette route avec la
  clé du conteneur. Le serveur reste l’unique écrivain du fichier SQLite (ADR-0009).
- **Interface.** `/admin/prive` liste les dossiers privés, leur échéance et les dernières purges ;
  la fiche montre à la session sa visibilité et l’action Publier / Rendre privé ; l’admission
  propose « Admettre dans l’espace privé » pour un nouveau dossier.

## Conséquences

**Positives :**
- Un seul dossier, un seul writer, une seule validation ; publier ne copie rien.
- L’isolation est vérifiée par l’API, les pages construites et le navigateur, contre un slug
  inconnu.

**Négatives :**
- Les fichiers `argos-backup` sont des copies entières de la base : une sauvegarde antérieure à
  une purge conserve les dossiers purgés jusqu’à sa propre suppression. La purge compte ces
  copies et le signale ; leur rotation reste une tâche d’exploitation.
- « Qui » reste un canal de la clé, pas une personne.
- Les actifs sont des URL : Argos n’écrit aucun fichier d’actif sur `/data`, donc la purge n’a
  pas de fichier à supprimer en dehors des lignes de la base.

**Neutres :**
- `ConsultationRecord` reste sans lecteur ni écrivain ; il n’est pas l’espace privé.
- Une page d’adresse inconnue répond HTTP 404 avec la page introuvable de l’application ; un
  dossier privé lu sans la clé répond exactement pareil. L’API répond HTTP 404. (Précisé le
  12 novembre : le statut était 200 tant que le `loading.tsx` racine ouvrait la réponse avant la
  page ; ce chargement a été retiré, voir RECEPTION-INTEGRITE.)

## Suivi

- Nombre de dossiers privés et de purges (`/admin/prive`, `PrivatePurgeRun`).
- Âge de la plus ancienne copie dans `/data/backups` au regard des 24 mois.

## Liens

- ADR-0006 (point 3), remplacé pour l’espace privé par cette décision
- ADR-0009 — VPS, SQLite sur volume et clé unique
- SHK-0002 — Argos : une bibliothèque, deux surfaces
