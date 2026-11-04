# Registre de synchronisation socle ↔ installations

Le socle CDS et ses installations avancent en parallèle. Sans suivi, ils s'écartent l'un de
l'autre. Ce registre dit, fonction par fonction, qui fait référence, où en est l'écart, et dans
quel sens porter le code. Il vit dans le socle. Chaque installation y a sa colonne.

Installations suivies :

| Installation | Dépôt | Lien au socle | Commit du socle copié |
|---|---|---|---|
| Le premier clone (C1) | Dépôt propre à l'installation (noté dans son `socle.json`) | Clone de conception, **sans historique git commun** (né avant le socle) | Commit du socle noté dans `socle.json` |

Le socle reste neutre (`tests/unit/socle-neutre.test.ts`) : une installation y porte un code
(C1, C2…). La correspondance entre ce code et le dépôt réel vit dans l'installation, jamais ici.

Mesure du 03/11/2026 : 97 chemins de fichiers communs, dont 25 identiques. Pas de dossier
`src/greffe/` dans le premier clone. La fusion de `main` du socle (`docs/MISE_A_NIVEAU.md`) ne
s'applique donc pas au premier clone : le portage se fait fonction par fonction, avec ce registre.

## Trois niveaux de synchronisation

1. **Copie exacte.** Le fichier est identique, octet pour octet (fins de ligne ignorées). Il ne se
   modifie que dans le socle, puis revient par `node scripts/verifier-socle.mjs --copier`. Le hook
   `pre-commit` de l'installation refuse une copie modifiée. C'est le niveau le moins cher : on le
   vise dès que le code peut être partagé tel quel.
2. **Fonction portée.** Même besoin, code adapté de chaque côté (noms de tables, droits, écrans).
   Le registre dit qui fait référence et l'état de l'écart. Le portage se fait à la main, par une
   demande de fusion qui cite la ligne du registre.
3. **Propre au projet.** Le métier d'une installation ou un module que l'autre n'a pas. Jamais
   synchronisé. Noté ici pour ne plus se poser la question.

Règle de conception : quand une fonction portée contient de la logique pure (calculs, règles,
formats), on la sort dans un fichier sans dépendance (pas d'appel à la base, pas d'écran). Ce
fichier passe alors en copie exacte. Moins de code porté à la main, donc moins d'écarts.

## Rythme

- **À chaque version du socle** : relire les lignes « écart », porter ce qui est prêt, mettre la
  date à jour.
- **Au moins une fois par mois** si aucune version ne sort.
- **Au fil de l'eau** : une installation qui corrige un outil commun suit `docs/REMONTEES.md`
  (la correction part du socle, jamais de la copie).

Contrôle rapide du côté de l'installation :

```bash
node scripts/verifier-socle.mjs --comparer ../<dossier du socle>
```

## Légende

- **Réf.** : qui fait référence. `S` socle, `C1` le premier clone, `=` équivalents.
- **Niveau** : `copie`, `portée`, `propre`.
- **État** : `aligné`, `écart`, `à décider`, `propre`.
- **Sens** : `S→C1`, `C1→S`, `⇄` (chacun apporte une partie), `—`.

## Registre

### Charte et outillage

