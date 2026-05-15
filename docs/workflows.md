# Workflows — Argos

> **Owner**: Daedalus (Product Architect) — process global ; Hephaistos pour les workflows techniques
> **Status**: Living document.

Les processus standardisés d'Argos. Si tu réinventes un workflow, c'est probablement un anti-pattern.

## 1. Sprint cycle (2 semaines)

**Sprint planning** — Lundi semaine 1, 10h-11h.
- Présents : tous personas
- Daedalus présente le backlog priorisé
- Hephaistos confirme l'estimation et le commitment
- Discussion des dépendances inter-personas
- Output : sprint scope frozen + assigned

**Daily async standup** — Slack `#argos-general`, avant 10h.
- Format : hier (1 ligne) / aujourd'hui (1 ligne) / blockers (1 ligne)
- Pas de réunion sync quotidienne

**Mid-sprint check** — Mercredi semaine 2, 30 min.
- Burndown review
- Désembourbage blockers
- Adjustment scope si nécessaire (cut, pas add)

**Sprint review** — Vendredi semaine 2, 14h, 45 min.
- Démo de ce qui est shippable
- Feedback Daedalus + Athena + Calliope
- Décision release : ship / hold

**Sprint retro** — Vendredi semaine 2, 15h, 30 min.
- What went well / What sucked / 1 action concrète

## 2. Release readiness check

Avant toute release publique (face publique ou API), check obligatoire par Daedalus.

```markdown
# Release Readiness — vX.Y — YYYY-MM-DD

## Scope
[Liste des changes user-facing]

## Checklist
- [ ] Acceptance criteria de chaque feature validées
- [ ] Tests automatisés passent (unit + e2e + eval)
- [ ] Doc utilisateur à jour si user-facing
- [ ] PRD mis à jour
- [ ] Microcopy reviewée par Calliope
- [ ] A11y audit passé (axe DevTools, 0 critique)
- [ ] Performance budget respecté
- [ ] Métriques de succès instrumentées (PostHog events)
- [ ] Plan de rollback documenté
- [ ] Communication user prévue (changelog, email, in-app si majeur)

## Decision
- [ ] GO
- [ ] HOLD (rationale + deadline)
- [ ] NO-GO (rationale)

## Owners post-release
- Monitoring 24h : [persona]
- User feedback collection : [persona]
- Hotfix on call : [persona]
```

## 3. ADR (Architecture Decision Record) process

Toute décision structurante = un ADR.

**Quand créer un ADR :**
- Choix de stack majeur (framework, db, infra)
- Pattern d'architecture (event-driven vs request-response, monolith vs split)
- Trade-off avec conséquences durables (budget, latency, scalabilité)
- Revirement d'une décision existante

**Processus :**
1. Auteur crée un fichier `docs/decisions/NNNN-titre.md` avec statut `Proposed`
2. Auteur ouvre PR review (reviewers : Daedalus + personas concernés)
3. Discussion en PR (commentaires)
4. Si convergence : statut → `Accepted`, PR mergée
5. Si bloquage : escalade à Daedalus pour arbitrage

**Quand un ADR devient obsolète :**
- Soit on le `Deprecate` (ne plus utiliser, mais ne pas supprimer)
- Soit on le `Supersede` par un nouvel ADR (référence croisée explicite)

## 4. Incident response

**Sévérités :**
- *P0 (critical)* : production down, données perdues, sécurité compromise. Réponse < 15 min, all hands.
- *P1 (major)* : feature critique cassée, > 10% users impactés. Réponse < 1h ouvré.
- *P2 (minor)* : feature non-critique cassée, < 10% users. Réponse < 4h ouvré.
- *P3 (low)* : annoyance, fix plannifiable dans le sprint courant.

**Process P0/P1 :**
1. Détection (alerte auto, user report, monitoring)
2. Acknowledge (qui prend en charge, déclaré dans `#argos-incidents`)
3. Mitigation (rollback, feature flag off, scale up, etc.) — priorité = stopper l'impact
4. Diagnostic (root cause)
5. Fix permanent (PR, possible hotfix process)
6. Communication user (status page, email si > 1h impact)
7. Postmortem (dans les 48h, blameless, action items trackés)

**Template postmortem :** voir `docs/runbooks/postmortem-template.md`

## 5. Onboarding (technique) nouveau contributeur

Owner : Hephaistos.

**J1 — Setup environment**
- Clone repo, install dependencies (`pnpm install`)
- Configure `.env.local` (Hephaistos fournit les test secrets)
- Run local : `pnpm dev`, `pnpm db:studio`, `pnpm worker:dev`
- Run tests : `pnpm test`
- Lecture obligatoire : ce repo entier docs/ + personas/

**J2 — Code tour**
- Walkthrough par Hephaistos (60-90 min) : monorepo structure, key files, conventions
- Mini-PR : un fix mineur ou un test ajouté, mergé par Hephaistos en review

**J3-J5 — First real contribution**
- Pickup un ticket P3 du backlog
- PR template appliqué
- Review par Hephaistos + 1 autre persona

**Fin S1** : restitution à Daedalus + ajustements onboarding doc si nécessaire.

## 6. Onboarding (produit) nouveau persona

Owner : Daedalus.

Cf. `personas/README.md` section "Onboarding nouveau persona". Checklist 5 jours.

## 7. Customer interview process

Owner : Daedalus (face publique) + Hermes (acquisition) + Athena (feature-specific).

**Cadence** : minimum 5 interviews/mois.

**Profils** :
- 2 utilisateurs Free actifs (compréhension funnel)
- 1 utilisateur Pro Individual ou Team
- 1 prospect Enterprise ou Agency (qualification besoin)
- 1 churner récent (compréhension perte)

