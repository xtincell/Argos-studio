# Glossary — Argos

> **Owner**: Calliope (Editorial Curator)
> **Status**: Living document.

Vocabulaire métier d'Argos. Single source of truth pour les termes propriétaires. Si tu es tenté d'inventer un nouveau terme, vérifie d'abord ici. Si tu en inventes un, ajoute-le.

## A

**ADVE+** — Cadre stratégique de marque dont sont dérivés les `pillars`. ADVE = Authenticity, Distinction, Value, Engagement, étendu avec Risk, Track, Innovation, Strategy.

**Anti-reference** — Référence explicitement à éviter lors d'une consultation. Permet d'indiquer "ne réplique pas ce pattern précis".

**Asset** — Unité atomique d'une référence Argos. Une `Reference` est composée de plusieurs `assets` (typiquement 3 à 12). Chaque asset porte un `kind` (technique : IMAGE / VIDEO / AUDIO / TEXT / EMBED_YOUTUBE / EMBED_VIMEO), une `function` (marketing : TAGLINE / KEY_VISUAL / TVC / OOH_BILLBOARD / REEL / MANIFESTO / JINGLE / PACKAGING / etc.), un `role` dans le bundle (HERO / PRIMARY / DECLINATION / COMPANION / EXTRACTED), et un `extractionMethod` (comment Argos l'a obtenu).

**AssetFunction** — 47 fonctions marketing reconnues par Argos (voir `app/src/lib/types.ts`). Couvre verbal (Tagline, Headline, Body copy, Manifesto, Claim), visuel campagne (Key visual, Key frame, Print ad, Poster), OOH (Billboard, Transit, DOOH), film (TVC, Brand film, Teaser, Cut-down, Explainer), social-native (Static post, Video post, Reel, Story, TikTok, YouTube long), audio (Radio spot, Jingle, Sound logo, Podcast), brand identity (Logo, Packaging, POS, Merch, Typography), digital (Website, Landing, Microsite, App screen, Email, Newsletter, AR filter, Interactive), activation (Photo, Video, Event doc, Sponsorship), earned (Influencer, UGC, Press kit, Case study), behind the scenes (Photo, Video, Public brief).

