#!/usr/bin/env bash
# Après un « git pull » (hooks post-merge et post-rewrite) : contrôle la charte de style sur ce que
# le pull a ramené. Les commits de l'agent Lovable et des autres agents arrivent sur main sans
# passer par aucun hook : c'est le premier endroit où on les voit. Ne bloque jamais le pull : il signale le
# fichier, la règle et les auteurs des commits ramenés qui touchent src/.
# Usage : scripts/charte-apres-pull.sh [référence d'avant le pull, ORIG_HEAD par défaut]
cd "$(dirname "$0")/.." || exit 0
avant="${1:-ORIG_HEAD}"
git rev-parse -q --verify "$avant" >/dev/null || exit 0
git diff --quiet "$avant" HEAD -- src/ tokens/ && exit 0

echo "Charte de style : contrôle de ce que le pull a ramené."
# Le code de sortie de chaque contrôle fait foi : un contrôle qui plante (couleur illisible) échoue
# sans écrire « ÉCHEC », et ne doit pas passer pour conforme.
rapport=""
echec=0
controler() {
  sortie=$("$@" 2>&1)
  if [ $? -ne 0 ]; then
    echec=1
    rapport="$rapport$(printf '%s\n' "$sortie" | grep -v '^ok ')
"
  fi
}
controler node scripts/jetons.mjs --verifier
controler node scripts/verifier-couleurs.mjs
controler node scripts/verifier-contrastes.mjs
controler node scripts/cliquet-charte.mjs --verifier
if [ "$echec" -ne 0 ]; then
  printf '%s' "$rapport"
  echo ""
  echo "Commits ramenés qui touchent src/ (auteur, commit, titre) :"
  git log --no-merges --format='  %an · %h · %s' "$avant"..HEAD -- src/
  echo ""
  echo "À corriger dans une demande de fusion (docs/CHARTE_STYLE_CDS.md)."
else
  echo "Charte de style OK."
fi
exit 0
