# ==============================================================================
#  💕 PEDI PARA MEU MARIDO - Publicador de Release Desktop (GitHub Releases)
#  Gera build local e publica instalador (.exe) + latest.json sem GitHub Actions!
# ==============================================================================
#
# Uso:
#   powershell -File .\release-desktop.ps1
#   powershell -File .\release-desktop.ps1 -Version 1.0.1
#   powershell -File .\release-desktop.ps1 -Version 1.0.1 -Notes "Novos recursos fofinhos e correções!"

param(
    [string]$Version = "",
    [string]$Notes = ""
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }
Set-Location $root

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Magenta
Write-Host "  💕 PEDI PARA MEU MARIDO - Gerador & Publicador de Updatezinho 💕" -ForegroundColor Magenta
Write-Host "================================================================================" -ForegroundColor Magenta
Write-Host ""

# 1. Checar autenticação no GitHub CLI
Write-Host "  [+] Verificando login no GitHub CLI (gh)..." -ForegroundColor Cyan
try {
    $ghUser = (gh api user --jq '.login')
    if (-not $ghUser) { throw "Não autenticado." }
    Write-Host "  [OK] Conectado ao GitHub como: @$ghUser" -ForegroundColor Green
} catch {
    Write-Host "  [ERRO] Você precisa estar logado no GitHub CLI." -ForegroundColor Red
    Write-Host "         Execute: gh auth login" -ForegroundColor Yellow
    exit 1
}

# 2. Configurar ambiente Cargo/Rust se necessário
$cargoPath = "$env:USERPROFILE\.cargo\bin"
if (Test-Path $cargoPath) {
    if ($env:PATH -notlike "*$cargoPath*") {
        $env:PATH = "$cargoPath;" + $env:PATH
    }
}
$env:CARGO_BUILD_JOBS = 1

# 3. Ler e atualizar versões
$pkgPath = Join-Path $root 'package.json'
$tauriConfPath = Join-Path $root 'src-tauri\tauri.conf.json'
$cargoTomlPath = Join-Path $root 'src-tauri\Cargo.toml'

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

$pkgJson = Get-Content $pkgPath -Raw -Encoding UTF8 | ConvertFrom-Json
$currentVer = $pkgJson.version

if ($Version) {
    $ver = $Version.Trim().TrimStart('v')
    Write-Host "  [+] Atualizando versão do projeto: $currentVer -> $ver" -ForegroundColor Yellow

    # package.json
    $pkgRaw = Get-Content $pkgPath -Raw -Encoding UTF8
    $pkgRaw = $pkgRaw -replace '"version":\s*"[^"]+"', ('"version": "' + $ver + '"')
    [System.IO.File]::WriteAllText($pkgPath, $pkgRaw, $utf8NoBom)

    # tauri.conf.json
    $tauriRaw = Get-Content $tauriConfPath -Raw -Encoding UTF8
    $tauriRaw = $tauriRaw -replace '"version":\s*"[^"]+"', ('"version": "' + $ver + '"')
    [System.IO.File]::WriteAllText($tauriConfPath, $tauriRaw, $utf8NoBom)

    # Cargo.toml
    $cargoRaw = Get-Content $cargoTomlPath -Raw -Encoding UTF8
    $cargoRaw = $cargoRaw -replace '(?m)^version\s*=\s*"[^"]+"', ('version = "' + $ver + '"')
    [System.IO.File]::WriteAllText($cargoTomlPath, $cargoRaw, $utf8NoBom)

    Write-Host "  [OK] Versões sincronizadas com sucesso!" -ForegroundColor Green
} else {
    $ver = $currentVer
    Write-Host "  [*] Mantendo versão atual: $ver" -ForegroundColor Cyan
}

if (-not $Notes) {
    $Notes = "💕 Atualização com muito amor para minha esposa! Melhorias, correções e novidades quentinhas preparadas com carinho."
}

# 4. Liberar porta 1420 caso o dev server esteja rodando
$occupied = Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue
if ($occupied) {
    Write-Host "  [+] Liberando processos na porta 1420..." -ForegroundColor Yellow
    $occupied | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Milliseconds 400
}

