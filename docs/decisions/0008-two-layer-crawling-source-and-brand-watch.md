# ADR-0008: Two-layer crawling — source crawlers + brand watch agents

Date: 2026-05-12
Status: Accepted
Decision-makers: Founder (Xtincell), Heracles (Crawler Engineer), Daedalus (Product Architect)

## Contexte

L'ingestion d'Argos peut être pensée selon deux modèles opposés :

1. *Source-centric* : un module crawler par source structurée (Cannes Lions, Loeries, AdAge, Adforum, social bulk, etc.). Récolte tout ce que la source publie. Approche standard d'aggregator.
2. *Brand-watch-centric* : un agent par marque prioritisée, qui interroge tous les périmètres pour reconstituer un dossier complet sur cette marque. Approche d'analyste études marchés.

Une discussion produit a remis en question le choix exclusif entre ces deux modèles. La question : pourquoi pas les deux ?

## Options considérées

### Option A — Source-centric uniquement

Un module crawler par source. Pas d'agent par marque.

- Pros : simple, parallélisable, peu coûteux en LLM, découverte de marques inconnues
- Cons : base siloée par source, pas de dossier cohérent par marque, dépendance forte aux sources tiers (paywall/cutoff = risque), moat faible
- Effort : faible
- Coût : faible

### Option B — Brand-watch-centric uniquement

Un agent par marque prioritisée. Interroge tous les périmètres.

- Pros : dossiers défensibles (IP propriétaire), couverture exhaustive sur les marques cibles, gap detection active, moat fort
- Cons : explosion des coûts LLM (re-scrape des mêmes sources pour chaque watch), ne découvre pas l'inattendu, lent à scaler en nombre de marques, réinvente la roue à chaque agent
- Effort : moyen-élevé
- Coût : élevé en LLM

### Option C — Les deux couches (retenue)

Couche 1 source-centric pour le firehose passif + Couche 2 brand-watch-centric pour la curation active. Les deux couches partagent l'output (`RawSourcingResult` → `BrandSignal` → `Reference` + `Asset`) et collaborent.

- Pros : combine les deux avantages — volume + découverte (L1) ET dossiers défensibles (L2) ; coûts maîtrisés ; moat construit progressivement
- Cons : architecture plus complexe à coordonner, nécessite gouvernance claire des priorités entre les deux couches
- Effort : moyen (les deux briques existent, ce qui change c'est l'orchestration)
- Coût : moyen

## Décision

**Option C retenue : architecture à deux couches.**

- *Couche 1 — Source crawlers* : un module par source structurée. Récolte large et automatisée. Output → staging table `RawSourcingResult`. KPIs : volume, accuracy d'extraction, dedup rate, source uptime.
- *Couche 2 — Brand watch agents* : un agent par marque prioritisée. Inputs = `RawSourcingResult` filtrés par marque + queries actives vers les périmètres que la Couche 1 ne touche pas (brand-owned, cultural signal, performance data, crowdsourced field). Output → `BrandSignal`s assemblés en `Reference`s, alimentent le `BrandDossier`. KPIs : `coverageCompletenessPct` par dossier, signal yield, time-to-update, gap-detection rate.

Allocation du temps de Heracles : 40% L1 / 35% L2 / 15% pipeline d'extraction / 10% tech debt.

## Rationale

Trois critères ont tranché :

1. **Moat strategy** : la Couche 2 produit des `BrandDossier`s qui sont des actifs propriétaires non répliquables rapidement par un concurrent. Sans la Couche 2, Argos n'est qu'un WARC moins cher, sans défensibilité à long terme.

2. **Cost discipline** : la Couche 1 fait le travail bulk une fois. Sans la Couche 1, chaque agent Couche 2 devrait re-scraper Cannes Lions pour chaque marque qu'il surveille, ce qui multiplie les coûts LLM par le nombre de watches.

3. **Discovery** : la Couche 1 ingère des marques que personne ne surveille encore. Ces marques peuvent ensuite être promues en Couche 2 si leur activité justifie un watch dédié.

Les trois critères militent pour conserver les deux couches, pas en choisir une.

## Conséquences

**Positives :**

- Base verrouillée et défensible (les dossiers Couche 2 sont des actifs propriétaires)
- Coûts maîtrisés (la Couche 1 amortit le travail bulk)
- Découverte de marques émergentes préservée
- Scaling progressif possible : on peut ajouter des watches Couche 2 brand par brand sans toucher la Couche 1
- Couverture profonde sur les marchés sous-couverts (Afrique, francophonie) parce que les watches Couche 2 ciblent activement ces marques

**Négatives :**

- Architecture plus complexe à coordonner — il faut une orchestration claire entre les deux couches
- Risque de duplication si la coordination est mal faite (une Couche 2 qui ignore la Couche 1 et re-fait son travail)
- Heracles doit maintenir deux types de code et de KPIs

**Neutres :**

- Le pipeline d'extraction LLM est commun aux deux couches — il reçoit indifféremment des inputs L1 ou L2
- Les références finales (`Reference` + `Asset` en DB) sont identiques quelle que soit la couche qui les a alimentées

## Allocation et priorités

| Aspect | Couche 1 | Couche 2 |
|---|---|---|
| Unité d'organisation | Une source | Une marque |
| Posture | Récolte passive | Investigation active |
| Fréquence | Cadence cron par source | Cadence variable par marque (P0 continu, P3 mensuel) |
| KPI principal | Volume + accuracy par source | Coverage completeness par dossier |
| Discovery | Marques inconnues incluses | Marques pré-sélectionnées uniquement |
| Coût LLM par unité | Bas | Haut |
| Moat produit | Faible | Élevé |
| Temps Heracles | 40% | 35% |

## Suivi

- À revoir si : (a) coût LLM mensuel Couche 2 > 50% du budget LLM total avec moins de 100 watches actives, (b) coverage_completeness_pct moyen reste sous 70% sur 6 mois, (c) duplication détectée entre L1 et L2 sur plus de 15% du volume
- Métriques watch : coverage_completeness_pct par dossier, signal_yield_per_watch, gap_count_outstanding, time_to_resolve_gap

## Liens

- `personas/crawler-engineer.md` — section "Architecture à deux couches"
- `docs/architecture.md` — pipeline d'ingestion
- `app/src/lib/types.ts` — `BrandWatch`, `BrandSignal`, `BrandDossier`, `SourcePerimeter`
- PRD §4.5 (pipeline d'ingestion)
