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
