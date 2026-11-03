# Registre de synchronisation socle ↔ installations

Le socle CDS et ses installations avancent en parallèle. Sans suivi, ils s'écartent l'un de
l'autre. Ce registre dit, fonction par fonction, qui fait référence, où en est l'écart, et dans
quel sens porter le code. Il vit dans le socle. Chaque installation y a sa colonne.

Installations suivies :

| Installation | Dépôt | Lien au socle | Commit du socle copié |
|---|---|---|---|
| Bloc Notes (DB&M) | `menywise/dbm-mac97000` | Clone de conception, **sans historique git commun** (né le 12/08/2026, avant le socle) | `b00189dd` (`socle.json`) |

Mesure du 03/11/2026 : 97 chemins de fichiers communs, dont 25 identiques. Pas de dossier
`src/greffe/` dans Bloc Notes. La fusion de `main` du socle (`docs/MISE_A_NIVEAU.md`) ne
s'applique donc pas à Bloc Notes : le portage se fait fonction par fonction, avec ce registre.

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
node scripts/verifier-socle.mjs --comparer ../cds-mac97000
```

## Légende

- **Réf.** : qui fait référence. `S` socle, `BN` Bloc Notes, `=` équivalents.
- **Niveau** : `copie`, `portée`, `propre`.
- **État** : `aligné`, `écart`, `à décider`, `propre`.
- **Sens** : `S→BN`, `BN→S`, `⇄` (chacun apporte une partie), `—`.

## Registre

### Charte et outillage

| Fonction | Réf. | Niveau | État | Sens | Fichiers / remarque | Dernière passe |
|---|---|---|---|---|---|---|
| Jetons de couleur | S | copie | aligné | S→BN | `tokens/cds.tokens.json`, `scripts/jetons.mjs` | 28/10/2026 |
| Cliquet de la charte | S | copie | aligné | S→BN | `scripts/cliquet-charte.mjs` | 28/10/2026 |
| Règles ESLint de la charte | S | copie | aligné | S→BN | `eslint-rules/charte.js` | 28/10/2026 |
| Contrôle des couleurs | S | copie | aligné | S→BN | `scripts/verifier-couleurs.mjs` | 28/10/2026 |
| Couleurs de données lisibles | S | copie | aligné | S→BN | `src/lib/couleurs.ts` | 28/10/2026 |
| Contrôle des contrastes | ⇄ | portée | écart | ⇄ | `scripts/verifier-contrastes.mjs` : paires propres à chaque projet. Candidat copie si les paires sortent dans un fichier de données | 03/11/2026 |
| Composants `src/components/ui/` | S | portée | écart | S→BN | 11 fichiers communs différents (`button`, `card`, `input`…). Candidat copie exacte | 03/11/2026 |
| Composants de charte | BN | portée | à décider | BN→S | `src/components/charte/` (carte de section, barre d'avancement, pastille) | 03/11/2026 |
| Robot de recette | S | portée | écart | S→BN | `tests/e2e/recette.ts` porté du socle. Audit du rendu `tests/e2e/rendu.ts` né dans BN : candidat BN→S | 03/11/2026 |

### Socle technique

| Fonction | Réf. | Niveau | État | Sens | Fichiers / remarque | Dernière passe |
|---|---|---|---|---|---|---|
| Connexion Supabase | — | propre | propre | — | `src/integrations/supabase/*` : propres à chaque installation (Lovable) | 03/11/2026 |
| Types générés | — | propre | propre | — | `types.ts`, `routeTree.gen.ts` : régénérés, jamais portés | 03/11/2026 |
| Session et rôles | ⇄ | portée | écart | ⇄ | `src/hooks/useAuth.tsx` : rôles différents (BN : membre, rédacteur, modérateur, admin, démo) | 03/11/2026 |
| E-mails d'authentification | S | portée | écart | S→BN | `src/lib/email-templates/*` | 03/11/2026 |
| Pages d'erreur | S | portée | écart | S→BN | `src/lib/error-page.ts` | 03/11/2026 |
| Messages d'erreur en français | BN | portée | à décider | BN→S | `src/lib/erreurs.ts` (`erreurFrancaise`, formules de refus) | 03/11/2026 |
| Charte de rédaction | S | portée | aligné | S→BN | `docs/redaction/CHARTE_REDACTION_CDS.md`, citée par BN | 03/11/2026 |

### Contenus éditoriaux, référencement, recherche

Plan détaillé : `docs/plans/CONTENUS_EDITORIAUX.md`. Décision du 03/11/2026 : le modèle
`contenus_publics` de Bloc Notes devient la référence commune.

| Fonction | Réf. | Niveau | État | Sens | Fichiers / remarque | Dernière passe |
|---|---|---|---|---|---|---|
| Modèle des articles | BN | portée | écart | BN→S | `contenus_publics` remplace `blog_posts` dans le socle (lot 1) | 03/11/2026 |
| Circuit de rédaction | BN | portée | écart | BN→S | Statuts, passages, journal, versions (lot 2) | 03/11/2026 |
| Manques avant publication | BN | portée | écart | BN→S | `manques_publication()` ; miroir écran `manquesSaisie()` → copie exacte | 03/11/2026 |
| Termes interdits | BN | portée | écart | BN→S | `termes_interdits_publics`, `contenus_publics_a_revoir()` ; liste des noms par une accroche | 03/11/2026 |
| Sources, relecture, auteur | BN | portée | écart | BN→S | `sources`, `relu_le`, `auteur_fonction`, avertissement réglable | 03/11/2026 |
| Liens de sources morts | BN | portée | écart | BN→S | `liens_sources_etat` | 03/11/2026 |
| Pilier et satellites | BN | portée | écart | BN→S | `est_pilier`, `pilier_id`, `renvoieVersPilier()` | 03/11/2026 |
| Liste du blog | S | portée | écart | S→BN | Recherche, étiquettes, pagination, durée de lecture (`src/lib/blog.ts` → copie) | 03/11/2026 |
| Image de couverture | S | portée | écart | S→BN | `cover_url` absent de BN | 03/11/2026 |
| RSS | S | portée | écart | S→BN | `src/routes/rss[.]xml.tsx` absent de BN | 03/11/2026 |
| « À lire ensuite » | S | portée | écart | S→BN | Absent de BN | 03/11/2026 |
| Partage, signalement | S | portée | écart | S→BN | `ShareButtons`, `ReportButton` | 03/11/2026 |
| Commentaires d'articles | S | portée | propre | — | BN ne les reprend pas (site santé anonymisé) | 03/11/2026 |
| Publicité dans le blog | S | portée | propre | — | `AdSlot` : BN ne le reprend pas | 03/11/2026 |
| Appel à l'action en fin d'article | BN | portée | à décider | BN→S | `AppelDemo` → encart réglable du socle | 03/11/2026 |
| Données structurées article | ⇄ | portée | écart | ⇄ | S : fil d'Ariane ; BN : relecture et sources (`article-donnees.ts` → copie) | 03/11/2026 |
| Rendu du texte | ⇄ | portée | écart | ⇄ | S `src/lib/richtext.tsx`, BN `src/components/Corps.tsx` : deux syntaxes proches → un seul moteur, copie exacte | 03/11/2026 |
| Recherche plein texte | BN | portée | écart | BN→S | Les deux : `unaccent` + racines françaises. BN ajoute la recherche par début de mot (`:*`) et une configuration sans racine | 03/11/2026 |
| Plan du site XML | S | portée | écart | ⇄ | S : `lastmod` réel par page ; BN : programmation respectée | 03/11/2026 |
| Lexique public | BN | portée | à décider | BN→S | `/lexique`, `DefinedTerm` : base du lien automatique vers les définitions | 03/11/2026 |
| Lien Search Console | BN | portée | écart | BN→S | `lienSearchConsole()` | 03/11/2026 |
| Pages construites (sections) | S | propre | propre | — | Table `pages` du socle : pages d'atterrissage, distinctes des contenus éditoriaux | 03/11/2026 |

### Modules

| Fonction | Réf. | Niveau | État | Sens | Remarque | Dernière passe |
|---|---|---|---|---|---|---|
| FAQ | ⇄ | portée | écart | ⇄ | Les deux ont `/faq` | 03/11/2026 |
| Recherche globale `/recherche` | ⇄ | portée | écart | ⇄ | Voir lot 4 du plan | 03/11/2026 |
| Lettre d'information | S | portée | à décider | S→BN | Utile pour diffuser les articles | 03/11/2026 |
| Forum, annuaire, boutique, formations, petites annonces, messagerie, CRM | S | propre | propre | — | Non utilisés par BN à ce jour | 03/11/2026 |
| Modules bloc opératoire | BN | propre | propre | — | Glossaire, thésaurus, picking, planning, sutures, pharmacie… | 03/11/2026 |

## Journal

| Date | Passe | Fait |
|---|---|---|
| 03/11/2026 | Création | Mesure des deux dépôts, première version du registre, décision « modèle `contenus_publics` » |
