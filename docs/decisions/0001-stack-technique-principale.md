# ADR-0001: Stack technique principale

Date: 2026-05-12
Status: Accepted
Decision-makers: Daedalus, Hephaistos

## Contexte

Argos est un produit dual-face (web public éditorial + API/MCP programmatique) qui exige :
- SEO solide (SSR systématique sur la face publique)
- API typée bout-en-bout pour éviter les erreurs de drift entre client et serveur
- Recherche vectorielle (pgvector) pour similarité de références
- Pipeline d'ingestion asynchrone (workers découplés)
- MCP server hébergeable simplement

Le founder est familier avec l'écosystème Vercel + Next.js depuis La Fusée. Le premier hire (Hephaistos) doit pouvoir contribuer sans courbe d'apprentissage stack inconnu.

## Options considérées

### Option A — Next.js + tRPC + Prisma + PostgreSQL/pgvector + TypeScript
- Pros : SSR natif, App Router moderne, écosystème mature, type safety end-to-end, hire pool large, déploiement Vercel one-click
- Cons : Vendor lock-in léger sur Vercel
- Effort : faible (stack canonique)
- Coût : faible

### Option B — Remix + GraphQL + Prisma + PostgreSQL
- Pros : Remix excellent pour les data flows, GraphQL flexible
- Cons : Écosystème plus restreint, GraphQL overhead pour MVP, hire pool plus étroit
- Effort : moyen
- Coût : faible

### Option C — Astro (front) + Hono (API) + Drizzle + PostgreSQL
- Pros : Astro très performant pour les pages éditoriales statiques, Hono très léger
- Cons : Stack hétérogène, complexité de maintenance multipliée, écosystème moins mature pour SaaS B2B
- Effort : élevé (intégration multiple)
- Coût : faible mais maintenance plus chère

### Option D — Django + HTMX + PostgreSQL
- Pros : Stack monolithique simple, productivité backend forte
- Cons : Pas TypeScript, type safety dégradée, hire pool TypeScript >> Python pour SaaS front-end éditorial
- Effort : moyen (apprentissage Django si pas familier)
- Coût : faible

## Décision

Stack retenue : **Next.js 15 (App Router) + tRPC v11 + Prisma 6 + PostgreSQL 15 + pgvector + TypeScript strict**, déployée sur Vercel pour le web et Neon pour la DB.

## Rationale

Critères qui ont tranché :
1. **Type safety end-to-end** : tRPC élimine la classe entière de bugs liés au drift client/serveur. Pour un produit dual-face avec API publique, c'est un multiplicateur de qualité.
2. **SSR natif premium** : Next.js App Router avec React Server Components donne le meilleur SEO du marché pour les pages éditoriales (chaque fiche référence = page indexée = moat).
3. **Familiarité founder + hire pool** : stack canonique = vélocité immédiate, onboarding < 2 jours pour un senior.
4. **pgvector mature** : Neon supporte pgvector nativement, plus de friction qu'avec Pinecone/Weaviate externes.
5. **Vendor lock-in acceptable** : Vercel reste portable (Next.js peut tourner ailleurs), Neon expose PostgreSQL standard.

## Conséquences

**Positives :**
- Vélocité de dev maximale
- Type safety bout-en-bout
- SEO optimisé natif
- Deploy ergonomique

**Négatives :**
- Coût Vercel Pro plan à scale (compensé par productivité)
- Couplage avec React écosystème (limitations possibles si on veut autre framework UI plus tard)

**Neutres :**
- pnpm workspaces + Turborepo pour le monorepo (standard de fait)

## Suivi

- À revoir si : coût infra > 8000 USD/mois (signal de scale qui change l'équation) OU vendor lock-in devient bloquant pour un partenariat
- Métrique watch : deploy frequency (objectif ≥ 1/jour ouvré), lead time commit→prod (< 2h), Lighthouse score (> 90)

## Liens

- `docs/architecture.md`
- PRD §13
