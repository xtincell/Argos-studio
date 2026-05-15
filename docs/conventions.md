# Conventions — Argos

> **Owner**: Hephaistos (Tech Lead)
> **Status**: Living document.
> **Last reviewed**: 2026-05-12

Conventions de code, de commits, de PRs, et de documentation. Si une règle te semble inutile, propose un ADR pour la changer plutôt que de la contourner.

## 1. Code style

### 1.1 TypeScript

- **Strict mode** activé (`strict: true` dans tsconfig)
- Pas de `any` non justifié par commentaire `// any: [raison]`
- Préférer `unknown` à `any` quand on ne sait pas le type
- Préférer les types aux interfaces sauf pour les contrats étendus (`extends`)
- Discriminated unions plutôt que types sentinelles (`{ status: 'success', data } | { status: 'error', error }`)
- Pas de `enum` natifs TS, préférer les unions de string literals : `type Status = 'idle' | 'loading' | 'success' | 'error'` (sauf énumérations Prisma qui restent en enum)
- Utiliser `satisfies` plutôt que cast quand possible
- Pas de classes sauf si vraiment justifié (workers et services par classes possibles)

### 1.2 Formatting

- Biome (`pnpm format`) pour format + lint, exécuté en pre-commit hook
- Single quote pour strings JS/TS
- Double quote pour JSX attributes
- Trailing commas : `all`
- Semicolons : oui (style consistent)
- Line width : 100 chars
- Indent : 2 spaces

### 1.3 Naming

| Type | Convention | Exemple |
|---|---|---|
| Variables, fonctions | camelCase | `userCount`, `fetchReferences` |
| Constants exportées | SCREAMING_SNAKE_CASE | `MAX_REFERENCES_PER_PAGE` |
| Types, interfaces, classes | PascalCase | `ReferenceCard`, `CrawlerConfig` |
| Composants React | PascalCase + file name match | `ReferenceCard.tsx` exports `ReferenceCard` |
| Hooks | `useXxx` camelCase | `useSearchResults` |
| Fichiers de composants | PascalCase | `SearchBar.tsx` |
| Fichiers utils | kebab-case | `format-date.ts` |
| Routes Next.js | kebab-case | `app/sign-in/page.tsx` |

### 1.4 Imports

Ordre strict :
1. React / Next.js
2. External packages (alphabetical)
3. Internal absolute (`@/lib/...`, `@/components/...`)
4. Internal relative (`./...`)
5. Types (séparés en bas avec `import type {...}`)

Path aliases configurés : `@/` → `app/src/`.

### 1.5 Component patterns

- **Server components par défaut** (Next.js App Router). `'use client'` uniquement quand nécessaire (state, effects, browser APIs)
- Props typés en `type Props = {...}` au-dessus du composant
- Default exports pour les pages, named exports pour les composants
- Pas de prop drilling > 2 niveaux — passer par Context ou Zustand
- Composants accessibles à 100% (focus management, ARIA, keyboard nav)

### 1.6 Styling

- Tailwind CSS v4 partout
- Pas de CSS modules sauf cas exceptionnel
- Pas de `style={{}}` inline sauf valeurs dynamiques computed
- Classes longues : split avec `cn()` utility (clsx + tailwind-merge)
- Design tokens en CSS vars dans `globals.css`, exposés à Tailwind via config

### 1.7 Forms & validation

- Tous les forms via React Hook Form
- Validation systématique via Zod (schema partagé client + server)
- Server-side re-validation obligatoire (jamais faire confiance au client)

## 2. Git & versioning

### 2.1 Branches

- `main` : toujours déployable
- `feat/...` : feature branches courtes (max 3 jours de vie)
- `fix/...` : bug fixes
- `chore/...` : maintenance, deps, refactor sans feature
- Pas de long-running branches (`develop`, `staging` — interdit, trunk-based)

### 2.2 Commits

**Conventional commits** sur `main` (squash-and-merge convertit les commits PR) :

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types : `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `style`, `build`, `ci`, `revert`.

Exemples :
- `feat(search): add manipulation_mode filter`
- `fix(extraction): handle empty audio transcripts`
- `chore(deps): bump next from 15.0 to 15.1`
- `refactor(api): extract reference service from router`

Subject : impératif, lowercase, max 70 chars, pas de point final.
Body : optionnel, explique le pourquoi. Wrap 100 chars.
Footer : `Refs: ARG-123` (Linear ID) ou `Closes: #45` ou `BREAKING CHANGE: ...`

