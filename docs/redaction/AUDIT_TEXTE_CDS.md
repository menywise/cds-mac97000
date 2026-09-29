# Grille de notation et prompt d'audit — socle CDS

```
EN-TÊTE
* pourquoi          : noter une page sur 100 et produire un rapport d'anomalies
                      exploitable par le robot de contrôle
* destination vault : _HOLOKAI\03_PROJETS\CDS\AUDIT_TEXTE_CDS.md
* dépend de         : text-rules.json (v1), CHARTE_REDACTION_CDS.md (v1.0)
* version           : v1.0
* état              : actif
* rédigé par        : Claude, sous DT Unuhi (peut contenir des erreurs)
```

---

## 1 — Grille de notation sur 100

**La pondération est un choix, pas une vérité.** Elle traduit une priorité :
un bouton raté coûte une conversion, un anglicisme coûte une hésitation.

| Bloc | Poids | Ce qu'il mesure |
|---|---|---|
| Boutons d'action | 30 | Longueur, verbe, bénéfice, formules interdites, unicité du principal |
| Mots interdits | 20 | Superlatifs creux, vocabulaire interne, ton Parent Critique |
| Lisibilité | 20 | Mots par phrase, longueur de paragraphe, score Kandel-Moles |
| Titres et méta | 15 | Longueur du H1, longueur de la description |
| Jargon | 10 | Anglicismes et termes techniques hors liste blanche |
| Marqueur de cible | 5 | Présence d'un mot désignant la cible dans H1 ou description |
| **Total** | **100** | |

### Règle de calcul

Chaque bloc part de son poids plein. On retranche par anomalie :

- **bloquant** — le bloc tombe à 0, et le score global est plafonné à 49.
- **majeur** — moins un tiers du poids du bloc.
- **mineur** — moins un dixième du poids du bloc.

Un bloc ne descend jamais sous zéro. Le score global est arrondi à l'entier.

### Rattachement de chaque règle à son bloc

Sans ce rattachement, la grille n'est pas implémentable.

| Clé de gravité | Bloc |
|---|---|
| ctaFormuleInterdite | Boutons d'action |
| ctaHorsRegles | Boutons d'action |
| ctaImperatifNu | Boutons d'action |
| ctaPrincipalMultiple | Boutons d'action |
| negationDansCta | Boutons d'action |
| motInterdit | Mots interdits |
| negation | Mots interdits |
| phraseTropLongue | Lisibilité |
| paragrapheTropLong | Lisibilité |
| lisibiliteInsuffisante | Lisibilité |
| h1HorsFormat | Titres et méta |
| descriptionHorsFormat | Titres et méta |
| negationDansTitre | Titres et méta |
| jargon | Jargon |
| marqueurCibleAbsent | Marqueur de cible |

### Lecture du score

- **85 et plus** — publiable.
- **70 à 84** — publiable après corrections mineures.
- **50 à 69** — à retravailler avant mise en ligne.
- **sous 50** — refusé. Un bloquant place toujours la page ici.

---

## 2 — Ordre d'évaluation

L'ordre compte : appliqué à l'envers, le robot produit des faux positifs.

1. **Liste blanche d'abord.** Un terme présent dans `termesProteges` sort de
   l'analyse. Il n'est ni jargon, ni mot interdit.
2. **Formules interdites de bouton.** Correspondance sur le libellé entier,
   jamais sur une sous-chaîne.
3. **Mots interdits**, sur le texte restant.
4. **Jargon**, sur le texte restant.
5. **Négations**, avec la gravité du contexte : majeure dans un bouton ou un
   titre, mineure ailleurs.
6. **Formats** — longueurs de H1, de description, de phrase, de paragraphe.
7. **Marqueur de cible** — H1 et description uniquement.

---

## 3 — Pièges d'implémentation

**« envoyer » figure dans les deux listes.** C'est voulu. Le libellé « Envoyer »
seul est interdit ; « Envoyer ma demande » est conforme. La règle porte sur le
libellé entier, jamais sur le verbe isolé.

**Impératif contre infinitif.** « Réservez » est refusé, « Réserver » est accepté.
Le contrôle se fait sur la terminaison du premier mot, pas sur une liste figée
de conjugaisons.

**Comptage des mots d'un bouton.** Les apostrophes et les traits d'union ne
séparent pas : « Rendez-vous » compte pour un mot.

**Négations en deux morceaux.** « ne ... pas » exige une détection sur la
phrase, pas sur une correspondance littérale de chaîne.

