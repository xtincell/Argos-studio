# Argos

> The world's largest qualified library of marketing campaigns.

Argos est un répertoire éditorial de patterns créatifs gagnants, exploitable comme moteur de recherche public ou via API/MCP pour les systèmes IA.

## Quick start

Requires Node 20+. npm ships with Node; pnpm is optional.

```bash
cd app
npm install         # or: pnpm install
cp .env.example .env.local
npm run dev         # or: pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure du repo

```
argos-finder/
├── README.md (this file)
├── personas/             # Persona definitions (Daedalus, Hephaistos, ...)
│   ├── README.md
│   ├── product-architect.md
│   ├── tech-lead.md
│   ├── crawler-engineer.md
│   ├── ux-ui-designer.md
│   ├── editorial-curator.md
│   └── growth-lead.md
├── docs/                 # Common documentation
│   ├── PRD.md
│   ├── architecture.md
│   ├── conventions.md
│   ├── glossary.md
│   ├── workflows.md
│   └── decisions/        # ADRs
└── app/                  # Next.js web application
    └── README.md
```

## Where to start (by role)

- **Founder / new joiner** : read [`personas/README.md`](personas/README.md), then [`docs/PRD.md`](docs/PRD.md)
- **Product** : [`docs/PRD.md`](docs/PRD.md), [`personas/product-architect.md`](personas/product-architect.md)
- **Engineering** : [`docs/architecture.md`](docs/architecture.md), [`docs/conventions.md`](docs/conventions.md), [`app/README.md`](app/README.md)
- **Design** : [`personas/ux-ui-designer.md`](personas/ux-ui-designer.md)
- **Editorial** : [`personas/editorial-curator.md`](personas/editorial-curator.md), [`docs/glossary.md`](docs/glossary.md)
- **Growth** : [`personas/growth-lead.md`](personas/growth-lead.md)

## Licence et propriété

Argos appartient à [Argos Inc.] (entité légale en cours d'établissement). Tout droit réservé. Pas de licence open-source publique en phase 0-2.

Les références indexées dans Argos sont des œuvres tierces ; Argos détient le copyright de ses propres classifications, annotations, et structure du répertoire.
