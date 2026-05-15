# Argos — Product Requirements Document (PRD)

> **Status**: Living document. Updated in the PR that ships a feature.
> **Owner**: Daedalus (Product Architect)
> **Last reviewed**: 2026-05-12

Ce document est le contrat de référence que tous les personas suivent. Il ne décrit pas la philosophie d'Argos (voir `personas/README.md`) ni l'architecture technique (voir `architecture.md`). Il décrit **ce qui doit exister, pour qui, à quel niveau de qualité, et dans quel ordre**.

---

## 1. Mission

Argos est un répertoire qualifié de campagnes marketing exploitable sous deux formes :
- **Une face publique** (moteur de recherche éditorial) destinée aux directeurs artistiques, planners, copywriters, students, journalistes industrie, marketers en marque
- **Une face programmatique** (REST API v1) destinée aux plateformes et applications tierces qui consomment la bibliothèque (MCP server post-v1, sans LLM-coupling au stockage)

L'objectif chiffré à 36 mois : 80 000 références qualifiées indexées avec couverture profonde des marchés africains, francophones, et émergents.

## 2. Audiences cibles

### 2.1 Face publique

**Persona A — Senior Creative (DA, Copywriter, Creative Director)**
- 30-50 ans, agence créative ou marque, francophone ou anglophone
- Cherche : références pour pitch, inspiration calibrée par contexte (catégoriel, géo, période), validation d'un parti pris créatif
- Critère d'achat : crédibilité éditoriale, profondeur de couverture sur son marché
- Disposé à payer : 49-99 USD/mois individuel, 299-799 USD/mois pour son équipe

**Persona B — Strategic Planner / Brand Strategist**
- 28-45 ans, agence ou consultance, focus stratégie de marque
- Cherche : analyses de patterns, trajectoires émergentes, benchmarks catégoriels avec données performance
- Critère d'achat : profondeur taxonomique, analyses originales, capacité à backer des recommandations clients
- Disposé à payer : 99 USD/mois individuel, 799 USD/mois équipe

**Persona C — Agency Founder / Creative Director Mid-Sized Agency**
- 35-55 ans, agence 5-50 personnes
- Cherche : outil interne pour son équipe, capable d'être utilisé en pitch client, embed widgets dans decks
- Critère d'achat : ROI par seat, white-label optionnel, API pour intégrations
- Disposé à payer : 1500-5000 USD/mois (Agency tier)

**Persona D — Brand Marketing Lead / CMO**
- 35-55 ans, marque mid-large
- Cherche : visibilité catégorielle, monitoring concurrentiel, intelligence stratégique
- Critère d'achat : couverture de sa catégorie, alertes brand watch, integrations
- Disposé à payer : 5000-25000 USD/mois (Enterprise tier)

**Persona E — Student / Junior Creative**
- 20-30 ans, école ou junior agence
- Cherche : exploration, learning, inspiration
- Tier gratuit, conversion future en payant à mesure que la carrière avance
- Génère du trafic SEO et du WOM, levier d'authority brand

### 2.2 Face programmatique

**Persona F — AI Agent System (ex: Artemis dans La Fusée)**
- Consomme via MCP server
- Cherche : consultations procédurales 8-phases pour enrichir des briefs créatifs
- Critère d'achat : latence, qualité des références retournées, traçabilité

**Persona G — Third-party tool integration (Figma, Notion, etc.)**
- Consomme via API REST
- Cherche : embed de fiches référence dans contextes externes
- Critère d'achat : API documentée, SLA, rate limits raisonnables

## 3. Principes produit

Sept principes qui arbitrent quand un trade-off se présente.

0. **La référence EST son bundle d'outputs.** Une marque ne livre jamais "une pub". Elle livre une tagline, un KV, un TVC, des déclinaisons OOH, des cuts social, parfois un manifesto, un jingle, une activation, un presskit. Argos indexe chaque référence comme **bundle d'assets** typés par leur **fonction marketing** (TAGLINE, KEY_VISUAL, TVC, OOH_BILLBOARD, REEL, MANIFESTO, JINGLE, PACKAGING, etc. — 47 fonctions, voir `app/src/lib/types.ts` `AssetFunction`). C'est cette complétude qui rend Argos utile pour les DAs et planners : ils consultent un livrable complet, pas une vignette.