| Fonction | Réf. | Niveau | État | Sens | Fichiers / remarque | Dernière passe |
|---|---|---|---|---|---|---|
| Jetons de couleur | S | copie | aligné | S→C1 | `tokens/cds.tokens.json`, `scripts/jetons.mjs` | 28/10/2026 |
| Cliquet de la charte | S | copie | aligné | S→C1 | `scripts/cliquet-charte.mjs` | 28/10/2026 |
| Règles ESLint de la charte | S | copie | aligné | S→C1 | `eslint-rules/charte.js` | 28/10/2026 |
| Contrôle des couleurs | S | copie | aligné | S→C1 | `scripts/verifier-couleurs.mjs` | 28/10/2026 |
| Couleurs de données lisibles | S | copie | aligné | S→C1 | `src/lib/couleurs.ts` | 28/10/2026 |
| Contrôle des contrastes | ⇄ | portée | écart | ⇄ | `scripts/verifier-contrastes.mjs` : paires propres à chaque projet. Candidat copie si les paires sortent dans un fichier de données | 03/11/2026 |
| Composants `src/components/ui/` | S | portée | écart | S→C1 | 11 fichiers communs différents (`button`, `card`, `input`…). Candidat copie exacte | 03/11/2026 |
| Composants de charte | C1 | portée | à décider | C1→S | `src/components/charte/` (carte de section, barre d'avancement, pastille) | 03/11/2026 |
| Robot de recette | S | portée | écart | S→C1 | `tests/e2e/recette.ts` porté du socle. Audit du rendu `tests/e2e/rendu.ts` né dans C1 : candidat C1→S | 03/11/2026 |

### Socle technique

| Fonction | Réf. | Niveau | État | Sens | Fichiers / remarque | Dernière passe |
|---|---|---|---|---|---|---|
| Connexion Supabase | — | propre | propre | — | `src/integrations/supabase/*` : propres à chaque installation (Lovable) | 03/11/2026 |
| Types générés | — | propre | propre | — | `types.ts`, `routeTree.gen.ts` : régénérés, jamais portés | 03/11/2026 |
| Session et rôles | ⇄ | portée | écart | ⇄ | `src/hooks/useAuth.tsx` : rôles différents (C1 : membre, rédacteur, modérateur, admin, démo) | 03/11/2026 |
| E-mails d'authentification | S | portée | écart | S→C1 | `src/lib/email-templates/*` | 03/11/2026 |
| Pages d'erreur | S | portée | écart | S→C1 | `src/lib/error-page.ts` | 03/11/2026 |
| Messages d'erreur en français | C1 | portée | à décider | C1→S | `src/lib/erreurs.ts` (`erreurFrancaise`, formules de refus) | 03/11/2026 |
| Charte de rédaction | S | portée | aligné | S→C1 | `docs/redaction/CHARTE_REDACTION_CDS.md`, citée par C1 | 03/11/2026 |

### Contenus éditoriaux, référencement, recherche

Plan détaillé : `docs/plans/CONTENUS_EDITORIAUX.md`. Décision du 03/11/2026 : le modèle
`contenus_publics` du premier clone devient la référence commune.

| Fonction | Réf. | Niveau | État | Sens | Fichiers / remarque | Dernière passe |
|---|---|---|---|---|---|---|
| Modèle des articles | C1 | portée | aligné | C1→S | Socle 1.9.0 : `contenus_publics` remplace `blog_posts`. Restent au lot 2 : `statut` et les champs du circuit | 03/11/2026 |
| Longueur du corps | S | portée | écart | S→C1 | Socle : 100 000 caractères (guides piliers) ; C1 : 30 000 | 03/11/2026 |
| Colonnes du socle absentes de C1 | S | portée | écart | S→C1 | `image_url`, `image_alt`, `etiquettes`, `auteur_id` | 03/11/2026 |
| Circuit de rédaction | C1 | portée | aligné | C1→S | Socle 1.10.0 : statuts, passages, journal, versions. Le socle ajoute le circuit simple (S→C1 à décider) | 03/11/2026 |
| Manques avant publication | C1 | portée | aligné | C1→S | Socle 1.10.0, exigences réglables | 03/11/2026 |
| Règles d'écran du circuit | S | copie | écart | S→C1 | `src/lib/editorial-regles.ts` copié dans C1 le 03/11/2026, pas encore branché : son poste éditorial lit encore son `editorial.ts` (API différente : `STATUTS` avec ton et icône, `actionsPossibles`, `prochaineAction`) | 03/11/2026 |
| Termes interdits | C1 | portée | aligné | C1→S | Socle 1.10.0 ; noms d'une installation par `greffe_termes_nominatifs`. C1 garde sa version à expressions régulières (personnes, chirurgiens) | 03/11/2026 |
| Sources, relecture, auteur | C1 | portée | aligné | C1→S | Socle 1.10.0 ; le socle ajoute `auteur_nom` et l'affichage par réglage (D3) | 03/11/2026 |
| Liens de sources morts | ⇄ | portée | aligné | ⇄ | Socle 1.12.0 : même table ; le socle vérifie avec la session du rédacteur et refuse les adresses privées (`sources-verif.ts`, copié dans C1 le 03/11/2026, pas encore branché) | 03/11/2026 |
| Protection des adresses externes | C1 | portée | à décider | C1→S | `src/lib/adresse-externe.server.ts` de C1 : https obligatoire, hôte local ou privé refusé tel qu'écrit puis après résolution DNS de chaque adresse IP, contrôle refait à chaque redirection. Plus solide que `sources-verif.ts` du socle | 03/11/2026 |
| Pilier et satellites | C1 | portée | aligné | C1→S | Socle 1.11.0 : contrôle en base (manque « pilier ») et satellites absents du pilier | 03/11/2026 |
| Taxonomie | S | portée | écart | S→C1 | Socle 1.11.0 : rubriques, étiquettes contrôlées, séries, pages publiques | 03/11/2026 |
| Contrôles de maillage | S | portée | écart | S→C1 | Socle 1.11.0 : liens cassés ou redirigés, orphelins, ancres pauvres, requête en double (`maillage_etat`) | 03/11/2026 |
| Règles d'écran du maillage | S | copie | écart | S→C1 | `src/lib/maillage.ts` copié dans C1 le 03/11/2026, branché avec la taxonomie (migration à porter) | 03/11/2026 |
| Redirections | S | portée | écart | S→C1 | Socle 1.11.0 : redirection 301 automatique au changement d'adresse | 03/11/2026 |
| Liste du blog | S | portée | écart | S→C1 | Recherche, étiquettes, pagination, durée de lecture (`src/lib/blog.ts` → copie) | 03/11/2026 |
| Image de couverture | S | portée | écart | S→C1 | `cover_url` absent de C1 | 03/11/2026 |
| RSS | S | portée | écart | S→C1 | `src/routes/rss[.]xml.tsx` absent de C1 ; socle 1.12.0 : flux par rubrique et par étiquette | 03/11/2026 |
| « À lire ensuite » | S | portée | écart | S→C1 | Socle 1.11.0 : `lire_ensuite` (pilier et frères, étiquettes, rubrique, série) ; absent de C1 | 03/11/2026 |
| Partage, signalement | S | portée | écart | S→C1 | `ShareButtons`, `ReportButton` | 03/11/2026 |
| Commentaires d'articles | S | portée | propre | — | C1 ne les reprend pas (site anonymisé) | 03/11/2026 |
| Publicité dans le blog | S | portée | propre | — | `AdSlot` : C1 ne le reprend pas | 03/11/2026 |
| Appel à l'action en fin d'article | S | portée | écart | S→C1 | Socle 1.15.0 : `appels_action`, réglable par article ou pour le site ; C1 peut y ranger son `AppelDemo` ; `pilotage.ts` copié dans C1 le 03/11/2026, pas encore branché | 03/11/2026 |
| Données structurées article | S | copie | aligné | S→C1 | `src/lib/article-donnees.ts` copié et branché dans C1 le 03/11/2026 par un pont propre à C1 (auteur par fonction, `MedicalWebPage`, ni rubrique ni questions-réponses tant que sa table ne les a pas) | 03/11/2026 |
| Rendu du texte | S | copie | écart | S→C1 | `src/lib/corps.ts` copié dans C1 le 03/11/2026 (seul `nombreDeMots` sert) ; `CorpsArticle` reste à porter : il remplace le rendu de C1 et ouvre les questions-réponses en données structurées | 03/11/2026 |
| Recherche plein texte | S | portée | écart | S→C1 | Socle 1.13.0 : `recherche_articles` (opérateurs, synonymes, facettes, extrait surligné, pondération), suggestion de mot proche, recherches sans résultat. C1 garde sa configuration sans racine (candidat C1→S) | 03/11/2026 |
| Plan du site XML | S | portée | écart | ⇄ | S : `lastmod` réel par page ; C1 : programmation respectée | 03/11/2026 |
| Lexique public | C1 | portée | à décider | C1→S | `/lexique`, `DefinedTerm` : base du lien automatique vers les définitions | 03/11/2026 |
| Bibliographie (société savante) | S | portée | aligné | S→C1 | Socle 1.14.0 : `references_contenu`, manque « references », appels [n] liés, liste Vancouver. C1 : migration `20270303120000`, test 117, panneau « Références » de l'écran éditorial (demande de fusion #317 de C1). Correctif C1→S candidat : la regex du manque `[[]([0-9]{1,3})[]]([^(]|$)` consomme le caractère suivant et ne voit pas [2] dans « [1][2] » ; C1 lit par anticipation `(?![(])`, comme `bibliographie.ts` | 03/11/2026 |
| Exigences d'une société savante (hors bibliographie) | S | portée | écart | S→C1 | Socle 1.14.0 : liens d'intérêts, niveau de preuve, genres, relecteurs. Non repris dans C1 : seulement sur demande du propriétaire | 03/11/2026 |
| Lien Search Console | C1 | portée | aligné | C1→S | Socle 1.12.0 : dans `article-donnees.ts` | 03/11/2026 |
| Pages construites (sections) | S | propre | propre | — | Table `pages` du socle : pages d'atterrissage, distinctes des contenus éditoriaux | 03/11/2026 |

### Modules

| Fonction | Réf. | Niveau | État | Sens | Remarque | Dernière passe |
|---|---|---|---|---|---|---|
| FAQ | ⇄ | portée | écart | ⇄ | Les deux ont `/faq` | 03/11/2026 |
| Recherche globale `/recherche` | ⇄ | portée | écart | ⇄ | Voir lot 4 du plan | 03/11/2026 |
| Lettre d'information | S | portée | à décider | S→C1 | Utile pour diffuser les articles | 03/11/2026 |
| Forum, annuaire, boutique, formations, petites annonces, messagerie, CRM | S | propre | propre | — | Non utilisés par C1 à ce jour | 03/11/2026 |
| Modules métier de C1 | C1 | propre | propre | — | Référentiels et outils propres à son métier | 03/11/2026 |

## Journal

| Date | Passe | Fait |
|---|---|---|
| 03/11/2026 | Création | Mesure des deux dépôts, première version du registre, décision « modèle `contenus_publics` » |
| 03/11/2026 | Socle 1.9.0 | Lot 1 : articles du socle dans `contenus_publics`. Nouveaux écarts S→C1 : longueur du corps, colonnes du socle |
| 03/11/2026 | Socle 1.10.0 | Lot 2 : circuit de rédaction. Nouveaux écarts S→C1 : règles d'écran en copie exacte, circuit simple, exigences réglables, `auteur_nom` |
| 03/11/2026 | Socle 1.11.0 | Lot 3 : taxonomie et maillage. Nouveaux écarts S→C1 : taxonomie, contrôles de maillage, `maillage.ts`, redirections, « À lire ensuite » |
| 03/11/2026 | Socle 1.12.0 | Lot 4 : référencement technique. Nouvelles copies exactes S→C1 : `corps.ts`, `article-donnees.ts` ; flux filtrés, plan du site des images |
| 03/11/2026 | Socle 1.13.0 | Lot 5 : recherche avancée. Nouvel écart S→C1 : recherche des articles en base, synonymes (C1 peut les remplir depuis son glossaire), recherches sans résultat |
| 03/11/2026 | Socle 1.14.0 | Lot 6 : société savante. Nouveaux écarts S→C1 : bibliographie (`bibliographie.ts` en copie exacte), liens d'intérêts, niveau de preuve, genres, relecteurs ; accès membres reporté |
| 03/11/2026 | Socle 1.15.0 | Lot 7 : pilotage. Nouveaux écarts S→C1 : appels à l'action (C1 : `AppelDemo` devient un encart réglable), intention, `pilotage.ts`, santé du contenu |
| 03/11/2026 | Recette et retour vers C1 | Base du socle passée de 1.8.0 à 1.15.0, recette des lots 2 à 7 (plan, « Recette du 03/11/2026 »). Sept copies exactes ajoutées à `verifier-socle.mjs` de C1 ; `article-donnees.ts` branché, les six autres en attente de leur migration ou de leur écran |
| 04/11/2026 | Socle 1.15.1 | Correctifs de la recette : seuil de la suggestion à 0,3, pages introuvables du blog en `noindex`. Rien à copier pour C1 (fonction portée, sa recherche diffère) |
| 05/11/2026 | Socle 1.15.2 | Audit : `search_tags`, `search_excerpt`, `geo_distance_km` fixent `search_path` ; test 37 refuse toute fonction de `public` sans. Rien à copier pour C1 (sa migration `20270301120000` fait de même, test 115) |
| 03/11/2026 | Bibliographie portée dans C1 | Ligne « Société savante » scindée : bibliographie alignée (C1 #317), le reste en écart. Remontées C1→S notées : protection des adresses externes, regex des appels « [1][2] » du manque « references » |
