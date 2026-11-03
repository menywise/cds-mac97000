# Plan : contenus éditoriaux communs (blog, maillage, référencement, recherche)

Statut : **proposition**, à valider par le propriétaire avant tout code.
Date : 03/11/2026. Ligne du registre : `docs/SYNCHRO.md`, section « Contenus éditoriaux ».

## 1. Décision de départ

Le 03/11/2026, le propriétaire choisit le modèle `contenus_publics` du premier clone comme référence
commune. Le socle abandonne `blog_posts` et reprend ce modèle. le premier clone reprend en retour ce que
le socle fait mieux : recherche, étiquettes, pagination, RSS, couverture, suggestions de lecture.

But final : **un seul modèle de données, un seul moteur de rendu, des règles pures partagées en
copie exacte.** Le blog cesse de diverger.

Cible éditoriale : tout site qui publie un savoir à défendre. Une société savante, un réseau de
soignants, un cabinet d'expertise, un artisan qui publie ses méthodes. Le socle reste généraliste :
les exigences fortes (sources, relecture, anonymisation) sont des réglages, allumés par défaut.

## 2. État des lieux (mesuré le 03/11/2026)

| Sujet | Socle | le premier clone |
|---|---|---|
| Table | `blog_posts`, `blog_comments` | `contenus_publics` (types `page` et `article`) |
| Rôles | `admin`, `user` | membre, rédacteur, modérateur, admin, démo |
| Publication | booléen `published` | 7 statuts, passages imposés par la base, journal, versions |
| Garde-fous | aucun sur le texte | manques avant publication, termes interdits, sources, relecture |
| Liste | 12 par page, recherche, étiquettes, durée de lecture | tout d'un coup |
| Article | couverture, étiquettes, partage, signalement, commentaires, « À lire ensuite » | chapô, sources, relu le, fonction de l'auteur, avertissement |
| Maillage | « À lire ensuite » (12 derniers) | pilier et satellites, contrôle du lien vers le pilier |
| Référencement | `seo()`, fil d'Ariane, `BlogPosting`, plan du site avec `lastmod`, RSS | balises, données structurées avec relecture et sources, plan du site |
| Recherche | plein texte `cds_fr` (`unaccent` + racines), `search_site()` | idem, plus recherche par début de mot et configuration sans racine |
| Texte | `src/lib/richtext.tsx` | `src/components/Corps.tsx` (syntaxe proche) |
| Autre | table `pages` (pages construites en sections) | lexique public (`DefinedTerm`) |

Conséquence : la table `pages` du socle reste. Elle sert aux pages d'atterrissage construites en
sections. `contenus_publics` porte le contenu éditorial : articles et pages de texte (guides,
dossiers piliers).

## 3. Points à trancher avant le lot 1

| # | Question | Recommandation |
|---|---|---|
| D1 | Rôle « rédacteur » dans le socle ? Le circuit en a besoin. **Appliqué au lot 2 (`editor`).** | Oui : ajouter `editor` à `app_role`, fonction `private.can_write_content()` commune. |
| D2 | Noms français (`contenus_publics`, `titre`) dans un socle aux noms anglais ? **Appliqué au lot 1.** | Oui, garder les noms du premier clone. Renommer côté C1 coûterait plus cher et casserait sa production. Noté comme écart assumé. |
| D3 | Auteur : fonction seule (C1) ou personne nommée ? | **Tranché le 03/11/2026 : les deux, par réglage.** `auteur_mode` : `fonction` ou `nomme` (page auteur). Affichage au lot 2. |
| D4 | Commentaires d'articles | Module à part, éteint par défaut. Rattachés à `contenus_publics.id`. |
| D5 | Une version du socle par lot, ou tout d'un coup ? | Un lot = une version. La reprise des données (lot 1) passe seule, sans changement visible. |

## 4. Les lots

