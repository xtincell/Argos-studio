# Administration par clé unique et image du VPS (11 novembre 2026)

Point AR3 du programme, après l’arbitrage 5.8 (SQLite sur volume, clé unique ;
[ADR-0009](decisions/0009-vps-sqlite-cle-unique.md)). Aucun modèle Prisma, aucune
migration, aucun fournisseur ajoutés ; aucune base opérateur touchée, aucun déploiement.

1. **Authentifier et autoriser.** Livré. `ARGOS_ADMIN_KEY` (24 caractères au moins)
   est exigée par toute écriture et par toute page ou route d’administration :
   en-tête `Authorization: Bearer` pour un client serveur, ou session de navigateur
   ouverte par `/admin/login` (cookie signé `HttpOnly`, `Secure`, `SameSite=Strict`,
   huit heures, qui ne contient pas la clé). Comparaison à temps constant ; écriture
   par session refusée sans `Origin` de la bibliothèque ; sans clé configurée,
   administration fermée (503, pages renvoyées à la connexion). Avant : sur `main`,
   `/admin/ingest` répondait 200 sans clé et rendait le formulaire. Après : 303 vers
   `/admin/login` par le middleware, puis contrôle dans la page elle-même. Un test
   statique échoue si une route d’écriture ou une page `/admin` oublie la garde.
   La lecture, la recherche et l’API v1 lues par La Fusée restent publiques, avec le
   même corps 404 `{ ok: false, error: "NOT_FOUND" }`.
2. **Espace privé.** Non construit : il demande des décisions de conception (voir
   ci-dessous). Aujourd’hui `ConsultationRecord` n’a ni écrivain, ni lecteur, ni route :
   rien de privé n’est stocké ni exposé.
3. **Preuve ou licence par actif.** Déjà livré en 0.2.0 et vérifié : `sourceIndex` et
   `sourceLicense` facultatifs par actif, `unknown` refusé, rien n’est déduit pour un
   actif sans citation. Ajout : l’aperçu d’un actif (fiche et prévisualisation
   d’admission) affiche « Licence déclarée » et « Source de l’actif », ou « À qualifier »
   et « À documenter », comme la page d’actif.
4. **Amendement concurrent.** Déjà livré en 0.2.0 et vérifié : modifier une référence
   existante exige `If-Match` avec sa version (`ETag` de `?format=dossier`) ; une
   version périmée reçoit 409 et l’écriture conditionnelle refuse un changement survenu
   entre lecture et écriture. Le descripteur `GET /api/v1/ingest/dossier` le dit. Côté
   La Fusée, l’envoi sans `If-Match` (F14) reste à corriger dans ADVE-project.

Recettes, toutes rouges sur `main` puis vertes sur la branche :

- `npm test` : 39 tests, dont 13 nouveaux sur la clé unique ; sur `main`, 14 rouges :
  12 des nouveaux (le treizième — la lecture publique reste publique — vert des deux
  côtés) et les 2 cas d’accès existants lus avec la nouvelle variable.
- `node tests/production-flow.mjs` sur le serveur construit : connexion refusée puis
  ouverte, attributs du cookie, page d’administration 303 puis 200, écriture par session
  201, sans `Origin` 403, fermeture de session, lectures publiques 200.
- `npm run test:ui` : 24 scénarios Playwright, dont un parcours de connexion réel
  (17 rouges sur `main`).
- `docker/recette.sh` sur l’image (job CI `docker`) : lecture 200, écritures 401, admission
  201 par la clé, session, base en 600 sur le volume, fiche conservée après redémarrage et
  dans un nouveau conteneur, sauvegarde à chaud puis restauration sur un volume neuf,
  administration fermée sans clé, démarrage refusé sans volume, aucun secret dans l’image.

## Espace privé : ce qui manque pour le construire

L’ADR-0006 (point 3) annonce un namespace privé pour les consultations de La Fusée ;
SHK-0002 dit à l’inverse que La Fusée porte le contexte privé de la marque. Avant tout
code, il faut trancher :

- **Faut-il un espace privé dans Argos ?** Si les briefs restent dans La Fusée, Argos n’a
  rien de privé à garder et `ConsultationRecord` (dont `briefJson`) doit être retiré ou
  réduit à des identifiants opaques.
- **Le titulaire de l’espace** : l’instance La Fusée entière, chacune de ses marques, ou un
  client d’UPgraders. C’est la valeur de l’`org_id` absent du modèle.
- **Son accès** : la clé unique donne tout ; un espace privé demande un secret par titulaire
  (clés hachées en base, rotation, révocation) ou un jeton signé par La Fusée. Aucun des
  deux n’existe.