**Format** : 30-45 min, semi-structuré, Zoom enregistré (avec consentement), notes dans Notion.

**Template** : voir `research/interview-template.md` (à créer S1).

**Diffusion** : key insights partagés en weekly product sync, transcripts taggés dans Notion pour recherche future.

## 8. Annotation queue process (Editorial Curator)

Owner : Calliope.

**Cadence quotidienne** : 1-2h le matin sur queue.

**Process** :
1. Ouvrir admin queue `/admin/queue`
2. Filtrer par `requires_review` ordonné par âge desc
3. Pour chaque référence :
   - Vérifier extraction LLM (champ par champ)
   - Corriger les champs en `confidence < 0.65`
   - Annoter en mode expert si référence-clé
   - Approuver pour passage en base publique
4. Si doute persistant : flag pour annotation externe (freelance expert)
5. Si bas-quality irrécupérable : reject avec rationale

**Cadence hebdomadaire** : sync avec Heracles le lundi pour drift detection.

## 9. Content publication process

Owner : Calliope + Hermes.

**Articles longue forme** (cadence : 2/mois) :
1. Recherche + sourcing (Calliope, S1)
2. Draft (Calliope, S2)
3. Review Daedalus + 1 advisor externe (S3)
4. Microcopy + SEO copy + meta (Hermes)
5. Visual asset + OG image (Athena)
6. Publication + amplification (Hermes : newsletter, social, partnerships)

**Newsletter** (cadence : 2/mois initialement) :
1. Selection contenu (Calliope) — 5 references curated + 1 analyse + 1 interview
2. Draft + style review (Calliope)
3. Visual (Athena)
4. Send + track (Hermes)

## 10. Source onboarding process (new crawler)

Owner : Heracles.

1. **Évaluation source** :
   - Volume potentiel
   - Importance stratégique (catégorie, marché)
   - Accès technique (HTML scrape, API, RSS)
   - Risque légal (ToS, robots.txt)
   - Coût d'extraction estimé
2. **Onboarding doc** créé (template dans `crawler-engineer.md`)
3. **POC** : 50 references extracted en dry-run, validation manuelle (Heracles + Calliope)
4. **Production** : crawler module dans `workers/crawlers/`, tests fixtures, monitoring
5. **Soft launch** : volume modéré pendant 2 semaines, observation accuracy + dedup
6. **Full launch** : cadence prod, alerts configurées
7. **Audit mensuel** premier trimestre : drift detection

## 11. Pricing change process

Owner : Daedalus + Hermes.

**Triggers** :
- Données indiquent un mispricing (conversion trop faible / trop forte sur un tier)
- Nouvelle feature change la valeur perçue
- Concurrence ajuste

**Process** :
1. Hypothesis + data analysis (Hermes)
2. Modélisation impact (Hermes + Daedalus)
3. ADR si change > 20%
4. Test A/B si possible (sur nouveaux signups uniquement, jamais sur existing customers)
5. Grandfathering : existing customers gardent leur pricing 12 mois minimum
6. Communication transparente (email, blog post)

## 12. Hire / promotion process

Owner : Founder + Daedalus.

**Trigger** : un persona est sub-staffed (responsabilités orphelines, surcharge prouvée).

**Process** :
1. JD écrite (base = `personas/[role].md`)
2. Sourcing (LinkedIn, AngelList, communauté Slack créative)
3. Interviews :
   - Screen Daedalus (30 min)
   - Technical interview (Hephaistos si tech ; persona target si non-tech)
   - Case study (mini-projet de 4-8h rémunéré)
   - Cultural fit (Founder + 1 persona)
   - References check
4. Offer
5. Onboarding (cf. workflows §5 et §6)

## 13. Quarterly OKR review

Owner : Daedalus + Founder.

**Cadence** : fin trimestre + début trimestre suivant.

**Process** :
1. **Restrospective** (J-7) :
   - Tous personas remplissent une self-eval OKR
   - Daedalus compile
2. **Review meeting** (demi-journée) :
   - Bilan trimestre (OKR achieved %)
   - Apprentissages
   - Décision continue / change focus
3. **OKR drafting** (1-2 jours) :
   - Daedalus propose 3-5 OKR pour le trimestre
   - Tous personas alignment session (90 min)
4. **OKR commit** :
   - Publication dans `docs/okr/YYYY-Q[N].md`
   - Communication équipe

## 14. Security incident process

Owner : Hephaistos (escalation Founder).

**Types** :
- Breach (data leak, unauthorized access)
- Vulnerability disclosure (white hat report)
- Credential exposure (secret committed accidentally)
- DDoS or sustained attack

**Process P0 security** :
1. Containment (isolate affected system, revoke credentials)
2. Assessment (scope, data affected, regulatory implications)
3. Mitigation (patch, rotation, restoration)
4. Communication (affected users, authorities si GDPR breach > 72h)
5. Postmortem + action items

**Pre-emptive** :
- Quarterly security audit
- Annual penetration test (post-MVP)
- Continuous Dependabot + npm audit
- Quarterly secret rotation review

## 15. Documentation update process

Owner : Daedalus (PRD), Hephaistos (technical docs), Calliope (style guide + glossary).

**Règles** :
- PRD updated dans la PR qui ship la feature, pas après
- ADR créé avec la décision, pas rétroactivement
- Glossary updated dès qu'un nouveau terme propriétaire émerge
- Architecture diagram updated dans le sprint où l'architecture change

**Audit semestriel** : Daedalus revoit l'ensemble de la doc pour cohérence et obsolescence.