**AssetRole** — Position relative d'un asset dans son bundle. HERO (l'asset qui résume la référence — souvent la tagline ou le TVC), PRIMARY (output de premier rang — un TVC ET son KV peuvent tous deux être PRIMARY), DECLINATION (variante de même fonction — 3 OOH visuels, 5 social posts), COMPANION (asset support — KV companion d'un TVC), EXTRACTED (dérivé par le pipeline — key frame d'une vidéo, OCR d'une tagline).

**Bundle** — L'ensemble des outputs créatifs livrés par une marque pour une référence donnée. Argos identifie et reconstitue les bundles depuis des sources hétérogènes (le TVC sur YouTube, les OOH photographiés en street, la tagline sur le site brand, le presskit sur Cannes Lions Archive). Une référence Argos = un bundle.

**ARGOS** — Le produit. Acronyme implicite : "Authoritative Reference Graph of Strategic Outputs". Mythologie : Argos Panoptès, le géant grec aux cent yeux.

**Argos Index** — Score composite quantifiant la valeur stratégique d'une référence (combinaison de cult_index_proxy, awards, longevity, cultural_penetration). À standardiser en post-MVP.

**Auctorialité** — Axe structurel #3. Mesure le degré d'attribution claire à un auteur (créatif, agence, directeur). Une référence "fortement auctoriale" porte la signature d'un individu identifiable ; une référence "anonyme" est dépourvue de marqueur d'auteur.

**Axes structurels** — Les 22 axes utilisés pour qualifier la dimension structurelle d'une référence (cf. PRD §14.2 ou `packages/taxonomy/axes.ts`).

## B

**Board** — Collection user de références sauvegardées. Privée par défaut, partageable en équipe pour les comptes Pro Team+.

**Brand emitter** — Marque commerciale qui a émis la référence (ex: Nike pour une pub Nike). Distinct de l'agence créatrice.

**Brand watch** — Feature Pro Team+ qui notifie l'utilisateur des nouvelles références ingérées pour une liste de marques surveillées.

**Brand world door** — Type de `victory_type`. Une référence qui ouvre durablement un nouveau territoire de marque (ex: Apple "1984" ouvre l'ère de la marque-culte tech).

## C

**Calliope** — Codename du persona Editorial Curator.

**Campaign** — Ensemble cohérent de références reliées par stratégie commune (ex: Nike "Just Do It" 2018 anniversary campaign comprenant film, OOH, social posts). Une référence peut avoir un `campaign_parent`.

**Cannes Lions Gold/Silver/Bronze** — Victory_types pour les awards du Festival International de la Créativité de Cannes.

**Categorical fidelity** — Axe structurel #19. Mesure le degré de respect des codes catégoriels par une référence. Une marque qui respecte les codes catégoriels (bière + masculinité + bar) a une fidelity haute ; une qui les rompt (bière + activisme social) a une fidelity basse.

**Codename** — Nom mythologique d'un persona (Daedalus, Hephaistos, etc.). Distinct du rôle officiel.

**Cognitive mechanism** — Axe structurel #6. Décrit le levier cognitif principal employé par la référence (analogie, contraste, surprise, métaphore, paradox, etc.).

**Consultation** — Process procédural en 8 phases qui prend un brief en entrée et produit une enrichi avec position validée, références-preuves, contraintes substance. Cf. `architecture.md` §pipeline_consultation.

**Crawler** — Module worker qui ingère une source externe. Un crawler par source.

**Cult-index proxy** — Mesure quantifiée du statut culte d'une référence : présence dans culture pop (citations, parodies), longevity, audience activation. Score composite [0, 100].

**Cult-index signal** — Indicateur unitaire de cult-index (ex: "spawned multiple Halloween costumes", "referenced in academic paper", "imitated by 3+ competitors").

**Cultural penetration** — Score [0, 100] de pénétration culturelle hors-audience-cible (ex: une pub bière qui devient mème généraliste a une pénétration élevée).

**Cultural tempo** — Axe structurel #7. Vitesse du pattern par rapport au tempo culturel ambiant (en phase, en avance, en retard).

## D

**Daedalus** — Codename du persona Product Architect.

**Dealer** — Manipulation_mode. Le Dealer construit de la dépendance émotionnelle (luxury brands, drogues légales type tabac).

**Décalage culturel** — Axe structurel #5. Mesure l'écart entre les codes employés et les codes natifs de la culture cible.

**Densité narrative** — Axe structurel #10. Nombre d'idées par unité de référence. Single-minded vs polyphonique vs surchargée.

**Distinction** — Le D dans ADVE+. Pillar mesurant la singularité positionnée d'une marque.

## E

**Editorial_long_form** — Pattern_kind #10. Articles brand journalism, livres signés marque, magazines, podcasts long format.

**Effie Gold** — Victory_type. Award Effie reconnaissant l'efficacité commerciale prouvée.

**Embedding** — Vecteur dense (1024-d via Voyage AI multilingual) représentant une référence pour similarité.

**Entertainer** — Manipulation_mode. L'Entertainer divertit, vise le partage et la viralité (gum brands, snack ads, viral campaigns sans hard sell).

**Engagement** — Le E dans ADVE+. Pillar mesurant la qualité de la relation marque-audience.

**Evidence** — Citation ou observation justifiant l'attribution d'un axe à une référence. Champ obligatoire pour chaque axe attribué.

**Expansion pattern** — Comment une campagne s'est déployée (single-shot, sérialisée, omnichannel, social-first, etc.).

**Expert annotation** — Annotation experte humaine sur une référence. Plusieurs annotations possibles par référence, chacune avec son angle.

**Extraction LLM** — Process de classification automatique d'une référence par Claude Sonnet/Opus. Output validé par Zod et confidence-scored.

## F

**Facilitator** — Manipulation_mode. Le Facilitator aide le user à atteindre ses propres objectifs (banques, outils B2B, software). Posture servicielle.

**Face A / Face B** — Les deux faces d'Argos : programmatique (consommée par La Fusée/Artemis via MCP) et publique (consommée par humains via web).

**Filiation** — Lien de descendance créative entre deux références. Types : direct_homage, parody, pastiche, pattern_reproduction, positional_inversion, citation_explicit, citation_implicit.

**Forge spec** — Description du moteur de production requis pour une référence (camera + lens for shoot, illustration tool, etc.). Concept emprunté à La Fusée Ptah.

**Free tier** — Tier gratuit d'Argos. Pas une concession marketing — une infrastructure SEO et de discovery.

**Funnel stage** — Étape du funnel marketing visé par une référence (awareness, consideration, conversion, retention, advocacy).

## G

**Gold-standard set** — Set référentiel de 500 références annotées humainement, utilisé pour mesurer l'accuracy des prompts d'extraction LLM. Évolutif.

**Guilde Matanga** — Communauté de freelances créatifs liée à l'agence Matanga. Source crowdsourcing OOH terrain potentielle.

## H

**Heracles** — Codename du persona Crawler Engineer.

**Hephaistos** — Codename du persona Tech Lead Full-Stack.

**Hermes** — Codename du persona Growth Lead.

## I

**Imitation observed** — Signal performance : un concurrent a copié le pattern de la référence. Indicateur de force du pattern.

**Innovation** — Le I dans ADVE+. Pillar mesurant la nouveauté de l'approche.

## L

**La Fusée** — Système central NETERU. Consommateur premium d'Argos via MCP. Composé de Mestor (stratégie), Artemis (création), Ptah (production), Seshat (mesure), etc.

**Longevity** — Durée pendant laquelle un pattern reste viable. Mesurée en mois.

## M

**Manipulation mode** — Posture relationnelle marque-audience. 4 modes : Peddler, Dealer, Facilitator, Entertainer.

**Matanga** — Agence créative camerounaise dirigée par le founder Argos. Cliente potentielle Argos.

**Mécanisme cognitif** — Voir Cognitive mechanism.

**MCP** — Model Context Protocol. Standard Anthropic pour exposer des tools et resources à des agents IA. Argos expose un MCP server.

**Mestor** — Composant La Fusée. Stratège de marque, garde-fou éthique. Consomme Argos pour informer ses choix de position.

**Mixed (pattern_kind)** — Pattern_kind #7. Référence multi-medium (ex: film + OOH + social interconnectés).

## N

**Naija** — Nigeria, en argot local. Utilisé dans la base pour qualifier les marchés.

**NETERU** — L'écosystème global Xtincell qui contient La Fusée, Argos, Matanga, UPgraders. Référence aux Neters (dieux égyptiens).

**Notoria** — Composant La Fusée. Système de recommandation historique de marque. Interlocuteur potentiel d'Argos en Phase 4 consultation.

## O

**Object (pattern_kind)** — Pattern_kind #11. Produits-objet iconiques (bouteille Coca, packaging Apple, orange Hermès).

**OOH** — Out Of Home. Affichage extérieur (billboard, métro, etc.).

## P

**Pattern** — Configuration récurrente d'axes substance. Un pattern peut être incarné par plusieurs références.

**Pattern_kind** — Type de medium d'une référence (Image, Video, Audio, Text, Spatial, Digital_interaction, Mixed, Brand_system, Performance_live, Editorial_long_form, Object, Service_signature, Personal_brand, Ritual). 14 types.

**Pattern signature** — Hash composite des axes substance d'une référence, utilisé pour grouper les références incarnant le même pattern et calculer leurs trajectoires.

**Peddler** — Manipulation_mode. Le Peddler vend de la promesse instantanée (FMCG bas de gamme, infomercial, marketing direct agressif).

**Personal_brand (pattern_kind)** — Pattern_kind #13. Personnes-marques associées (Steve Jobs keynotes, Anna Wintour persona, etc.).

**Performance_live (pattern_kind)** — Pattern_kind #9. Concerts brandés, sport sponsorisé, théâtre brandé, performance art commerciale.

**Pikine** — Festival créatif francophone (Sénégal). Source crawler prioritaire.

**Pillar** — Axe ADVE+. 8 pillars : A, D, V, E, R, T, I, S.

**Pillar alignment** — Liste des pillars qu'une référence active.

**Position (créative)** — Choix stratégique de territoire pour un brief, produit en Phase 3 de la consultation 8-phases. Une consultation choisit UNE position parmi N proposées.

**Promise strategy** — Axe structurel #16. Type de promesse contractuelle de la référence (rationnelle, émotionnelle, sociale, spirituelle, transgressive).

**Provocation** — Axe structurel #2. Degré de tension entre la référence et le statu quo audience/catégorie.

**Ptah** — Composant La Fusée. Forge de matérialisation des assets créatifs. Reçoit les briefs enrichis par Argos via Artemis.

## R

**Récurrence sérielle** — Axe structurel #4. Place de la référence dans une série (single-shot, partie d'une saga, déclinable).

**Reference** — Unité de base d'Argos. Une campagne marketing (ou un asset individuel d'une campagne).

**Ritual (pattern_kind)** — Pattern_kind #14. Patterns rituels récurrents (Coca-Cola Christmas truck, Apple September event, Super Bowl ad investment).

## S

**Sample procédural** — Tirage aléatoire contraint dans l'espace des contraintes substance, en Phase 7 de la consultation. Calibré par variance_budget.

**Seshat** — Composant La Fusée. Mesure post-déploiement. Source de feedback pour Argos.

**Service_signature (pattern_kind)** — Pattern_kind #12. Patterns d'expérience de service codifiés (Ritz-Carlton, Apple Genius Bar, Trader Joe's caissier).

**Spatial (pattern_kind)** — Pattern_kind #5. Aménagement d'espace (boutiques, pavillons, installations physiques).

**Substance** — La dimension "ce qui est dans" la référence : pattern_kind + manipulation_mode + audience + funnel_stage + pillars + cult_index + archetypal_pattern + axes spécifiques au medium.

## T

**Tarsis** — Sous-module historique Seshat dans La Fusée. Potentiellement promu module standalone (alternative naming Argos rejetée).

**Tempo culturel** — Voir Cultural tempo.

**Trajectory** — Évolution temporelle d'un pattern : Emerging → Rising → Peak → Plateau → Declining → Archived ou Revival.

**Trajectory phase** — Phase courante d'un pattern sur une combinaison sector × market.

## U

**UPgraders** — Entité de consulting NETERU. Cliente potentielle Argos. Propriétaire potentielle de l'IP Argos selon structure légale retenue.

## V

**Valence morale assumée** — Axe structurel #8. Position morale revendiquée par la référence (neutral, positive, anti-norm).

**Variance budget** — Paramètre [0, 1] qui calibre l'amplitude de variation procédurale en Phase 6-7 de la consultation. 0 = reproduction stricte, 1 = rupture maximale.

**Victory type** — Type de victoire prouvée par une référence (Cannes Gold, Effie, Loeries Grand Prix, Local Dominance, Viral Reach, Longevity, Cult Status, Commercial Impact, Brand World Door, Competitor Imitated, etc.). Multi-valued.

## X

**Xtincell** — Codename du founder Argos (Alexandre Djengue). Référence prête à être trouvée dans les memories et docs internes.

## Y

**Yggdrasil** — Système alternatif d'asset generation, peer de Ptah. Hors scope direct Argos.

---

**Convention** : Si un terme apparaît dans le code ou la doc et n'est pas dans ce glossary, ajoute-le ou demande à Calliope de l'ajouter. Pas de termes propriétaires non documentés.