1. **Density over breadth.** Mieux vaut 5000 références bien qualifiées que 50000 mal classées. La taxonomie complète (22 axes structurels, sous-schémas substance par medium, signaux performance, **47 fonctions d'asset**) est appliquée à chaque référence ou la référence n'entre pas.

2. **Editorial over algorithmic.** v1 is fully manual : researchers (and Calliope) ingest dossiers as JSON via `/admin/ingest`. There is **no LLM-assisted extraction** in v1, no auto-classification, no vector embeddings. The editorial team owns every reference end-to-end. Argos is a curated library, not an indexed dump.

3. **Africa and francophonie first.** Les marchés sous-couverts sont l'opportunité unique. Si un trade-off oppose couverture Afrique vs couverture US/EU, Afrique gagne en année 1-2.

4. **Public surface as moat.** Chaque fiche publique est une page indexée Google qui construit l'autorité SEO. Le tier gratuit n'est pas une concession marketing, c'est une infrastructure de croissance.

5. **Programmatic accessibility.** Every reference visible in the UI is reachable via the REST API v1 (typed JSON, no LLM dependency). MCP server is post-v1 — when it arrives, it sits on top of the same API surface and doesn't require an LLM at the storage layer.

6. **No dark patterns.** Pas de pricing trompeur, pas de paywall surprise, pas de friction artificielle au churn. La marque vaut plus que le revenue court-terme.

7. **Transparency on confidence.** Toute donnée affichée à l'utilisateur indique son niveau de confiance (HIGH / MEDIUM / LOW / ESTIMATED). On ne ment pas sur ce qu'on ne sait pas.

## 4. Scope MVP (v1.0) — Launch public

**Définition** : version publique lancée fin de Phase 2 (mois 15 selon roadmap). Décrit exhaustivement ce qui doit exister à ce moment-là.

### 4.1 Face publique — Pages et flows

**4.1.1 Landing page (`/`)**
- Champ de recherche central avec suggestions
- 3-5 exemples de recherches cliquables sous le champ
- Stats live (count de références indexées, marchés couverts, last update)
- Navigation header : Browse, Pricing, About, Sign in
- Pas de marketing fluff — le produit fait sa démo
- Performance : Lighthouse > 90, LCP < 1.5s

**4.1.2 Search results (`/search?q=...`)**
- Layout 3 colonnes : filtres / results / contextual insights
- Filtres facettés avec count par option : sector, market, year, pattern_kind, manipulation_mode, victory_type, agency, brand
- Vue grid ou list (toggle), default = grid
- Infinite scroll (chargement par batch de 24)
- État vide éditorialisé si zéro résultats
- Possibilité de sauvegarder la recherche (Pro+ only)
- URL stable et partageable (les filtres sont dans l'URL)

**4.1.3 Reference detail (`/work/[slug]`)**
- Hero media (image ou vidéo embed)
- Marque + agence + secteur + marché + année + awards en badges
- Section Substance : axes substance interprétés
- Section Performance : awards, longevity, cultural penetration
- Section Filiations : références inspirantes + inspirées (graph visuel)
- Section Trajectoire : où la référence se situe dans le pattern
- Section Analyses secondaires : extraits press / jury rationale
- Section Expert annotations (si présentes)
- Section Related references (similarité vectorielle)
- Section Métadonnées (source, date extraction, confidence)
- OG image générée dynamiquement pour partage social
- Structured data JSON-LD (schema.org CreativeWork)

**4.1.4 Category pages (SEO assets)**
- `/sector/[slug]` (ex: `/sector/banking`)
- `/market/[slug]` (ex: `/market/nigeria`)
- `/agency/[slug]` (ex: `/agency/wieden-kennedy`)
- `/brand/[slug]` (ex: `/brand/nike`)
- `/year/[year]` (ex: `/year/2024`)
- `/award/[slug]` (ex: `/award/cannes-lions-2023`)

Chaque page contient :
- Title + meta description unique (auto-générés par template intelligent + override éditorial possible)
- Stats catégorielles (count, top brands, top patterns, trajectory phase courante)
- Liste paginée des references de la catégorie
- 2-3 paragraphes éditoriaux (auto-générés au démarrage, ré-éditorialisés progressivement par Calliope)

**4.1.5 Pricing (`/pricing`)**
- 4 tiers visibles : Free, Pro Individual, Pro Team, Agency
- Pricing Enterprise = "Contact us"
- Comparaison feature-par-feature
- CTA principal : Start Free
- FAQ pricing

**4.1.6 Authentication (`/sign-in`, `/sign-up`)**
- OAuth Google (préféré)
- Magic link email (fallback)
- Email password explicitement non supporté (réduit la surface support)
- Onboarding 3 étapes après signup : (1) rôle/usage, (2) intérêts secteurs, (3) première recherche guidée

**4.1.7 User workspace (`/dashboard`)**
- Mes boards (collections de références sauvegardées)
- Mes consultations (Pro+ only)
- Mes recherches sauvées (Pro+ only)
- Mes alertes (Pro Team+ only)
- Mes paramètres (compte, billing, notifications)

### 4.2 Console expert (face interne pour personas + admin)

**4.2.1 Annotation queue (`/admin/queue`)**
- Liste des references en `requires_review`
- Interface d'édition champ par champ avec confidence visible
- Bulk actions : approve, reject, reassign
- Filtres : age, source, axe en doute

**4.2.2 Reference editor (`/admin/work/[slug]/edit`)**
- Édition complète d'une reference
- Historique des modifications
- Annotations expertes : create, edit, peer review
- Filiations : édition manuelle + suggestions auto

**4.2.3 Source health dashboard (`/admin/sources`)**
- Liste des sources crawled
- Métriques par source : uptime, volume, accuracy
- Last crawl run details
- Alertes actives

**4.2.4 Trajectories explorer (`/admin/trajectories`)**
- Visualisation des patterns par secteur × marché
- Drill-down par pattern
- Observations historiques
- Forecast émergence

### 4.3 API REST publique

**Endpoints v1.0 (classic, no LLM)**
- `GET /api/v1/references` — paginated list with full filter set
- `GET /api/v1/references/:slug` — detail
- `GET /api/v1/sectors`, `/markets`, `/agencies`, `/brands`, `/years`, `/awards`, `/assets`, `/asset-functions` — entity facets
- `POST /api/v1/ingest/dossier` — manual JSON dossier ingestion

Auth : API key per account, scoped permissions (post-v1).
Rate limits : Free 100/h, Pro 1000/h, Agency 10000/h.
Doc : `/api/v1` (self-describing index).

### 4.4 MCP Server — out of scope for v1

The MCP server and consultation engine (`argos_search_references`, `argos_get_reference`, `argos_consult_for_brief`, etc.) were originally scoped here but require an LLM dependency that we explicitly do not take in v1. Postponed to v2+ once the classic library has been validated commercially and a clear LLM cost/benefit case has been written.

Resources :
- `argos://references/{id}`
- `argos://trajectories/{sig}`
- `argos://consultations/{id}`

Hosting : remote MCP server (HTTP/SSE) sur Vercel ou Railway.

### 4.5 Pipeline d'ingestion

À la sortie de MVP, **7 crawlers en production** :
1. Cannes Lions Archive (priorité 1 — volume + autorité)
2. Loeries Awards (priorité 1 — couverture africaine critique)
3. D&AD Awards (priorité 2)
4. One Show (priorité 2)
5. Effie Awards (priorité 2 — case studies riches en performance data)
6. Pikine + autres festivals francophones (priorité 1 — différenciation)
7. Brand-side social media — 50 marques cibles prioritaires (priorité 1 — fraîcheur)

Volume cible MVP : **8000 references indexées** au launch.

### 4.6 Quality bars (acceptance criteria globales)

- Extraction accuracy globale ≥ 0.85 sur axes critiques (mesuré sur gold-standard set 500 refs)
- Search latency p95 ≤ 300ms
- Consultation latency p95 ≤ 8s
- Lighthouse score pages publiques ≥ 90
- Accessibility : zéro violation critique axe DevTools
- Uptime SLA : 99.5% (Free), 99.9% (Pro+)
- Mobile : pages publiques 100% responsive

## 5. Scope v1.1 (mois 16-18 post-launch)

- Crawler social media étendu (200+ marques surveillées)
- Crawler press editorial (AdAge, Adweek, LBB)
- Brand watch dashboard (Pro Team+)
- Embeddable widgets (Agency+)
- White-label option (Agency+)
- Internationalization : FR comme deuxième langue active (toute la surface publique)
- Newsletter automation
- Pages catégorielles enrichies (analyses originales par Calliope sur les 50 plus visitées)

## 6. Scope v1.2 (mois 19-24)

- PWA mobile pour crowdsourcing OOH terrain (Guilde Matanga)
- Crawler awwwards (digital uniquement, pattern_kind Digital_interaction)
- Personal_brand pattern indexation (Steve Jobs keynotes, etc.)
- Service_signature et Ritual pattern_kinds activés
- Espagnol et portugais langues actives
- Integration officielle Figma (plugin de référence)
- Integration officielle Notion (database sync)

## 7. Out of scope (v1.0-v1.2)

Pour préserver le focus, les éléments suivants sont explicitement out of scope :

- Génération d'assets créatifs (rôle de Ptah dans La Fusée, pas d'Argos)
- Stratégie de marque complète (rôle de Mestor + Artemis, pas d'Argos)
- Mesure de performance d'assets clients produits (rôle de Seshat)
- Gestion de campagnes (Campaign Manager)
- Authentification SSO entreprise complexe (SAML/SCIM) avant Enterprise demand >3 prospects
- Multi-tenant isolation forte (single-tenant suffit pour MVP)
- Authentification email/password (OAuth + magic link uniquement)
- Versions auto-traduites des fiches référence (versions humaines uniquement, multilingue progressif)
- AR/VR exploration des références spatiales (post-v2)
- Vidéo native upload utilisateur (sources externes uniquement)

## 8. User stories (par audience)

### 8.1 Persona A — Senior Creative

**US-A1** — Comme DA, je veux taper "Beer ads Nigeria 2020-2024" et voir les 20 références les plus pertinentes en moins de 5 secondes, pour évaluer le territoire catégoriel avant un pitch.

*Acceptance* :
- Recherche en français ou anglais comprise (NLP léger)
- Filtres pré-appliqués depuis la query (catégorie beer, market Nigeria, années 2020-2024)
- Résultats triés par pertinence (combo embedding similarity + qualified performance signals)
- Possibilité d'ajuster filtres latéralement sans relancer la recherche

**US-A2** — Comme DA, je veux ouvrir une fiche référence et comprendre en 90 secondes le pattern utilisé, son contexte, et pourquoi ça a marché, pour décider si je le cite dans mon deck.

*Acceptance* :
- Fiche détaillée structurée selon principles de lecture en F (above-the-fold informatif)
- Section "Pattern observation" en premier (pas en bas)
- Annotations expertes affichées prominemment quand disponibles
- Performance signals (awards, longevity, cultural penetration) visibles immédiatement

**US-A3** — Comme DA, je veux exporter 5 références dans un PDF brandé Argos avec annotations, pour les insérer dans mon deck client.

*Acceptance* :
- Sélection multiple via boards
- Export PDF un-click avec layout magazine quality
- Watermark Argos discret (renforce brand, mais pas intrusif)
- Limité au tier Pro+

### 8.2 Persona B — Strategic Planner

**US-B1** — Comme planner, je veux comprendre la trajectoire actuelle d'un pattern (ex: "cinematic realism in banking") pour anticiper s'il est en montée ou en saturation.

*Acceptance* :
- Page pattern dédiée avec graphe temporel d'usage
- Phase courante (emerging/rising/peak/plateau/declining) affichée prominemment
- Liste des references qui ont défini le pattern (anchors historiques)
- Prédiction next 12 mois avec confidence interval

**US-B2** — Comme planner, je veux comparer deux marques concurrentes sur leurs choix manipulation_mode et leurs trajectoires pillar pour identifier un white space.

*Acceptance* :
- Vue compare 2-up entre deux brand pages
- Matrice manipulation_mode par marque
- Diff de pillar emphasis
- Recommandations white space dérivées (Pro Team+)

### 8.3 Persona F — AI Agent System

**US-F1** — Comme Artemis dans La Fusée, je veux appeler `argos_consult_for_brief(brief)` et recevoir en moins de 8 secondes une consultation 8-phases complète avec position validée, references-preuves, et contraintes substance pour le brief Ptah.

*Acceptance* :
- Format brief input documenté en JSON Schema
- Output JSON conforme à `ConsultationOutput` schema
- Latency p95 < 8s
- Logs de chaque phase accessibles pour debug
- Tag de calibrage présent pour mesure post-hoc

## 9. Pricing & business model

### 9.1 Tiers

| Tier | Prix USD/mois | Public | Capacités clés |
|---|---|---|---|
| Free | 0 | Students, exploration | Recherche illimitée, 5 fiches détaillées/jour, pas d'export, pas de consultation |
| Pro Individual | 49 (99 si annuel facturé mensuel équivalent) | Freelance DA/planner | Fiches illimitées, filtres avancés, boards, 20 consultations/mois, export PDF |
| Pro Team | 299 (5 seats) puis +59/seat | Studios 5-20 | Tout Pro + boards partagés, annotations équipe, brand watch basique, 100 consultations/mois |
| Agency | 1500-5000 (selon seats + usage) | Agences 20+ | Tout Pro Team + API, embeddable widgets, white-label option, custom crawlers, support prioritaire |
| Enterprise | 5000-25000+ | Marques avec API/MCP intensif | Tout Agency + SLA, integrations custom, account manager, training |

### 9.2 Trial

- Pro Individual : 14 jours trial sans CB demandée (réduit friction signup)
- Pro Team : 30 jours trial avec CB demandée (qualifie l'intent)
- Agency / Enterprise : pilots négociés (1-3 mois)

### 9.3 Discounts

- Annual billing : -16% (équivalent 2 mois gratuits)
- Non-profit : -30% sur Pro
- Education (schools, universities) : -50% sur Pro
- Startup (raised < 2M USD, < 50 employees) : Pro Team à 99 USD/mois pendant 12 mois

### 9.4 Refund policy

- Pro : remboursement intégral 30 jours
- Agency / Enterprise : pro-rata sur mois en cours

## 10. Success metrics (Year 1 post-launch)

| Metric | Target M3 post-launch | Target M12 post-launch |
|---|---|---|
| References indexed | 15 000 | 36 000 |
| Free signups cumul | 5 000 | 50 000 |
| Free MAU | 2 000 | 20 000 |
| Pro Individual paid | 100 | 800 |
| Pro Team paid | 15 | 80 |
| Agency / Enterprise contracts | 2 | 12 |
| MRR | 5 000 USD | 60 000 USD |
| Organic search traffic | 10 000 sessions/mo | 80 000 sessions/mo |
| Newsletter subscribers | 1 500 | 8 000 |
| NPS | > 40 | > 50 |
| Churn monthly (Pro) | < 8% | < 5% |
| Churn monthly (Agency+) | < 2% | < 1% |

## 11. Roadmap timeline

| Phase | Mois | Milestones critiques |
|---|---|---|
| 0 — Foundation | 1-3 | Infra setup, 1 crawler live (Loeries), pipeline LLM accuracy 0.80+, schema Prisma déployé, 500 refs indexées |
| 1 — Massive crawl + dogfooding | 4-9 | 7 crawlers, 8000 refs, La Fusée Artemis beta consommation, console expert UI |
| 2 — Public launch | 10-15 | Face publique launch, SEO baseline, premiers payants, PWA Guilde OOH |
| 3 — Growth + Enterprise | 16-24 | Sales motion Enterprise, partnerships festivals, 25-40k refs |

## 12. Risks et mitigations critiques

| Risk | Probability | Impact | Mitigation owner |
|---|---|---|---|
| Legal scraping awards sources | M | H | Heracles : User-Agent identifié, négociation partenariats Loeries/Pikine en priorité |
| Extraction accuracy hétérogène | M | H | Heracles + Calliope : gold-standard set + audits mensuels + prompt versioning |
| Bias culturel des outils de recherche tiers sur Afrique | H | M | Calliope : glossaires culturels par marché, validation humaine prioritaire refs africaines |
| Goulot crowdsourcing OOH | H | L | Hermes : rémunération attractive + gamification, fallback presse OOH photographique |
| ~~Dépendance API Anthropic~~ | — | — | **DEFERRED. v1 takes no LLM dependency.** |
| ~~Coûts LLM exponentiels~~ | — | — | **DEFERRED. v1 takes no LLM dependency.** |
| Adoption lente face publique | M | H | Hermes : SEO content depuis day 1, partnerships festivals year 1 |
| Concurrent VC-funded entrant | L | H | Tous : execution speed, focus africain comme moat différenciant |

## 13. Décisions architecturales référencées

Pour le détail technique, voir `architecture.md` et les ADRs dans `docs/decisions/`.

ADRs déjà actés au démarrage :
- **ADR-0001** — Stack: Next.js + Prisma + SQLite (dev) / PostgreSQL (prod). pgvector is **deferred** to post-v1.
- **ADR-0002 — DEFERRED** : LLM (Claude) extraction. v1 is fully manual JSON ingestion.
- **ADR-0003 — DEFERRED** : Embeddings (Voyage AI). v1 search is classic full-text + faceted.
- **ADR-0004** — Hosting: Vercel (web) + Railway (workers) + Neon (db) + R2 (storage)
- **ADR-0005** — Auth: Auth.js v5 avec OAuth Google + magic link
- **ADR-0006** — Architecture dual-face stricte (séparation tenant + API-first)
- **ADR-0007** — Taxonomie 22 axes structurels + 14 pattern_kinds verrouillée pour v1

## 14. Annexe — Taxonomie de référence

### 14.1 Pattern kinds (14)
Image, Video, Audio, Text, Spatial, Digital_interaction, Mixed, Brand_system, Performance_live, Editorial_long_form, Object, Service_signature, Personal_brand, Ritual.

### 14.2 Axes structurels (22)
1. Filiation
2. Provocation
3. Auctorialité
4. Récurrence sérielle
5. Décalage culturel
6. Mécanisme cognitif
7. Tempo culturel
8. Valence morale assumée
9. Méta-conscience publicitaire
10. Densité narrative
11. Modalité temporelle assumée
12. Authorship du destinataire
13. Référentialité culturelle hors-pub
14. Capital culturel requis
15. Densité info vs émotion
16. Stratégie de promesse
17. Création vs récupération de mèmes
18. Pattern d'attention
19. Fidélité catégorielle vs hérésie
20. Posture vis-à-vis concurrence
21. Ambiguïté assumée
22. Stratégie marque-personnage

### 14.3 Manipulation modes (4)
Peddler, Dealer, Facilitator, Entertainer.

### 14.4 Pillars (8 — ADVE+)
A (Authenticity), D (Distinction), V (Value), E (Engagement), R (Risk), T (Track), I (Innovation), S (Strategy).

### 14.5 Victory types (14)
Cannes Lions Gold/Silver/Bronze, D&AD Pencil, Effie Gold, Loeries Grand Prix, Pikine Grand Prix, Local Dominance Proven, Viral Reach, Longevity Proven, Cult Status Documented, Commercial Impact Proven, Brand World Door, Competitor Imitated.

## 15. Glossaire

Voir `glossary.md` pour les termes métier (reference, pattern, trajectory, cult-index, etc.).

## 16. Changelog

| Date | Version | Author | Changes |
|---|---|---|---|
| 2026-05-12 | 0.1 | Daedalus | Initial PRD, post-validation architecture dual-face |