- **Ses données** : quels champs, quelle durée de conservation, quelle purge et quel droit à
  l’effacement (ADR-0006, point 5). La base et ses sauvegardes `argos-backup` sont un seul
  fichier : un espace privé y voyagerait avec la bibliothèque publique.
- **Ses lecteurs** : aucune route ni page ne lit ou n’écrit `ConsultationRecord`
  aujourd’hui ; la frontière public/privé n’a donc pas encore de test d’isolation possible.

Restent aussi ouverts : une seule identité (la clé) sans journal de qui a admis quoi, une
session qui ne se révoque qu’en changeant la clé, le déploiement réel sur le VPS, la
variable `ARGOS_STUDIO_URL` côté La Fusée et la redirection des anciens liens `/argos/…`.

---

# Interface — erreurs, clavier, mobile et fraîcheur (11 novembre 2026)

Point AR4 du programme, borné à l’interface existante : aucune page, route ou
modèle de données ajouté, aucun appel payant, aucune base opérateur.

- Erreurs : le formulaire d’admission annonce le chargement du dossier courant,
  de l’exemple et du modèle, puis décrit chaque échec (coupure réseau, statut
  HTTP d’une passerelle non JSON, problèmes renvoyés par le serveur) avec
  « Réessayer » quand un nouvel essai peut aboutir. Une référence inconnue est
  dite absente ; un corps d’erreur ne devient plus le dossier saisi. La page
  d’erreur relit réellement la page : « Réessayer » ne réaffichait que l’échec.
  Une adresse refusée par l’inscription revient sur la page au lieu d’un JSON
  brut. /works et l’accueil sans dossier disent « vide », distinct de la panne.
- Clavier et focus : lien d’évitement, `<main>`, langue `fr`, focus porté au
  titre après une navigation client, focus visible sur les champs de recherche,
  l’adresse et les boutons du formulaire. L’aperçu d’actif garde Tab dans le
  dialogue, se ferme par Échap et rend le focus à sa vignette. Les modes de
  recherche et les vues d’une fiche sont des liens marqués `aria-current`, plus
  de faux onglets ARIA.
- Mobile : à 390 px, 29 routes sans défilement horizontal ni masquage par
  `overflow` sur `html`/`body` ; en-tête sur deux rangées ; commandes principales
  d’au moins 44 px (en-tête, recherches, vues et actions d’une fiche, formulaire
  d’admission, inscription, 404).
- Fraîcheur : les dates enregistrées sont affichées en `<time>` (dossier
  documenté, mise à jour, consultation et publication des sources, mesure ;
  dernière mise à jour sur l’accueil). Le JSON-LD reprend `updatedAt` et la date
  de recherche ; il ne fabrique plus la date du jour ni un 1er janvier.

Recette : `npm run test:ui`, 23 scénarios Playwright (Chromium) sur le serveur
construit et sa propre base SQLite, hôtes externes bloqués. Sur `main`
(`aa90b46`) 22 échouent, le 23ᵉ étant l’admission du corpus ; sur la branche
les 23 passent. Six tests unitaires ajoutés à `npm test` (26 au total). Captures
390/1280 px examinées localement, conservées hors dépôt.

Restent ouverts : cibles secondaires sous 44 px (facettes 29 px, filtres de
l’accueil 33 px, liens dans le texte), lecteur d’écran réel et appareils
physiques non reçus, images et médias distants en échec non traités, dates
absentes des cartes de liste, mouvement réduit non traité. Le formulaire
d’inscription reste un bouchon qui annonce un enregistrement sans backend.

---

# Parcours manuel 0.2.0 — 19 octobre 2026

Le gros œuvre manuel est exercé sur un serveur construit et une base isolée :
admettre une référence SPAWT publique, retrouver ses deux actifs, consulter leurs
sources, modifier le dossier canonique et le réexporter. Aucun brief client
privé, fournisseur de modèle ou agent permanent n’entre dans cette recette.
Les constats du 7 octobre conservés ci-dessous sont historiques.

- Le même transformateur retourne un composite inconnu sans métrique ni note
  explicite ; une note déclarée de zéro reste zéro. Les vues indiquent l’absence.
- Le writer transactionnel conserve citation/licence par actif, dossier canonique
  et révision précédente. `updatedAt` est monotone ; refus de version et rejeu
  n’écrasent pas le travail courant. Export public sans contact privé du chercheur.
- Le POST reprend le contrat Bearer déjà attendu par La Fusée. Il refuse l’accès
  avant lecture du corps. Un serveur sans clé d’admission refuse les écritures.
