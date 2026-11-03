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
| Règles d'écran du circuit | S | copie | écart | S→C1 | `src/lib/editorial-regles.ts`, sans dépendance : à copier tel quel dans C1 (remplace une partie de son `editorial.ts`) | 03/11/2026 |
| Termes interdits | C1 | portée | aligné | C1→S | Socle 1.10.0 ; noms d'une installation par `greffe_termes_nominatifs`. C1 garde sa version à expressions régulières (personnes, chirurgiens) | 03/11/2026 |
| Sources, relecture, auteur | C1 | portée | aligné | C1→S | Socle 1.10.0 ; le socle ajoute `auteur_nom` et l'affichage par réglage (D3) | 03/11/2026 |
| Liens de sources morts | ⇄ | portée | aligné | ⇄ | Socle 1.12.0 : même table ; le socle vérifie avec la session du rédacteur et refuse les adresses privées (`sources-verif.ts`, candidat copie) | 03/11/2026 |
| Pilier et satellites | C1 | portée | aligné | C1→S | Socle 1.11.0 : contrôle en base (manque « pilier ») et satellites absents du pilier | 03/11/2026 |
| Taxonomie | S | portée | écart | S→C1 | Socle 1.11.0 : rubriques, étiquettes contrôlées, séries, pages publiques | 03/11/2026 |
| Contrôles de maillage | S | portée | écart | S→C1 | Socle 1.11.0 : liens cassés ou redirigés, orphelins, ancres pauvres, requête en double (`maillage_etat`) | 03/11/2026 |
| Règles d'écran du maillage | S | copie | écart | S→C1 | `src/lib/maillage.ts`, sans dépendance : à copier tel quel dans C1 | 03/11/2026 |
| Redirections | S | portée | écart | S→C1 | Socle 1.11.0 : redirection 301 automatique au changement d'adresse | 03/11/2026 |
| Liste du blog | S | portée | écart | S→C1 | Recherche, étiquettes, pagination, durée de lecture (`src/lib/blog.ts` → copie) | 03/11/2026 |
| Image de couverture | S | portée | écart | S→C1 | `cover_url` absent de C1 | 03/11/2026 |
| RSS | S | portée | écart | S→C1 | `src/routes/rss[.]xml.tsx` absent de C1 ; socle 1.12.0 : flux par rubrique et par étiquette | 03/11/2026 |
| « À lire ensuite » | S | portée | écart | S→C1 | Socle 1.11.0 : `lire_ensuite` (pilier et frères, étiquettes, rubrique, série) ; absent de C1 | 03/11/2026 |
| Partage, signalement | S | portée | écart | S→C1 | `ShareButtons`, `ReportButton` | 03/11/2026 |
| Commentaires d'articles | S | portée | propre | — | C1 ne les reprend pas (site anonymisé) | 03/11/2026 |
| Publicité dans le blog | S | portée | propre | — | `AdSlot` : C1 ne le reprend pas | 03/11/2026 |
| Appel à l'action en fin d'article | C1 | portée | à décider | C1→S | `AppelDemo` → encart réglable du socle | 03/11/2026 |
| Données structurées article | S | copie | écart | S→C1 | Socle 1.12.0 : `src/lib/article-donnees.ts` sans dépendance (relecture, sources, auteur, rubrique, étiquettes, série, questions-réponses, type de page) : à copier dans C1 | 03/11/2026 |
| Rendu du texte | S | copie | écart | S→C1 | Socle 1.12.0 : `src/lib/corps.ts` (analyse, copie exacte) et `CorpsArticle` ; reprend la syntaxe de C1 et ajoute sommaire, encadré, questions-réponses, listes numérotées | 03/11/2026 |
| Recherche plein texte | S | portée | écart | S→C1 | Socle 1.13.0 : `recherche_articles` (opérateurs, synonymes, facettes, extrait surligné, pondération), suggestion de mot proche, recherches sans résultat. C1 garde sa configuration sans racine (candidat C1→S) | 03/11/2026 |
| Plan du site XML | S | portée | écart | ⇄ | S : `lastmod` réel par page ; C1 : programmation respectée | 03/11/2026 |
| Lexique public | C1 | portée | à décider | C1→S | `/lexique`, `DefinedTerm` : base du lien automatique vers les définitions | 03/11/2026 |
| Exigences d'une société savante | S | portée | écart | S→C1 | Socle 1.14.0 : `references_contenu`, liens d'intérêts, niveau de preuve, genres, relecteurs ; `bibliographie.ts` candidat copie exacte | 03/11/2026 |
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