Chaque lot suit la méthode du socle : migration `AAAAMMJJ120000_vX_Y_Z_<nom>.sql`, blocs rejouables
dans `supabase/seed/vX_Y_Z/` avec `LISEZMOI.md` et bloc de contrôle, tests `tests/db/`, tests
unitaires, recette `tests/e2e/plan.ts`, ligne dans `docs/MISE_A_NIVEAU.md`.

### Lot 1 — Modèle commun et reprise (version 1.9.0, aucun changement visible)

**Fait le 03/11/2026** : migration `20261103120000_v1_9_0_contenus_publics.sql`, blocs
`supabase/seed/v1_9_0/`, test `tests/db/test_30`. Écarts assumés par rapport au texte ci-dessous :

- la table est **renommée** (`ALTER TABLE … RENAME`), pas recopiée : identifiants, clé des
  commentaires, droits et index suivent sans réécriture ;
- `statut` attend le lot 2 : le lot 1 garde `publie` et `publie_le`, comme C1 avant son circuit ;
- `temps_lecture` n'est pas une colonne : le code le calcule déjà (`readingMinutes`) ;
- `corps` borné à 100 000 caractères (C1 : 30 000), pour les guides piliers ; écart noté au registre ;
- `sources_valides()` dans le schéma `public` (le socle n'a pas de schéma `private`) ;
- `type` vaut `article` par défaut, pour que la vue de compatibilité puisse écrire ;
- une longueur qu'un contenu existant dépasse reste une règle non validée, nommée par le bloc de
  contrôle : l'article n'est jamais tronqué.

But : le socle lit et écrit `contenus_publics`. Les adresses `/blog/<slug>` ne bougent pas : aucune
perte de référencement.

1. **Table** `contenus_publics`, reprise colonne par colonne de C1 (contraintes de longueur
   comprises), plus ce que le socle apporte :
   - `image_url`, `image_alt` (couverture, texte alternatif obligatoire si image) ;
   - `etiquettes text[]` (index GIN) ;
   - `auteur_id uuid` (compte qui a écrit, jamais affiché en mode `fonction`) ;
   - `temps_lecture` calculé par la base à l'enregistrement.
2. **Reprise** de `blog_posts` :

   | `blog_posts` | `contenus_publics` |
   |---|---|
   | `id` | `id` (même valeur : les commentaires suivent sans réécriture) |
   | `slug` | `slug` |
   | `title` | `titre` |
   | `excerpt` | `chapo`, et `description` coupée à 160 caractères |
   | `content` | `corps` |
   | `cover_url` | `image_url` |
   | `tags` | `etiquettes` |
   | `author_id` | `auteur_id` |
   | `published`, `published_at` | `statut` = `publie` ou `redaction`, `publie_le` |
   | — | `type` = `article` |

3. **Commentaires** : la clé de `blog_comments.post_id` pointe vers `contenus_publics(id)`.
4. **Compatibilité** : une vue `blog_posts` en lecture seule, gardée une version, pour les
   installations et l'outil MCP (`src/lib/mcp/tools/site-overview.ts`). Supprimée en 1.10.0.
5. **Code** : `content.functions.ts`, `blog.index.tsx`, `blog.$slug.tsx`, `rss[.]xml.tsx`,
   `sitemap[.]xml.tsx`, `admin.contenus.tsx`, `search_site()` lisent la nouvelle table.
6. **Contrôle** : même nombre d'articles publiés avant et après, mêmes adresses dans le plan du
   site, RSS identique.

Retour vers C1 : rien à ce lot. C1 a déjà la table ; il ajoutera les colonnes du socle au lot 3.

### Lot 2 — Circuit de rédaction et garde-fous (version 1.10.0)

**Fait le 03/11/2026** : migration `20261103140000_v1_10_0_circuit_editorial.sql`, blocs
`supabase/seed/v1_10_0/`, test `tests/db/test_31`, poste `/editorial`, règles d'écran
`src/lib/editorial-regles.ts`. Écarts assumés par rapport au texte ci-dessous :

- **circuit simple** ajouté en réglage (`circuit`) : un admin publie une rédaction directement, la
  publication vaut relecture ; parade au risque « circuit trop lourd pour un petit site » ;
- **exigences réglables** : `exiger_sources`, `exiger_relecture`, `exiger_auteur`, `longueurs_seo`,
  toutes allumées par défaut ; l'auteur exigé suit l'affichage choisi (D3 : fonction ou nom) ;
- **termes interdits sans expression régulière** : texte et terme ramenés à des mots sans accents,
  recherche par inclusion (les blocs refusent l'antislash) ; l'accroche des noms d'une installation
  est une fonction `greffe_termes_nominatifs`, appelée si elle existe ;
- **opération serveur** reconnue au rôle de la session (ni `authenticated`, ni `anon`) : clé de
  service, éditeur SQL, migrations ;
- fonctions dans `public` (le socle n'a pas de schéma `private`), réglages dans `site_settings` ;
- **reste à faire** : `liens_sources_etat` (vérification des liens de sources) passe au lot 4, avec
  le contrôle des liens internes.

Repris de C1 (`20270226120000_editorial_pilotage.sql`, `docs/editorial/circuit.md`).

- 7 statuts (idée, en rédaction, à relire, prêt, programmé, publié, à actualiser), passages
  imposés par déclencheur, journal (`contenus_publics_journal`), versions du texte
  (`contenus_publics_versions`), retour automatique « à relire » si le texte change.
- `manques_publication()` : longueur du titre (10 à 70) et de la description (70 à 160), texte non
  vide, source `https://`, relecture, fonction de l'auteur, termes interdits. Le seuil exact reste
  réglable par installation.
- **Termes interdits** : `termes_interdits_publics` (établissements, marques, villes…), saisie en
  base par un admin, jamais dans le dépôt. Les noms propres à une installation (personnes,
  noms propres au métier dans C1) passent par une **accroche** : `private.termes_nominatifs_greffe(texte)`,
  vide dans le socle, remplie par l'installation.
- `contenus_publics_a_revoir()` : contenus en ligne qui contiennent un terme ajouté depuis.
- Sources (une par ligne), relecture (`relu_le`, `relu_par`), délai de relecture réglable,
  avertissement sous l'article : réglages dans `site_settings` (clé `editorial`).
- `liens_sources_etat` : vérification des sources à la demande (serveur, clé de service).
- Poste `/editorial` : tableau par statut, prochaine action, raisons de blocage.
- Rôle `editor` (D1).

Copie exacte créée à ce lot : `src/lib/editorial-regles.ts` (statuts, passages possibles,
`manquesSaisie`, `LONGUEURS`, `lireSources`, `dateSimple`), sans dépendance. C1 remplace sa propre
version par la copie.

### Lot 3 — Taxonomie et maillage interne (version 1.11.0)

**Fait le 03/11/2026** : migration `20261103160000_v1_11_0_maillage.sql`, blocs
`supabase/seed/v1_11_0/`, test `tests/db/test_32`, pages `/blog/rubrique/…`, `/blog/etiquette/…`,
`/blog/serie/…`, onglet Taxonomie et panneau Maillage du poste Éditorial, règles d'écran
`src/lib/maillage.ts`. Écarts assumés par rapport au texte ci-dessous :

- **pas de table `liens_internes`** : la base lit les liens dans le texte à chaque calcul
  (`extraire_liens`, `liens_du_texte`). Toujours juste, rien à resynchroniser ; le volume d'un blog
  le permet ;
- **lien vers un contenu hors ligne** compté comme cassé (il mènerait le visiteur à une page
  introuvable) : un pilier ne cite un satellite qu'une fois celui-ci publié ;
- les suggestions de liens se calculent à l'écran (pilier, frères, étiquettes, rubrique, mots du
  titre) ; la proximité plein texte en base et le lien automatique vers un lexique restent à faire
  (le socle n'a pas encore de lexique) ;
- les rubriques sont gérées par les admins ; étiquettes et séries par les rédacteurs, supprimées
  par les admins ;
- une page de rubrique ou de série sans article en ligne n'est pas indexée, comme une page
  d'étiquette sous le seuil (réglage `seuil_etiquette`, 3 par défaut) ;
- **reste à faire** : liens vers les rubriques depuis `/blog` (aujourd'hui atteintes par le fil
  d'Ariane des articles et le plan du site).

Le maillage interne dit aux lecteurs et aux moteurs de recherche ce qui compte et ce qui va
ensemble. Aujourd'hui il dépend de la mémoire du rédacteur. Ce lot le rend visible et contrôlé.

**Organisation**

- **Rubriques** : table `rubriques` (une rubrique par contenu, hiérarchie sur deux niveaux au plus).
  Elle donne le fil d'Ariane et une page `/blog/rubrique/<slug>` avec texte d'introduction.
- **Étiquettes** : vocabulaire contrôlé (`etiquettes`, avec définition), plus de texte libre. Une
  page par étiquette, **non indexée tant qu'elle compte moins de N articles** (N réglable) : pas
  de pages pauvres.
- **Pilier et satellites** (repris de C1) : `est_pilier`, `pilier_id`. Le pilier est un guide de
  fond, les satellites traitent un point précis.
- **Séries** : suite ordonnée d'articles (« partie 2 sur 5 »), liens précédent et suivant.

**Contrôles de maillage** (dans `/editorial`, et parmi les manques quand c'est bloquant)

| Contrôle | Règle | Bloquant ? |
|---|---|---|
| Satellite → pilier | Le satellite contient un lien vers son pilier (`renvoieVersPilier`) | Oui |
| Pilier → satellites | Le pilier liste ou cite tous ses satellites publiés | Alerte |
| Contenu orphelin | Aucun lien interne entrant depuis un contenu publié | Alerte |
| Lien interne cassé | Lien `[texte](/adresse)` vers une adresse inconnue ou non publiée | Oui |
| Ancre pauvre | Texte de lien « ici », « cet article », « cliquez » | Alerte |
| Cannibalisation | Deux contenus avec la même `requete_visee` | Alerte |

Ces contrôles lisent une table `liens_internes` (source, cible, texte d'ancre), remplie par la
base à l'enregistrement du texte. Elle donne aussi le **graphe de maillage** : liens entrants et
sortants de chaque contenu.

**Suggestions de liens** : à l'écriture, l'écran propose les contenus proches (même rubrique, mêmes
étiquettes, proximité plein texte), et les termes du lexique présents dans le texte. Le rédacteur
choisit : rien n'est inséré sans lui.

**Lien automatique vers le lexique** (repris de C1, réglable) : la première occurrence d'un terme
défini devient un lien vers sa définition. Limite par article réglable, pour ne pas noyer le texte.

**« À lire ensuite »** : d'abord le pilier et les satellites frères, puis les étiquettes communes,
puis la rubrique. Plus seulement les derniers parus.

**Redirections** : table `redirections` (ancienne adresse → nouvelle, code 301). Un changement de
slug d'un contenu publié crée la redirection tout seul. Sans elle, chaque renommage casse les liens
entrants et les positions acquises.

Retour vers C1 : rubriques, étiquettes, séries, `liens_internes`, redirections, « À lire
ensuite ». Copie exacte créée : `src/lib/maillage.ts` (extraction des liens, ancres pauvres,
suggestions, ordre de « À lire ensuite »).

### Lot 4 — Référencement technique (version 1.12.0)

**Fait le 03/11/2026** : migration `20261103180000_v1_12_0_seo_technique.sql`, blocs
`supabase/seed/v1_12_0/`, test `tests/db/test_33`. Code : `src/lib/corps.ts` et
`src/components/cds/CorpsArticle.tsx` (texte des articles), `src/lib/article-donnees.ts` (données
structurées, balises d'article, lien Search Console), `src/lib/sources-verif.ts` et
`src/lib/editorial.functions.ts` (liens de sources), plan du site des images, flux RSS filtrés,
rubriques sur `/blog`. Écarts assumés par rapport au texte ci-dessous :

- **moteur dédié aux articles** : `RichText` reste pour le forum, les fiches et les formations,
  qui n'ont pas besoin d'intertitres ; `CorpsArticle` sert le blog. Les appels de référence `[1]`
  attendent la bibliographie du lot 6 ;
- **image générée à partir du titre** non faite : l'image de couverture, ou à défaut l'image de
  partage du site, sert aux partages ;
- **liens de sources** vérifiés par le serveur avec la session du rédacteur (aucune clé de
  service) ; seules les adresses https publiques sont appelées ; une adresse qui refuse le
  vérificateur (401, 403) est signalée « à contrôler à la main » ;
- flux RSS filtrés par paramètre (`/rss.xml?rubrique=…`, `?etiquette=…`), annoncés par une balise
  `alternate` sur la page de la rubrique ou de l'étiquette.

- **Moteur de rendu unique** : `src/lib/corps.tsx` remplace `richtext.tsx` et `Corps.tsx`, copie
  exacte. Syntaxe commune : intertitres `##` et `###`, listes, gras, italique, liens, citations,
  appels de référence `[1]`, encadré « À retenir ». Ancres automatiques sur les intertitres, et
  sommaire pour les textes longs.
- **Données structurées** (copie exacte `src/lib/article-donnees.ts`) :
  `BlogPosting` ou `Article`, `datePublished`, `dateModified`, `lastReviewed`, `reviewedBy`
  (fonction), `citation` (sources), `about` (rubrique), `keywords` (étiquettes), `isPartOf` (série
  ou pilier), `BreadcrumbList`, `image`. Pour un site santé : `MedicalWebPage` en option.
- **FAQ dans un article** : bloc question-réponse, balisé `FAQPage`. L'affichage enrichi chez les
  moteurs est aujourd'hui réservé à certains sites : à vérifier au moment du lot, sans promesse.
- **Balises** : `canonical` systématique, `og:image` (couverture ou image générée à partir du
  titre), `article:modified_time`, `article:section`, `article:tag`, `robots` piloté par le statut.
- **Plan du site** : `lastmod` réel (déjà dans le socle), programmation respectée (C1), plan des
  images, rubriques et étiquettes indexables seulement.
- **RSS** : global, par rubrique, par étiquette.
- **Pagination** : adresses stables `?page=N`, recherches et filtres en `noindex` (déjà dans le
  socle).
- **Lien Search Console** par contenu (repris de C1). Aucun chiffre importé.

### Lot 5 — Recherche avancée (version 1.13.0)

**Fait le 03/11/2026** : migration `20261103200000_v1_13_0_recherche.sql`, blocs
`supabase/seed/v1_13_0/`, test `tests/db/test_34`, recherche de `/blog` par la base, synonymes et
recherches sans résultat dans le poste Éditorial. Écarts assumés par rapport au texte ci-dessous :

- **opérateurs écrits à la main** plutôt que `websearch_to_tsquery`, pour chercher chaque mot par son
  début et l'élargir à ses synonymes ; « ou » relie un mot au seul mot qui précède ;
- **fautes de frappe** : comparaison sans accents (les trigrammes d'une lettre accentuée dépendent
  du serveur), mot proposé avec ses accents ;
- **journal anonyme** borné à 1 000 termes ; un terme ne garde que des mots (5 au plus) ;
- **facettes** affichées pour la rubrique et la série ; les années sont calculées, pas encore
  affichées ; la recherche globale `/recherche` garde son propre moteur ;
- les règles d'écran (nettoyage, extrait surligné) sont dans `src/lib/blog.ts`, sans dépendance,
  plutôt que dans un fichier `recherche-requete.ts` à part.

La recherche sert le lecteur, et elle dit au rédacteur ce qui manque.

- **Moteur** : la configuration double de C1 (racines françaises + sans racine), plus la recherche
  par début de mot (`:*`). Opérateurs de `websearch_to_tsquery` : phrase entre guillemets, mot
  exclu `-mot`, `OU`.
- **Fautes de frappe** : `pg_trgm` sur les titres et les termes du lexique. « Vouliez-vous
  dire… » quand la recherche ne trouve rien.
- **Synonymes** : table `synonymes` (terme ↔ variantes). Une installation la remplit depuis son
  glossaire (C1 : les variantes du glossaire, « trois noms pour le même objet »).
- **Pondération** : titre > chapô et étiquettes > corps > sources. Bonus pilier, malus ancien
  contenu à actualiser.
- **Facettes** : type, rubrique, étiquette, période, série. Compteurs par facette.
- **Extraits surlignés** (`ts_headline`) et adresse partageable de chaque recherche.
- **Recherches sans résultat** : journal anonyme (texte cherché, date, nombre), sans compte ni
  adresse IP. Dans `/editorial`, une recherche fréquente sans résultat devient une **idée** en un
  clic : le circuit se nourrit de la demande réelle.
- **Recherche globale** `/recherche` : les contenus éditoriaux y gardent leur place, avec les
  autres modules.

Copie exacte créée : `src/lib/recherche-requete.ts` (nettoyage, opérateurs, facettes dans
l'adresse).

### Lot 6 — Exigences d'une société savante (version 1.14.0)

**Fait le 03/11/2026** : migration `20261103220000_v1_14_0_societe_savante.sql`, blocs
`supabase/seed/v1_14_0/`, test `tests/db/test_35`, `src/lib/bibliographie.ts` (sans dépendance),
champs et bibliographie dans le poste Éditorial, affichage sur l'article. Écarts assumés par
rapport au texte ci-dessous :

- **accès réservé aux membres reporté à un lot dédié** : masquer le texte à un visiteur sans
  fuite par la recherche, les extraits surlignés, le maillage et les données structurées demande
  une conception à part (colonne protégée, lecture par fonction) ; un rafistolage risquerait une
  fuite ;
- **contrôle du DOI** : pas d'appel réseau dédié ; le DOI est vérifié dans sa forme, et son lien
  `https://doi.org/…` peut être cité en source pour passer par la vérification des liens (lot 4) ;
- **relecture par un comité** : les relecteurs sont désignés par leur fonction (cinq au plus),
  affichés et repris dans les données structurées ; la relecture reste validée par un admin ;
- niveaux de preuve et format de citation (Vancouver, APA) réglables ; une actualité est balisée
  `NewsArticle` ;
- **impression** : en-tête, pied de page, publicité, partage, suggestions et commentaires masqués.

Ce lot transforme le blog en lieu de publication crédible. Chaque point est un réglage : un site
d'artisan ne les allume pas.

- **Bibliographie structurée** : table `references_contenu` (auteurs, titre, revue, année, DOI,
  PMID, adresse). Appels numérotés dans le texte, liste en fin d'article, format de citation
  réglable. Contrôle du DOI à la demande, comme les liens de sources.
- **Liens d'intérêts** : déclaration par contenu (aucun / texte libre), affichée sous l'article.
  Exigée avant publication si le réglage est allumé.
- **Relecture par un comité** : plusieurs relecteurs possibles, chacun désigné par sa fonction.
  C1 garde « relecture par le propriétaire seul » par réglage.
- **Niveau de preuve** : champ optionnel (recommandation officielle, consensus d'experts, retour
  de terrain), affiché en pastille. Liste réglable par installation.
- **Types de contenus** : article, guide (pilier), actualité, compte rendu de congrès, entretien,
  fiche pratique. Chaque type a ses manques propres (exemple : un compte rendu exige la date et le
  nom de l'événement).
- **Citer ce contenu** : formule de citation prête à copier, avec date de consultation.
- **Version imprimable** propre, sans menus.
- **Accès réservé aux membres** : chapô public, texte réservé, balisage `isAccessibleForFree`
  pour rester honnête avec les moteurs.
- **Lexique** (repris de C1) : définitions publiques, `DefinedTerm`, lien depuis les articles.

### Lot 7 — Pilotage du contenu (version 1.14.0)

- **Calendrier** : `date_prevue`, vue par semaine et par mois (C1 l'a en base).
- **Brief** par contenu : `public_vise`, `requete_visee` (C1), intention (comprendre, comparer,
  agir), appel à l'action visé.
- **Actualisation** : délai de relecture réglable (C1), liste des contenus dus, motif obligatoire.
- **Appel à l'action réglable** en fin d'article : démonstration (C1 `AppelDemo`), lettre
  d'information, adhésion, contact. Un par rubrique au plus.
- **Lettre d'information** : envoi des nouveaux articles par le module existant du socle.
- **Mesure** : liens marqués (UTM) sur les partages et la lettre ; aucun traceur ajouté sans
  consentement. Le volume de lecture vient de l'outil de mesure déjà présent dans l'installation.
- **Santé du contenu** : tableau dans `/editorial` (orphelins, liens cassés, sources mortes,
  relectures dues, cannibalisation, recherches sans réponse).

## 5. Retour vers le premier clone, lot par lot

| Lot du socle | Ce que C1 reprend | Ce que C1 garde à lui |
|---|---|---|
| 1 | Colonnes `image_url`, `image_alt`, `etiquettes`, `auteur_id`, `temps_lecture` | Ses données, sa table |
| 2 | `editorial-regles.ts` en copie exacte | Accroche des noms (tables de personnes propres à C1), relecture par le propriétaire seul |
| 3 | Rubriques, étiquettes, séries, `liens_internes`, redirections, `maillage.ts` | Périmètre éditorial de son blog |
| 4 | Moteur `corps.tsx`, `article-donnees.ts`, RSS, liste paginée avec recherche | Avertissement santé, `MedicalWebPage` allumé |
| 5 | `recherche-requete.ts`, facettes, journal des recherches sans résultat | Synonymes issus du glossaire |
| 6 | Bibliographie, liens d'intérêts, niveau de preuve | Auteur en mode `fonction` seulement |
| 7 | Calendrier, brief, santé du contenu | `AppelDemo` comme appel à l'action |

À chaque copie exacte créée, ajouter le fichier à la liste `FICHIERS` de
`scripts/verifier-socle.mjs` dans C1, puis `node scripts/verifier-socle.mjs --copier`.

## 6. Risques et parades

| Risque | Parade |
|---|---|
| Perte de positions pendant la reprise | Adresses inchangées, contrôle du plan du site avant et après, redirections au lot 3 |
| Installation déjà en production sur `blog_posts` | Vue de compatibilité pendant une version, ordre base puis code dans le `LISEZMOI.md` |
| Circuit trop lourd pour un petit site | Réglage « circuit simple » : brouillon → publié, les manques restent actifs |
| Règles d'écran et de base qui divergent | La base reste juge ; l'écran lit `manques_publication()`, la copie exacte ne sert qu'à l'affichage en direct |
| Noms réels dans le dépôt | Termes interdits et noms en base uniquement ; accroche vide dans le socle |
| Divergence qui revient | Une ligne du registre par fonction, passe à chaque version, logique pure en copie exacte |

## 7. Contrôles de fin de lot

- `npm run verifier`, `tests/db/run.sh`, `npm run build`.
- Recette `tests/e2e/plan.ts` : visiteur, membre, rédacteur, admin.
- Dans C1 : `node scripts/verifier-socle.mjs --verifier`, puis la recette locale.
- Une ligne au journal de `docs/SYNCHRO.md`.