- Le lecteur reçoit les données actuelles à la requête. Le premier essai construit
  avait admis la référence puis renvoyé500 à son ouverture (`DYNAMIC_SERVER_USAGE`).
  Les producteurs SSG de données sont retirés au profit de lectures dynamiques.
- La fiche ne complète plus les champs absents par des paragraphes de démonstration
  sur le casting, la causalité ou la réussite commerciale.

La validation locale comprend vingt scénarios TypeScript/Node, dont une migration
SQLite sur corpus peuplé. Un
contrôle supplémentaire démarre le serveur construit sur une base neuve, admet
après le build, ouvre et modifie la fiche, vérifie sa fraîcheur et refuse un
amendement périmé. Les tests n’appellent aucun fournisseur. La CI lance ce même
contrôle après son build. Les captures et reçus natifs restent dans la réception
du programme Shinkiro.

La lecture publique et la curation par clé ne constituent pas une identité
multi-entreprise. Auth.js, `org_id` des consultations privées, mandats, droits de
réemploi, dérivations entre actifs de références distinctes et exploitation TPE
restent ouverts. Impression navigateur et réutilisation par chaque destinataire
sont distinctes de l’export JSON reçu. Aucun accord ou validation de marque créé.

---

# Réception du dossier manuel — 2026-10-07

Le fonds canonique d’Argos conserve une opération, ses actifs, les preuves de
son analyse et ses filiations. La Fusée porte la gouvernance de son usage dans
une marque ; sa projection HTTPS existante ne doit pas recréer cette bibliothèque.
Le contrat research-dossier-v1 reste la voie d’entrée manuelle, sans appel LLM.

`cd app && npm test` crée sa propre base SQLite dans un répertoire temporaire,
applique la migration puis supprime uniquement cette base en fin de test.
Aucune base fournie par l’opérateur, aucun fournisseur vivant et aucun brief
client ne sont utilisés. Onze scénarios vérifient provenance, licences, sources,
amendements, filiation/rejeu/rollback, confidentialité du DTO, seed conservateur,
collision d’identité et recherche HTTP. Les défauts principaux ont été reproduits
avant correction. Un build sur base vide et le typecheck réussissent également.

Le seed complète le corpus absent. Pour corriger un dossier existant, utiliser
l’admission manuelle ; le seed ne remplace plus les corrections ou annotations
opérateur. `db:reset` reste une commande destructrice explicite, à ne pas employer
pour reprendre un corpus existant. Aucun reset utilisateur n’a été exécuté.

Une filiation manuelle doit viser une référence existante distincte. Une cible
absente refuse le dossier et ses enfants en 422. Le retrait d’une filiation
partagée n’est pas déduit d’une omission : la propriété des liens doit être
qualifiée avant une correction qui pourrait effacer la lecture d’un autre dossier.

Conditions encore ouvertes avant release :

- Authentifier et autoriser l’ingestion ; le POST et la page admin actuels n’ont
  pas de garde. La connexion et le modèle User sont encore du bootstrap.
- Recevoir la séparation des consultations privées déclarée par l’ADR-0006.
  ConsultationRecord ne porte pas encore le namespace org_id annoncé.
- Conserver la source et la licence par actif, et la version attendue d’un
  amendement concurrent ; ne pas combler ces absences par une inférence.
- Qualifier les composites sans métrique et la démonstration dans les vues.
- Recevoir l’interface hydratée, ses erreurs, ses corrections et sa fraîcheur.
- Recevoir la projection Fusée vers le studio, la lecture canonique et le retour
  des résultats. PASS local n’est pas un reçu de publication distante.
- Fermer le lint complet : passif de 28 erreurs au commit initial, 26 après ce
  lot. Une correction suivante le ferme localement sans réduire le scan ni
  affaiblir une règle ; revue et CI du lot intégré restent nécessaires.

Réception locale 0.1.2 : quatorze tests, dont rendu SSR d'un texte de dossier
contenant un terminateur de script. Le JSON-LD reste un seul script de données,
sans élément injecté, et retrouve le contenu original à la lecture JSON.
Les aperçus utilisent le dialogue natif, les recherches et séparateurs leur
sémantique HTML, les mesures des clés stables par preuve. Le faux compteur
de recherche et la forme d'onde décorative sont retirés. Typecheck, build sur
base vide et lint complet passent localement ; CI du commit à recevoir.
Hydratation, focus, clavier et mobile restent non reçus par une recette SSR.

La correction ne vaut pas réception intégrale des quatre parcours Argos.
