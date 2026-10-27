#!/bin/bash
# Démarrage d'une session Claude Code (poste ou cloud) : les hooks versionnés du dépôt s'appliquent
# partout où passent les commits (charte de style, lint, types : .githooks/pre-commit).
# Sans ce réglage, une session cloud commitait sans aucun contrôle (constat du 27/10/2026).
# En cloud seulement : installe les dépendances, sans quoi le pre-commit (eslint, tsc) refuserait
# tout commit. bun.lock pointe vers le registre privé de Lovable : installation depuis le registre
# npm public, sans écrire de fichier de verrouillage (même méthode que la vérification GitHub).
set -euo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

git config core.hooksPath .githooks

if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ] && [ ! -x node_modules/.bin/tsc ]; then
  npm install --no-package-lock --no-audit --no-fund --silent
fi
echo "Hooks du dépôt actifs (.githooks) ; dépendances prêtes."
