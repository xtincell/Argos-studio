# Changelog Argos

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