### 2.3 PRs

Template appliqué (voir aussi `tech-lead.md` modèle PR) :

```markdown
## Quoi
[Ce que cette PR fait, en 2-3 phrases]

## Pourquoi
[Le problème ou la feature, lien Linear ARG-XXX]

## Comment
[Approche technique en 2-3 lignes, choix non évidents]

## Tests
[Tests ajoutés, scénarios couverts]

## Risques
[Ce qui peut casser, plan rollback]

## Checklist
- [ ] Tests passent en local
- [ ] Doc/ADR mis à jour si décision architecturale
- [ ] Migration DB review si schema change
- [ ] Feature flag si feature non encore activable
- [ ] Logs structurés sur les nouveaux flows
- [ ] Pas de secret committed
- [ ] A11y check passé (axe DevTools) si UI publique
```

**Review rules** :
- Au moins 1 reviewer approuve obligatoire
- CI green obligatoire (lint, tests, build)
- Pas de self-merge (sauf hotfix urgent documenté)
- PRs > 500 lignes diff → demander à splitter sauf justification forte
- PRs ouvertes plus de 5 jours → escalade Daedalus pour clôture ou priorisation

## 3. Tests

### 3.1 Tests unitaires (Vitest)

- Coverage cible : **70% sur la logique métier** (`server/services/*`)
- Pas d'objectif religieux sur UI components
- Naming : `[file].test.ts`
- Mocks : utiliser `vi.mock`, jamais de faux objets ad hoc
- Tests parallélisables (pas de state global partagé)

### 3.2 Tests d'intégration

- Test runner Vitest + base de test (PostgreSQL test container)
- Couvrent les flows tRPC routers → DB
- Reset DB entre chaque test (via transaction rollback)

### 3.3 Tests e2e (Playwright)

- Couvrent les flows critiques user-facing :
  - Signup → first search → reference detail
  - Pro signup → first consultation
  - Admin login → annotation queue → annotate
- Run en CI sur main et sur PRs touchant les surfaces critiques

### 3.4 Tests d'extraction LLM (eval/)

- Promptfoo ou équivalent custom
- Gold-standard set = 500 références humaines annotées
- Toute itération de prompt système doit améliorer ou maintenir l'accuracy
- Régression bloque le merge

### 3.5 Tests d'accessibilité

- axe-core en CI sur les pages publiques (Pa11y ou Playwright + axe plugin)
- Zéro violation critique
- Warnings tolérés mais tracked

## 4. Documentation

### 4.1 Inline comments

- **Par défaut : zéro comment**
- Code self-documenting via noms clairs
- Comments uniquement pour expliquer le *pourquoi* non évident, pas le *quoi*
- Pas de comments TODO sans nom + date + Linear issue (`TODO(daedalus, 2026-06-01, ARG-123): ...`)
- Jamais de comments référençant un PR, une session, une discussion ("added for issue X")

### 4.2 README

- Chaque package (`packages/*`, `workers/*`) a son README court
- Format : Purpose + Usage + Dev setup + Owners

### 4.3 ADRs

Une décision architecturale = un ADR. Format dans `docs/decisions/`.

- Numérotation : `NNNN-titre-en-kebab.md` (NNNN = 4 digits zéro-paddés)
- Statut : Proposed, Accepted, Deprecated, Superseded by ADR-XXXX
- Ne pas modifier un ADR Accepted (le superseder par un nouveau)

### 4.4 Storybook

- Chaque composant du design system a au minimum 1 story
- Variants, states, sizes documentés
- Controls Storybook activés pour props testables
- A11y addon activé

## 5. Sécurité — règles dures

- **Jamais committer un secret** (Vercel env vars + Doppler workers exclusivement)
- **Jamais logger un PII en clair** (emails, contenus utilisateurs sensibles, tokens auth)
- **Jamais désactiver une CSP** sauf ADR explicite avec mitigation
- **Toute API publique doit avoir** : auth check, rate limiting, input validation Zod
- **Tout secret rotation prévu** : LLM API keys rotation semestrielle, OAuth secrets annuelle, DB password trimestrielle

## 6. Conventions UI/UX (résumé pour devs, voir Athena pour détail)

