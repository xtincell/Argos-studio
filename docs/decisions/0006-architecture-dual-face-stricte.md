# ADR-0006: Architecture dual-face stricte (séparation tenant + API-first)

Date: 2026-05-12
Status: Accepted
Decision-makers: Founder (Xtincell), Daedalus, Hephaistos

## Contexte

Argos est positionné comme produit dual-face :
- Face A : module consommé par La Fusée (Artemis via MCP) pour enrichir les briefs Ptah
- Face B : moteur de recherche éditorial public consultable par les clients (DAs, planners, marques)

Le choix d'architecture détermine si ces deux faces partagent (a) le même code, (b) la même base de données, (c) le même cycle de release. Trois options structurantes ont été pesées avant cet ADR.

## Options considérées

### Option A — Mono-app strictement dédoublée par environnement
Deux déploiements Next.js du même code, une instance "public-only" et une "internal-only", avec feature flags.
- Pros : code simple, déploiement homogène
- Cons : duplication infra, divergence inévitable des deux faces avec le temps
- Effort : moyen
- Coût : double infra

### Option B — Mono-app unifiée avec API-first et séparation tenant
Une seule app Next.js, business logic en services partagés, surfaces (public web / console expert / REST API / MCP server) toutes branchées sur la même couche métier. Tenant isolation via namespace logique (org_id + scoping).
- Pros : single source of truth, vélocité, pas de duplication
- Cons : nécessite discipline architecturale (pas de logique métier dans les UI), isolation tenant à enforcer correctement
- Effort : moyen
- Coût : faible

### Option C — Microservices séparés par face
Service public (Next.js), service interne La Fusée (Node.js + MCP), workers ingestion (Node.js), tous communiquant via API REST/gRPC.
- Pros : isolation forte, scaling indépendant
- Cons : complexité opérationnelle disproportionnée pour MVP, latence inter-service
- Effort : élevé
- Coût : élevé (infra + maintenance)

## Décision

**Option B retenue : architecture mono-app unifiée avec API-first et séparation tenant logique.**

Contraintes structurantes appliquées :
1. **API-first strict** : pas de logique métier dans les UI. Une seule source de vérité (data + business layer), plusieurs facades (Console expert, public search, MCP server, REST API).
2. **Séparation IP nette** : Argos appartient à une entité juridique distincte de Matanga et UPgraders (préservation des options de sortie).
3. **Tenant isolation logique** : les consultations La Fusée passent par un namespace privé (briefs clients confidentiels). Les références indexées sont publiques (campagnes déjà déployées). Stricte séparation enforced au niveau service.
4. **Pricing enforced** : même pour les clients Matanga, accès Argos payant aux tarifs publics. Si Matanga veut offrir l'accès à un client en bonus, c'est Matanga qui finance.
5. **RGPD compliance day one** : face publique avec utilisateurs européens probables → cookies/consentement/DPA/right-to-delete from scratch.
6. **SEO comme actif core** : la face publique n'est pas une concession marketing, c'est un moat. SSR/structured data/i18n dès le premier déploiement public.

## Rationale

L'option B offre le meilleur ratio (vitesse de delivery / qualité de séparation) pour un projet 0-to-1. Les options A et C sont des optimisations prématurées : A produit de la duplication, C produit de la complexité avant le product-market fit.

Les six contraintes structurantes garantissent que la séparation logique reste forte malgré le partage du code. Si une de ces contraintes devient impraticable, on rouvre cet ADR.

## Conséquences

**Positives :**
- Vélocité maximale en phase 0-1-2
- Source de vérité unique pour les références
- Réutilisation des composants entre public et console expert
- Coût infra minimal

**Négatives :**
- Discipline architecturale exigée (PR review attentif sur séparation tenant)
- Risque de fuite tenant si bug → mitigation par tests d'isolation systématiques

**Neutres :**
- Reste évolutif vers Option C si volume / besoins l'exigent en phase 3+

## Suivi

- À revoir si : (a) latence consultation Artemis > 12s p95 sustained, (b) incident isolation tenant, (c) volume third-party API > 10M req/mois
- Métriques : isolation test pass rate (100% en CI), latence MCP p95, latence search p95

## Liens

- `personas/README.md` section "Architecture dual-face"
- `docs/architecture.md`
- PRD §3 principles
