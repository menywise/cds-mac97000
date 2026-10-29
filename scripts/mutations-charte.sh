#!/usr/bin/env bash
# Test par mutation des garde-fous de la charte (audit du 28/10/2026, docs/audits/2026-10-28-charte.md).
# Dans une copie jetable du dépôt (git worktree), plante une faute à la fois, puis lance le vrai
# .githooks/pre-commit. Chaque faute doit être refusée. Rien n'est commité, rien n'est poussé : la
# copie est supprimée à la fin. Tourne dans le socle comme dans une installation (le cas « copie du
# socle modifiée » ne vaut que là où socle.json existe).
# Usage : bash scripts/mutations-charte.sh [dossier de travail]
# Sortie : un tableau Markdown ; code 1 si une faute passe le hook.
set -u
DEPOT=$(git rev-parse --show-toplevel)
COPIE=${1:-"$DEPOT/../mutations-charte-$$"}
JOURNAL="$COPIE.log"

git -C "$DEPOT" worktree add -q --detach "$COPIE" HEAD || exit 2
# node_modules partagé : lien symbolique, ou jonction sous Windows (Git Bash, sans droits admin).
ln -s "$DEPOT/node_modules" "$COPIE/node_modules" 2>/dev/null ||
  cmd //c mklink /J "$(cygpath -w "$COPIE/node_modules")" "$(cygpath -w "$DEPOT/node_modules")" >/dev/null
cd "$COPIE" || exit 2
git config user.email mutation@exemple.invalid
git config user.name mutation
: >"$JOURNAL"

composant() {
  printf 'export function Mutant(props: { couleur: string }) {\n  return (\n    <div>\n      %s\n    </div>\n  );\n}\n' \
    "$1" >src/components/Mutant.tsx
}

CAS=(
  "dark|Variante sombre dark:"
  "palette|Couleur Tailwind en dur (text-orange-600)"
  "compose|Préfixe composé (border-l-amber-500)"
  "arbitraire|Valeur arbitraire text-[#ea580c]"
  "style|style={{ color: \"#ea580c\" }}"
  "table|Table de couleurs hexadécimales dans un .ts"
  "svg|SVG fill=\"#f59e0b\""
  "rgb|style avec rgb(245,158,11)"
  "titre_gris|Gris sur un intitulé <h2 className=\"text-muted-foreground\">"
  "gris6|6 textes gris dans un nouveau fichier"
  "opacite|opacity-60 sur un texte"
  "modificateur|Opacité par modificateur text-foreground/50"
  "donnee|Couleur venue de la base posée en texte"
  "root|Bloc :root de src/styles.css modifié à la main"
  "jeton|Jeton à 2,1:1 (warning-text = #f59e0b), puis npm run jetons"
  "copie|Copie du socle modifiée (eslint-rules/charte.js)"
)

planter() {
  case $1 in
    dark) composant '<p className="dark:bg-card">x</p>' ;;
    palette) composant '<p className="text-orange-600">x</p>' ;;
    compose) composant '<p className="border-l-4 border-l-amber-500">x</p>' ;;
    arbitraire) composant '<p className="text-[#ea580c]">x</p>' ;;
    style) composant '<p style={{ color: "#ea580c" }}>x</p>' ;;
    table) printf 'export const TEINTES: Record<string, string> = {\n  orange: "#ea580c",\n};\n' >src/lib/mutant.ts ;;
    svg) composant '<svg aria-hidden="true"><circle r="4" fill="#f59e0b" /></svg>' ;;
    rgb) composant '<p style={{ color: "rgb(245,158,11)" }}>x</p>' ;;
    titre_gris) composant '<h2 className="text-muted-foreground">Titre</h2>' ;;
    gris6) composant "$(for _ in 1 2 3 4 5 6; do printf '<p className="text-muted-foreground">x</p>'; done)" ;;
    opacite) composant '<p className="opacity-60">x</p>' ;;
    modificateur) composant '<p className="text-foreground/50">x</p>' ;;
    donnee) composant '<p style={{ color: props.couleur }}>x</p>' ;;
    root) sed -i '0,/--background:[^;]*;/s//--background: #f0f0f0;/' src/styles.css ;;
    jeton)
      node -e 'const fs=require("fs"),f="tokens/cds.tokens.json",s=fs.readFileSync(f,"utf8");
        fs.writeFileSync(f,s.replace(/("warning-text":\s*\{[^}]*?"\$value":\s*")[^"]+"/,"$1#f59e0b\""))'
      npm run --silent jetons >/dev/null 2>&1
      ;;
    copie)
      [ -f socle.json ] || return 3
      echo "// mutation" >>eslint-rules/charte.js
      ;;
  esac
}

echo "| Faute plantée | Résultat |"
echo "|---|---|"
passe=0
for c in "${CAS[@]}"; do
  id=${c%%|*}
  libelle=${c#*|}
  git reset -q --hard
  git clean -qfd -e node_modules
  planter "$id"
  if [ $? -eq 3 ]; then
    echo "| $libelle | sans objet |"
    continue
  fi
  git add -A -- . ':!node_modules' 2>/dev/null
  if git diff --cached --quiet; then
    echo "| $libelle | mutation non appliquée |"
    passe=1
    continue
  fi
  sortie=$(sh .githooks/pre-commit 2>&1)
  if [ $? -ne 0 ]; then
    motif=$(printf '%s\n' "$sortie" | grep -m1 -oE '(Commit refusé|ÉCHEC) : [^(.]*' | sed -E 's/^(Commit refusé|ÉCHEC) : //')
    echo "| $libelle | refusée (${motif% }) |"
  else
    echo "| $libelle | **PASSE** |"
    passe=1
  fi
  printf '### %s\n%s\n' "$id" "$(printf '%s\n' "$sortie" | tail -n 15)" >>"$JOURNAL"
done

git reset -q --hard
cd "$DEPOT" || exit 2
git worktree remove --force "$COPIE"
echo ""
echo "Détail des sorties du hook : $JOURNAL"
exit $passe