**Kandel-Moles.** La formule exige un compteur de syllabes en français. En
l'absence de compteur fiable, le contrôle se désactive et l'anomalie se note
`nonEvaluee` — jamais un score inventé.

**Trois règles restent humaines** et ne figurent pas dans `text-rules.json` :
promesse de fonctionnalité non livrée, véracité d'un chiffre ou d'un témoignage,
justesse du registre. Elles vont dans la revue de relecture.

---

## 4 — Prompt d'audit réutilisable

À coller tel quel, avec le contenu de `text-rules.json` et les textes de la page.

```
Tu es le contrôleur de qualité textuelle du socle CDS.

Tu reçois deux entrées :

RÈGLES — le contenu intégral de text-rules.json :
<<<
{coller ici text-rules.json}
>>>

PAGE — les textes de la page à auditer :
<<<
titre       : {titre de l'onglet}
description : {meta description}
h1          : {titre principal}
paragraphes : [{p1}, {p2}, ...]
cta         : [{libellé 1, rôle: principal|secondaire}, ...]
>>>

MÉTHODE

Applique les règles dans cet ordre, sans en sauter :
1. Écarte de l'analyse tout terme figurant dans termesProteges.
2. Contrôle chaque CTA : formulesInterdites sur le libellé entier, puis
   longueurMin/longueurMax en mots, puis verbe en tête à l'infinitif ou à la
   première personne, puis un seul CTA de rôle principal.
3. Cherche les motsInterdits dans tous les textes restants.
4. Cherche le jargon dans tous les textes restants.
5. Cherche les negationsAEviter. Gravité negationDansCta dans un CTA,
   negationDansTitre dans titre ou h1, negation ailleurs.
6. Contrôle les longueurs : h1LongueurMin, h1LongueurMax,
   descriptionLongueurMax, motsParPhraseMax, motsParParagrapheMax.
7. Contrôle qu'au moins un marqueursCible apparaît dans le h1 ou la description.

CALCUL DU SCORE

Six blocs, poids : cta 30, motsInterdits 20, lisibilite 20, titres 15,
jargon 10, cible 5.
Chaque bloc part de son poids plein.
Un bloquant met son bloc à 0 et plafonne le score global à 49.
Un majeur retire un tiers du poids du bloc.
Un mineur retire un dixième du poids du bloc.
Aucun bloc ne descend sous 0. Score global arrondi à l'entier.

CONTRAINTES

N'invente aucun chiffre, aucune statistique, aucune étude.
Chaque proposition de correction est un texte prêt à coller, écrit en français,
en construction positive, sans négation.
Une proposition ne dépasse jamais la longueur maximale de son type.
Si une règle ne peut pas être évaluée, indique-le au lieu de la noter au jugé.

SORTIE

Rends uniquement ce JSON, sans commentaire ni texte autour :

{
  "score": 0,
  "anomalies": [
    {
      "texte": "l'extrait fautif, mot pour mot",
      "regle": "la clé de gravité concernée",
      "gravite": "bloquant|majeur|mineur",
      "proposition": "le texte de remplacement, prêt à coller"
    }
  ]
}

Si la page ne présente aucune anomalie, rends {"score": 100, "anomalies": []}.
Rappel : dès qu'une anomalie bloquante existe, le score ne dépasse jamais 49.
```

---

## 5 — Exemple de sortie

```json
{
  "score": 49,
  "anomalies": [
    {
      "texte": "Cliquez ici",
      "regle": "ctaFormuleInterdite",
      "gravite": "bloquant",
      "proposition": "Demander mon devis gratuit"
    },
    {
      "texte": "Une solution innovante pour digitaliser votre activité",
      "regle": "motInterdit",
      "gravite": "majeur",
      "proposition": "Votre devis part le jour même, depuis votre téléphone"
    },
    {
      "texte": "Ne perdez plus de temps",
      "regle": "negationDansTitre",
      "gravite": "majeur",
      "proposition": "Gagnez six heures par semaine"
    },
    {
      "texte": "workflow",
      "regle": "jargon",
      "gravite": "mineur",
      "proposition": "processus"
    }
  ]
}
```

---

```
HISTORIQUE
* v1.0 — 2026-09-29 — Création sous DT Unuhi. Pondération signalée comme choix.
    Ordre d'évaluation imposé pour éviter les faux positifs sur la liste blanche.
    Trois règles explicitement laissées à la revue humaine.
```
