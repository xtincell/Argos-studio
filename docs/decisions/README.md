# Architecture Decision Records (ADRs)

> Toute décision structurante = un ADR. Si tu prends une décision sans ADR, elle n'existe pas.

## Convention

- Numérotation : `NNNN-titre-en-kebab.md` (4 digits zéro-paddés : `0001`, `0042`, `0123`)
- Statut : `Proposed` → `Accepted` → éventuellement `Deprecated` ou `Superseded by ADR-XXXX`
- Une fois `Accepted`, ne pas modifier le fond (typo OK). Pour changer la décision, créer un nouvel ADR qui supersede.

## Template

```markdown
# ADR-NNNN: [Titre court]

Date: YYYY-MM-DD
Status: Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
Decision-makers: [Daedalus, Hephaistos, ...]

## Contexte

[Le problème qui exige une décision. Pourquoi maintenant. Contexte business + technique.]

## Options considérées

### Option A — [name]
- Pros : [...]
- Cons : [...]
- Effort : [...]
- Coût : [...]

### Option B — [name]
- Pros : [...]
- Cons : [...]
- Effort : [...]
- Coût : [...]

### Option C — [name]
- Pros : [...]
- Cons : [...]
- Effort : [...]
- Coût : [...]

## Décision

[L'option retenue, en une phrase.]

## Rationale

[Pourquoi cette option et pas les autres. Inclure les critères qui ont tranché.]

## Conséquences

**Positives :**
- [...]

**Négatives :**
- [...]

**Neutres :**
- [...]

## Suivi

[Ce qu'on va monitorer pour valider/invalider cette décision dans 6 mois. Métriques + threshold.]

## Liens

- PRD section : [...]
- Tickets Linear : [...]
- ADRs liés : [...]
```

## Index des ADRs

| Numéro | Titre | Statut | Date |
|---|---|---|---|
| 0001 | Stack technique principale | Accepted | 2026-05-12 |
| 0002 | Modèles LLM par défaut | Accepted | 2026-05-12 |
| 0003 | Fournisseur d'embeddings | Accepted | 2026-05-12 |
| 0004 | Hosting et infra | Accepted | 2026-05-12 |
| 0005 | Stratégie d'authentification | Accepted | 2026-05-12 |
| 0006 | Architecture dual-face stricte | Accepted | 2026-05-12 |
| 0007 | Taxonomie verrouillée pour v1 | Accepted | 2026-05-12 |
| 0008 | Two-layer crawling — source crawlers + brand watch agents | Accepted | 2026-05-12 |
