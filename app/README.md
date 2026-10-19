# Argos Web

## Parcours manuel 0.2.0 — 19 octobre 2026

L’application possède une bibliothèque Prisma/SQLite, des routes REST v1 et une
admission JSON manuelle. Les lectures utilisent la base ; les fixtures ne sont
pas une preuve de campagne collectée aujourd’hui. Les sections de bootstrap
ci-dessous sont historiques : elles ne décrivent pas l’architecture intégralement.
Les écritures exigent la clé d’admission de cette bibliothèque. Les comptes Auth.js, le serveur MCP et les consultations privées restent ouverts.
Voir [la réception d’intégrité](../docs/RECEPTION-INTEGRITE.md) et le changelog.

Pour une base locale neuve, fournir `DATABASE_URL` à Prisma, appliquer
`npx prisma migrate deploy`, puis utiliser `npm run db:seed` pour compléter le
corpus. Le seed préserve le travail existant. Ne pas utiliser `db:reset` pour
reprendre une base. `npm test` crée sa propre base jetable et n’utilise pas
la base configurée par l’opérateur.

Next.js application for Argos — face publique (moteur de recherche éditorial) + console expert + API REST + MCP server.

## Stack

- **Framework** : Next.js 15 (App Router) + React 19
- **Language** : TypeScript 5.7 strict mode
- **Styling** : Tailwind CSS 3.4 + design tokens CSS vars
- **UI primitives** : Custom + Radix UI primitives + Lucide icons
- **Animations** : Framer Motion (subtle only)
- **State** : React Server Components + tRPC (post-bootstrap)
- **Database** : Prisma 6 + PostgreSQL + pgvector (post-bootstrap)
- **Auth** : Auth.js v5 (post-bootstrap)
- **Lint / Format** : Biome

## Local setup

Node 22 pour les tests et la réception. Works with `npm` (ships with Node) or `pnpm` (preferred but optional).

```bash
npm ci
cp .env.example .env
# Définir ARGOS_INGEST_API_KEY (24 caractères minimum) ; les clés LLM ne sont pas requises.
# Exemple SQLite neuf : créer le fichier absent, sans toucher à une base existante.
node -e "const fs=require('node:fs');if(!fs.existsSync('prisma/dev.db'))fs.writeFileSync('prisma/dev.db','',{flag:'wx',mode:0o600})"
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Install pnpm later** (optional): `corepack enable pnpm` (might need `sudo`), or `brew install pnpm`. The repo conventions mention pnpm; it's faster and disk-efficient at scale, but npm is fine for getting started.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run dev server with Turbopack on `:3000` |
| `npm run build` | Production build |
| `npm start` | Run production build locally |
| `npm run lint` | Lint code with Biome |
| `npm run format` | Format code with Biome |
| `npm run check` | Run all Biome checks |
| `npm run typecheck` | TypeScript check without emit |

## Structure

```
app/
├── src/
│   ├── app/             # Routes (App Router)
│   │   ├── (public)/    # Public pages (SEO-indexed)
│   │   ├── (auth)/      # Sign in/up
│   │   ├── (app)/       # Authenticated user app
│   │   ├── (admin)/     # Admin console (post-bootstrap)
│   │   ├── api/         # API routes (post-bootstrap)
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/          # Primitives (button, input, card, ...)
│   │   └── *.tsx        # Feature components
│   ├── lib/
│   │   ├── utils.ts     # cn() helper, etc.
│   │   ├── types.ts     # Shared types
│   │   └── format.ts    # Formatting helpers
│   └── data/            # Mock data (replaced by Prisma queries in real deploys)
├── public/              # Static assets
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── biome.json
```

## What's bootstrapped vs. what's not

**Bootstrapped (this commit)** :
- Routes : landing, search, reference detail (`/work/[slug]`), sector page, pricing
- UI primitives : Button, Input, Badge, Card, Separator, Tag
- Feature components : SearchBar, ReferenceCard, FilterSidebar, ReferenceDetailView, AxisBadge, SiteHeader, SiteFooter, Logo
- Design system : tokens, dark mode default, vermilion accent
- Mock data for dev (10 sample references in `src/data/mock-references.ts`)

**Not yet (next sprints)** :
- Prisma schema + migrations + seed
- tRPC routers + business services
- Auth.js setup
- Admin console
- API REST v1
- MCP server endpoint
- Real search (full-text + vector)
- Workers (crawlers, extraction)

## Conventions

See [`../docs/conventions.md`](../docs/conventions.md).

## Owner

Hephaistos (Tech Lead). For issues, see GitHub Issues or Linear `ARG-*`.

## Admission, correction et remise

Le formulaire lit un fichier `research-dossier-v1`, affiche sa prévisualisation,
puis soumet avec la clé conservée en mémoire dans cet écran. Une clé absente
côté serveur refuse les écritures (503), une clé incorrecte reçoit 401 ; les
lectures publiques ne donnent pas accès aux consultations privées.

Depuis une fiche, « Modifier le dossier » recharge le dossier canonique et son
ETag. Un amendement différent exige `If-Match`; une version périmée reçoit409.
Un rejeu identique conserve la version. La révision précédente est retenue dans
la transaction ; le contact privé du chercheur est conservé côté serveur et
retiré du dossier JSON public. Les citations et licences restent attachées à
chaque actif lorsqu’elles sont renseignées.

Le composite peut être `null`. Sans note fournie et sans métrique, la confiance
éditoriale ne devient pas une performance. Les anciennes notes gardent le
marquage `legacy-unqualified` ; elles ne sont pas recalculées par la migration.
Le lecteur restitue les champs présents, les actifs et les absences ; il n’ajoute
aucun récit de production ou résultat commercial. Les vues de données sont
lues à la requête, pour retrouver un dépôt ou une correction après le build.

```bash
npm test                    # 20 scénarios, bases jetables et migration incluse
npm run typecheck
npm run lint
npm run build
node tests/production-flow.mjs  # serveur construit + base séparée, aucun fournisseur
```

L’installation TPE, les sessions d’utilisateurs, la séparation des consultations
privées, les droits de réemploi et les dérivations d’actifs entre références
restent à recevoir avant la release complète. Aucun déploiement public ou
consentement client n’est déduit de la réception locale.
