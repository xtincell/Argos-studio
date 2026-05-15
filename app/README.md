# Argos Web

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

Requires Node 20+. Works with `npm` (ships with Node) or `pnpm` (preferred but optional).

```bash
npm install         # or: pnpm install
cp .env.example .env.local
# Edit .env.local with your secrets (see comments in the file)
npm run dev         # or: pnpm dev
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