# 4.5 Executar suite de testes antes de buildar
Write-Host ""
Write-Host "  [1/5] Executando testes automatizados do projeto (npm test)..." -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERRO] A suite de testes falhou! Corrija os testes antes de buildar e enviar a release." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Todos os testes passaram com sucesso!" -ForegroundColor Green

# 5. Compilar frontend Vite
Write-Host ""
Write-Host "  [2/5] Compilando frontend otimizado com Vite..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERRO] Falha ao compilar o frontend." -ForegroundColor Red
    exit 1
}

# 6. Compilar Tauri NSIS
Write-Host ""
Write-Host "  [3/5] Compilando instalador nativo Tauri NSIS (.exe)..." -ForegroundColor Cyan
npx tauri build --bundles nsis
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERRO] Falha ao gerar o bundle NSIS do Tauri." -ForegroundColor Red
    exit 1
}

# 7. Localizar o executável gerado
$bundleDir = Join-Path $root "src-tauri\target\release\bundle\nsis"
if (-not (Test-Path $bundleDir)) {
    Write-Host "  [ERRO] Pasta do instalador não encontrada em: $bundleDir" -ForegroundColor Red
    exit 1
}

$setupExe = Get-ChildItem -Path $bundleDir -Filter "*setup.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $setupExe) {
    Write-Host "  [ERRO] Nenhum arquivo *setup.exe encontrado na pasta $bundleDir" -ForegroundColor Red
    exit 1
}

$setupFileName = $setupExe.Name
$setupFileSize = $setupExe.Length
Write-Host "  [OK] Instalador encontrado: $setupFileName ($([math]::Round($setupFileSize / 1MB, 2)) MB)" -ForegroundColor Green

# 8. Gerar arquivo latest.json para verificação automática do app
Write-Host ""
Write-Host "  [3/4] Gerando arquivo de metadados latest.json..." -ForegroundColor Cyan
$repoOwner = "Lascone"
$repoName = "minha-esposa-pedio"
$downloadUrl = "https://github.com/$repoOwner/$repoName/releases/download/v$ver/$setupFileName"

$latestData = [ordered]@{
    version      = $ver
    notes        = $Notes
    pub_date     = [DateTime]::UtcNow.ToString("o")
    url          = $downloadUrl
    fileName     = $setupFileName
    size         = $setupFileSize
}

$releaseOutputDir = Join-Path $root "release"
if (-not (Test-Path $releaseOutputDir)) {
    New-Item -ItemType Directory -Path $releaseOutputDir | Out-Null
}

$latestJsonPath = Join-Path $releaseOutputDir "latest.json"
$latestJsonContent = $latestData | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($latestJsonPath, $latestJsonContent, $utf8NoBom)
Write-Host "  [OK] latest.json gerado em: $latestJsonPath" -ForegroundColor Green

# 9. Publicar no GitHub Releases via GitHub CLI
Write-Host ""
Write-Host "  [4/4] Publicando release v$ver no GitHub ($repoOwner/$repoName)..." -ForegroundColor Cyan

# Copiar setup para pasta release para upload limpo
$releaseSetupPath = Join-Path $releaseOutputDir $setupFileName
Copy-Item -Path $setupExe.FullName -Destination $releaseSetupPath -Force

$releaseTitle = "v$ver 💕 Amor, saiu updatezinho!"
& gh release create "v$ver" $releaseSetupPath $latestJsonPath --repo "$repoOwner/$repoName" --title $releaseTitle --notes "$Notes"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [+] Release v$ver pode já existir no GitHub. Atualizando arquivos com --clobber..." -ForegroundColor Cyan
    & gh release upload "v$ver" $releaseSetupPath $latestJsonPath --repo "$repoOwner/$repoName" --clobber
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERRO] Falha ao publicar release no GitHub CLI." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "  ✨ SUCESSO! Updatezinho v$ver publicado com amor no GitHub! 💕" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "  👉 Versão: $ver" -ForegroundColor White
Write-Host "  👉 Setup: $downloadUrl" -ForegroundColor White
Write-Host "  👉 Metadados: https://github.com/$repoOwner/$repoName/releases/download/v$ver/latest.json" -ForegroundColor White
Write-Host ""
Write-Host "  Sua esposa já poderá receber a notificação fofinha no app dela! 🥰" -ForegroundColor Yellow
Write-Host ""
