# Argos — Personas

Argos est construit et opéré par 6 rôles spécialisés. Chacun a son propre framework de travail, ses outils, ses standards, et ses anti-patterns. Le fichier de chaque rôle est autosuffisant — il décrit complètement la fonction et peut être lu sans contexte préalable.

| Codename | Rôle | Mission |
|---|---|---|
| [Daedalus](product-architect.md) | Product Architect | Vision produit, roadmap, arbitrage, release readiness |
| [Hephaistos](tech-lead.md) | Tech Lead Full-Stack | Construction + maintien du système, qualité du code |
| [Heracles](crawler-engineer.md) | Crawler Engineer | Pipeline ingestion + extraction qualifiée |
| [Athena](ux-ui-designer.md) | UX/UI Designer | Interfaces, design system, expérience utilisateur |
| [Calliope](editorial-curator.md) | Editorial Curator | Qualité éditoriale, voix de marque, contenu |
| [Hermes](growth-lead.md) | Growth Lead | Acquisition, conversion, rétention, partnerships |

## Comment les personas opèrent ensemble

**Cadence collective.**
- *Daily async standup* dans Slack `#argos-general` (chaque persona poste avant 10h : hier/aujourd'hui/blockers)
- *Weekly product sync* lundi 10h, 45 min, tous les personas
- *Monthly product review* dernier vendredi du mois, 90 min
- *Quarterly OKR review* fin de trimestre, demi-journée

**Source de vérité.**
- *Roadmap & backlog* : Linear
- *PRD & docs* : ce repo (markdown versionné)
- *Decisions* : ADRs dans `docs/decisions/`
- *Design* : Figma
- *Code* : ce repo + déploiements Vercel/Railway
- *Communication async* : Slack

**Hiérarchie de décision.**
- Décisions tactiques (intra-persona) : autonomie totale du persona
- Décisions inter-persona : sync direct entre personas concernés
- Décisions stratégiques bloquantes : escalade à Daedalus
- Décisions structurantes (architecture, pricing, hires, partnerships majeurs) : escalade à Founder

**Résolution de conflits.**
Si deux personas divergent sur une décision et ne convergent pas dans la journée : escalade à Daedalus avec un ADR sous forme draft. Daedalus tranche dans les 48h max. Pas de blocage prolongé.

## Persona staffing

Ces rôles peuvent être occupés par :
- **Founder en multi-hat mode** : un solo founder peut endosser plusieurs rôles avec discipline (typique en phase 0-1 : Founder = Daedalus + Calliope + Hermes part-time, plus 1 hire Hephaistos)
- **Hires dédiés** : à mesure que la traction se matérialise, hires successifs (premier hire = Hephaistos en mois 1-2, puis selon priorité Heracles ou Athena)
- **Sub-agents IA augmentés** : certaines tâches récurrentes peuvent être déléguées à des sub-agents Claude (ex: brouillon d'annotation expert avant review Calliope, extraction LLM par Heracles, analyse de funnel par Hermes)

L'important n'est pas qui occupe le rôle mais que **toutes les responsabilités du rôle soient couvertes en permanence**. Une responsabilité orpheline = un risque produit.

## Onboarding nouveau persona

Quand quelqu'un nouvelle prend un rôle (hire ou réassignation interne), checklist 5 jours :

- **J1** : Lecture du PRD + du persona.md du rôle + des ADRs récents
- **J2** : Sync 1:1 avec chaque autre persona (30 min chacun)
- **J3** : Shadow du persona sortant ou existant (rituels, outils)
- **J4** : Première action concrète documentée (e.g. premier ADR, premier user interview, première PR)
- **J5** : Restitution semaine 1 à Daedalus, ajustements du persona.md si nécessaire (les rôles évoluent)
