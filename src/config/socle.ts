/**
 * Version du socle livrée par ce code (socle 1.19.0), affichée dans le pied de page sous la forme
 * « Socle 1.19.0 », sans la marque du socle (identité neutre, tests/unit/identite-neutre.test.ts).
 * Même numéro que la dernière migration de version et le dernier dossier `supabase/seed/vX_Y_Z/` :
 * `tests/unit/socle-version.test.ts` refuse un écart. Une installation garde ce fichier tel quel :
 * il dit la version du socle qu'elle a reçue, pas celle de sa greffe.
 *
 * Fichier sans alias « @/ » : lu aussi par Node (tests unitaires).
 */
export const SOCLE_VERSION = "1.19.0";
