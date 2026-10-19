# Recette du site public sur le poste (19/10/2026) : remplace la tâche GitHub « recette-publique »
# du lundi, sans quota GitHub Actions. Même robot (tests/e2e/recette.ts), mêmes navigateurs :
# Chromium en visiteur, membre et admin ; Firefox et WebKit (Safari) en visiteur. Lecture seule.
#
# Réglages, hors du dépôt (jamais dans .env, qui est versionné) :
#   ~/.config/<nom du dossier du dépôt>/recette-comptes.env, créé au premier lancement :
#   CDS_URL_PUBLIQUE=https://...   adresse du site publié (ou -Url au lancement)
#   CDS_RECETTE_MEMBRE_EMAIL=...   CDS_RECETTE_MEMBRE_MDP=...
#   CDS_RECETTE_ADMIN_EMAIL=...    CDS_RECETTE_ADMIN_MDP=...
#   Sans compte, membre et admin sont simulés, comme sur GitHub.
#
# Usage, depuis la racine du dépôt :
#   .\scripts\recette-locale.ps1
#   .\scripts\recette-locale.ps1 -Url https://exemple.fr -Navigateurs chromium
# Rapport : tests/e2e/rapport/ (à importer dans /admin/recettage). Chaque navigateur écrase le
# rapport du précédent : le script range chacun dans tests/e2e/rapport/<navigateur>/.
param(
  [string]$Url = "",
  [string[]]$Navigateurs = @("chromium", "firefox", "webkit")
)
$ErrorActionPreference = "Stop"
$depot = Split-Path -Parent $PSScriptRoot
Set-Location $depot

# Node 22.18 ou plus : il lit directement les fichiers TypeScript du robot.
$version = (node --version) -replace "^v", ""
$parties = $version.Split(".")
if ([int]$parties[0] -lt 22 -or ([int]$parties[0] -eq 22 -and [int]$parties[1] -lt 18)) {
  Write-Host "Recette : Node $version trouvé, il faut Node 22.18 ou plus (nodejs.org)."
  exit 1
}

$config = Join-Path $HOME (Join-Path ".config" (Split-Path -Leaf $depot))
$comptes = Join-Path $config "recette-comptes.env"
New-Item -ItemType Directory -Force -Path $config | Out-Null
if (-not (Test-Path $comptes)) {
  @(
    "# Réglages de la recette locale. Une ligne par variable, sans guillemets. Ne jamais versionner.",
    "CDS_URL_PUBLIQUE=",
    "CDS_RECETTE_MEMBRE_EMAIL=",
    "CDS_RECETTE_MEMBRE_MDP=",
    "CDS_RECETTE_ADMIN_EMAIL=",
    "CDS_RECETTE_ADMIN_MDP="
  ) | Set-Content -Encoding UTF8 $comptes
  Write-Host "Recette : fichier des réglages créé, à remplir : $comptes"
}
foreach ($ligne in Get-Content $comptes) {
  if ($ligne -match "^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$") {
    Set-Item -Path "Env:$($Matches[1])" -Value $Matches[2]
  }
}
if (-not $Url) { $Url = $env:CDS_URL_PUBLIQUE }
if (-not $Url) {
  Write-Host "Recette : aucune adresse. Remplir CDS_URL_PUBLIQUE dans $comptes, ou lancer avec -Url."
  exit 1
}
$Url = $Url.TrimEnd("/")

# Outils du robot hors package.json, comme sur GitHub : installés seulement s'ils manquent
# (un « npm install » les enlève). Chaque navigateur ne se télécharge qu'une fois.
node -e "try { ['playwright', 'axe-core', 'html-validate'].forEach((m) => require.resolve(m)) } catch { process.exit(1) }"
if ($LASTEXITCODE -ne 0) {
  npm install --no-save --no-package-lock --no-audit --no-fund playwright@1.56.1 axe-core@4.13.0 html-validate@11.16.1
  if ($LASTEXITCODE -ne 0) { Write-Host "Recette : installation des outils du robot impossible."; exit 1 }
}

$echecs = @()
foreach ($navigateur in $Navigateurs) {
  npx playwright install $navigateur
  if ($LASTEXITCODE -ne 0) { Write-Host "Recette : installation de $navigateur impossible."; exit 1 }
  $roles = if ($navigateur -eq "chromium") { "visiteur,membre,admin" } else { "visiteur" }
  Write-Host "Recette : $navigateur ($roles) sur $Url"
  node tests/e2e/recette.ts --url $Url --roles $roles --navigateur $navigateur
  if ($LASTEXITCODE -ne 0) { $echecs += $navigateur }
  $copie = "tests\e2e\rapport\$navigateur"
  New-Item -ItemType Directory -Force -Path $copie | Out-Null
  Copy-Item "tests\e2e\rapport\recette.*" $copie -ErrorAction SilentlyContinue
  Write-Host "Rapport $navigateur : $(Join-Path $depot $copie)"
}
if ($echecs.Count -gt 0) {
  Write-Host "Recette : écarts trouvés avec $($echecs -join ', '). Voir les rapports ci-dessus."
  exit 1
}
Write-Host "Recette : aucun écart."