- **Loading states** : skeleton sur > 200ms d'attente, jamais de spinner bleeding
- **Empty states** : message éditorialisé + action proposée
- **Error states** : message humain + retry + signalement
- **Focus visible** : outline visible sur tous éléments interactifs (pas `outline: none`)
- **Tooltips** : delay 500ms avant apparition, instant disappear
- **Animations** : duration < 300ms, easing standard (`cubic-bezier(0.4, 0, 0.2, 1)`)
- **Reduce motion** : respecter `prefers-reduced-motion`
- **Color contrast** : 4.5:1 minimum sur texte, 3:1 sur composants

## 7. Conventions data / Prisma

- **Schema versionné** dans `app/prisma/schema.prisma`
- **Migrations Prisma natives** (`prisma migrate dev` local, `prisma migrate deploy` prod)
- **Pas de raw SQL sauf cas exceptionnel** documenté en commentaire avec ADR référencé
- **Soft delete** : ajouter `deletedAt` (DateTime?) plutôt que delete physique, sauf cas justifié
- **Created/Updated timestamps** : `createdAt` + `updatedAt` sur toute table sauf si justifié contre
- **CUIDs** pour les IDs publics (pas auto-increment), UUID v7 acceptable comme alternative
- **Soft references** entre services : préférer IDs et lookup à des FK quand crossing service boundaries

## 8. Conventions API publique (REST + MCP)

### 8.1 Versioning

- `/api/v1/...` pour version stable
- `/api/v2/...` quand breaking change (annoncé 6 mois à l'avance, v1 maintenue 12 mois)
- MCP tools nommés `argos_xxx` avec version implicite dans la signature

### 8.2 Response format

```json
{
  "data": { ... },
  "meta": {
    "pagination": { "page", "perPage", "total", "totalPages" },
    "took_ms": 123
  }
}
```

Erreurs :
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Human readable",
    "details": { ... }
  }
}
```

### 8.3 Error codes

Standard : `INVALID_INPUT`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL_ERROR`.

### 8.4 Rate limiting headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 543
X-RateLimit-Reset: 1683888000
```

## 9. Logging

Structure JSON systématique :

```json
{
  "timestamp": "2026-05-12T14:23:11.234Z",
  "level": "info",
  "correlation_id": "req_abc123",
  "user_id": "user_xyz",
  "org_id": "org_def",
  "operation": "consultation.create",
  "duration_ms": 4321,
  "outcome": "success",
  "message": "Consultation created",
  "metadata": { ... }
}
```

Niveaux : `debug` (dev), `info` (operations), `warn` (situations dégradées), `error` (erreurs trapped), `fatal` (crash).

## 10. Internationalization

- **Pas de strings hardcoded** dans les composants publics
- Strings via `next-intl` ou équivalent, fichiers JSON par langue dans `app/src/messages/`
- Langues actives MVP : EN
- Langue v1.1 : FR (toute la surface publique)
- Langues v1.2 : ES, PT
- Langue v2 : AR

## 11. Performance — règles dures

- **Pas de N+1** : toujours batch les queries Prisma via `include` ou DataLoader pattern
- **Pas de query non-indexée** sur tables > 1000 rows
- **Pas de `useEffect` avec fetch** dans les composants : passer par React Query (via tRPC) ou Server Component
- **Lazy load** systématique des composants > 50kb (`React.lazy` + Suspense)
- **Images** : Next.js `<Image>` partout, jamais `<img>` direct, jamais sans `width` / `height` ou `fill`

## 12. Conventions React Query / tRPC

- Query keys cohérents : `['references', 'list', filters]`, `['references', 'detail', id]`
- Stale time par défaut 60s, override par query si justifié
- Mutations : invalidation explicite des queries impactées
- Pas de `refetchInterval` sauf pour les dashboards live (admin sources)

## 13. Conventions sur les exceptions

- **Préférer Result types** aux throws sur les flows métier prévisibles
- **Throws acceptés** sur les invariants impossibles (corrupt state, etc.)
- **Errors catchés** systématiquement loggés avec contexte avant re-throw ou conversion
- **Pas de catch silencieux** : si on catch, on logge ou on agit

## 14. Conventions sur les feature flags

- Tout shipping derrière un flag (PostHog feature flags)
- Flag nommé `argos.[area].[feature]` (ex: `argos.search.advanced_filters`)
- Cleanup obligatoire dans les 30 jours suivant le 100% rollout
- Flag long-running (> 90 jours) → ADR justifiant
