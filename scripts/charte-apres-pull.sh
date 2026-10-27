#!/usr/bin/env bash
# Après un « git pull » (hooks post-merge et post-rewrite) : contrôle la charte de style sur ce que
# le pull a ramené. Les commits de l'agent Lovable et des autres agents arrivent sur main sans
# passer par aucun hook : c'est le premier endroit où on les voit. Ne bloque jamais le pull : il signale le
# fichier, la règle et les auteurs des commits ramenés qui touchent src/.
# Usage : scripts/charte-apres-pull.sh [référence d'avant le pull, ORIG_HEAD par défaut]
cd "$(dirname "$0")/.." || exit 0
avant="${1:-ORIG_HEAD}"
git rev-parse -q --verify "$avant" >/dev/null || exit 0
git diff --quiet "$avant" HEAD -- src/ && exit 0

echo "Charte de style : contrôle de ce que le pull a ramené."
rapport=$(node scripts/verifier-couleurs.mjs 2>&1; node scripts/verifier-contrastes.mjs 2>&1 | grep -v '^ok ')
if echo "$rapport" | grep -q 'ÉCHEC'; then
  echo "$rapport"
  echo ""
  echo "Commits ramenés qui touchent src/ (auteur, commit, titre) :"
  git log --no-merges --format='  %an · %h · %s' "$avant"..HEAD -- src/
  echo ""
  echo "À corriger dans une demande de fusion (docs/CHARTE_STYLE_CDS.md)."
else
  echo "Charte de style OK."
fi
exit 0
