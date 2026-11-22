# Radar des installations

Le socle et ses installations avancent chacun de leur côté. Sans mesure, un écart passe inaperçu :
une base du socle est déjà restée deux versions derrière son code sans que personne ne le voie. Le
radar dit où chaque installation en est, dans les deux sens, et propose une action par écart.

**Il constate et propose. Il ne corrige rien.** Toutes ses lectures de base sont en lecture seule,
il n'écrit dans aucun dépôt, il ne porte aucun code.

Le socle reste neutre : ce document et `scripts/radar-socle.mjs` ne nomment aucune installation. Le
recensement se refait à chaque passage, à partir des projets de la plateforme ; les observations et
le rapport, qui nomment les installations, vivent hors du dépôt.

## Ce que le radar mesure

| Écart           | Mesure                                                                                                                         | Action proposée                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| socle en avance | Version du code de l'installation inférieure à celle du socle. Versions à porter listées, avec leur niveau.                    | Fusion du socle (Remix) ou portage par `docs/SYNCHRO.md`.       |
| socle en avance | Copie exacte (`socle.json`) dont le socle a changé le fichier depuis la copie.                                                 | `node scripts/verifier-socle.mjs --copier` dans l'installation. |
| base en retard  | Version enregistrée en base (réglage « socle », `socle_installation`) inférieure à celle du code, ou absente.                  | Passer les blocs `supabase/seed/` des versions manquantes.      |
| base en retard  | Objet témoin d'une version (table ou fonction créée par elle) absent d'une base dont le code a cette version. Remix seulement. | Passer le bloc de contrôle de la version, puis ses blocs.       |
| site en avance  | Fichier ajouté par un Remix hors des emplacements de greffe.                                                                   | Question : à remonter au socle, ou à ranger dans la greffe ?    |
| site en avance  | Ligne du registre de synchronisation encore ouverte dans le sens installation → socle.                                         | Question : remonter, reporter, ou classer propre au projet ?    |
| dormante        | Aucune modification depuis 30 jours, en retard sur le socle.                                                                   | Question : mettre à niveau, ou archiver ?                       |

Un ajout n'est jamais porté seul : le radar pose la question, le propriétaire décide.

## Empreinte d'une installation

Un projet de la plateforme est une installation du socle s'il porte l'un de ces marqueurs, du plus
sûr au plus ancien :

1. `socle.json` à la racine (clone par copie, sans historique commun) : dépôt du socle, version et
   commit copiés, empreinte de chaque copie exacte. Lien « copie ».
2. `src/greffe/index.ts` dont la prise est remplie (Remix d'un socle 1.3.0 ou plus récent). Lien « remix ».
3. `CDS_TOKENS.md` ou `tokens/cds.tokens.json` sans prise de greffe (Remix d'avant la 1.3.0). Lien « remix ».

Un Remix naît après le socle : un projet créé avant la date de création du socle ne peut être
qu'un clone par copie, et seul `socle.json` le signale. Cette règle évite de lire les marqueurs de
chaque projet ancien.

## Version du code

- Copie : champ `version` de `socle.json`.
- Remix : `src/config/socle.ts` quand il existe (socle 1.19.0 et plus), sinon le dernier dossier
  `supabase/seed/vX_Y_Z/` du projet (le Remix copie les blocs de chaque version).

## Version de la base

`node scripts/radar-socle.mjs sonde` écrit une requête unique, en lecture seule, qui rend :

- le réglage « socle » de `site_settings` et les lignes de `socle_installation`, quand ces tables
  existent (la requête ne casse pas sur une base qui ne les a pas) ;
- pour chaque version, le nombre d'objets témoins présents sur le nombre attendu. Les témoins sont
  tirés des migrations du socle : tables et fonctions créées pour la première fois par une version,
  jamais supprimées ni renommées ensuite. Une version sans témoin (correctif de droits) ne se mesure
  pas ainsi.

Les témoins ne valent que pour un Remix. Un clone par copie porte les fonctions sous ses propres
noms : pour lui, seule compte la version enregistrée en base. Une base sans version enregistrée
est signalée, car son retard ne se verrait pas.

## Passage hebdomadaire

Une tâche planifiée ouvre chaque semaine une session neuve, avec le dépôt du socle et l'accès aux
projets de la plateforme. Pas d'action GitHub : les bases ne se lisent que par une session qui a cet
accès. Étapes :

1. Lister les projets de chaque espace de travail (date de création, date de dernière modification).
2. Recenser par l'empreinte ci-dessus : marqueurs lus fichier par fichier (une lecture refusée
   « introuvable » coûte peu).
3. Pour chaque installation : version du code, sonde de la base.
4. Pour un Remix modifié depuis le passage précédent : liste de ses chemins (une page de 100 chemins
   par appel), confiée à un agent qui l'écrit dans un fichier ; un Remix non modifié garde la liste
   précédente.
5. Écrire les observations dans un fichier JSON hors du dépôt, puis
   `node scripts/radar-socle.mjs rapport <observations.json>`.
6. Publier le rapport ; notifier le propriétaire seulement si la première ligne dit « Écarts : » suivi
   d'un nombre non nul.

Format des observations :

```json
{
  "date": "2026-11-22",
  "installations": [
    {
      "nom": "Le premier clone",
      "lien": "copie",
      "code_version": "1.19.0",
      "derniere_modif": "2026-11-22",
      "sonde": { "reglage": null, "installation": null, "temoins": { "1.19.0": [2, 2] } },
      "manifeste": { "fichiers": { "src/lib/registre.ts": "8117aada5c6d566f" } }
    },
    {
      "nom": "Un remix",
      "lien": "remix",
      "code_version": "1.15.7",
      "derniere_modif": "2026-11-07",
      "sonde": { "reglage": "1.15.7", "installation": "1.15.7", "temoins": {} },
      "chemins": ["src/greffe/index.ts", "..."]
    }
  ]
}
```

Le socle s'y inscrit lui-même (lien « socle ») : sa base est mesurée comme les autres.

## Coût d'un passage

Mesuré au premier passage (22/11/2026, 28 projets, 4 installations) :

| Étape                                   | Coût approché               |
| --------------------------------------- | --------------------------- |
| Liste des projets et marqueurs          | 30 000 jetons               |
| Sondes des bases (une requête par base) | 3 000 jetons par base       |
| Chemins d'un Remix (500 à 700 fichiers) | 100 000 jetons, par agent   |
| Rapport                                 | quelques milliers de jetons |

Un passage sans Remix modifié coûte environ 50 000 jetons. Chaque Remix modifié dans la semaine en
ajoute environ 100 000. Les chemins ne se relisent donc que pour un Remix modifié.

## Limites connues

- Le radar ne lit pas le contenu des fichiers d'un Remix : un fichier du socle modifié en place (au
  lieu d'une greffe) n'apparaît pas. Seuls les ajouts hors greffe se voient.
- Une installation qui a créé elle-même une table au nom d'un témoin la fait compter comme reçue.
- Un dépôt sans projet sur la plateforme n'est pas vu : le recensement part des projets.
