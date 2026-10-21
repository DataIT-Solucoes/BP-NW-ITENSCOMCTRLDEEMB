<#
Entrega de um ajuste em uma chamada so: confere BOM/quebra de linha e sintaxe, gera o .war,
faz commit so dos arquivos informados, push e confere o remoto.

Uso (a partir da pasta do widget):
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/entregar.ps1 -Mensagem "FIX: Texto" arq1 arq2 ...
  -Simular: faz as conferencias e o .war, mas nao faz commit nem push.

- Mensagem tem de comecar com DOCS:, FIX: ou CHORE:. Commit sem coautor.
- Arquivos relativos a pasta do widget. Nunca target/. Arquivo apagado ou renomeado: passe o caminho antigo tambem.
- node --check e .war so rodam se algum arquivo estiver em src/.
#>
param(
    [Parameter(Mandatory = $true)][string] $Mensagem,
    [switch] $Simular,
    [Parameter(ValueFromRemainingArguments = $true)][string[]] $Arquivos
)

$widget = Split-Path -Parent $PSScriptRoot
$nome = Split-Path -Leaf $widget
$pack = 'C:\Users\DataIt\Documents\GitHub\Auxiliares\compilar-widget-fluig-vscode\tools\pack-widget.ps1'
Set-Location $widget

function Falhar([string] $texto) {
    Write-Host "ERRO: $texto" -ForegroundColor Red
    exit 1
}

if ($Mensagem -notmatch '^(DOCS|FIX|CHORE): \S') { Falhar 'mensagem tem de comecar com "DOCS: ", "FIX: " ou "CHORE: ".' }
if (-not $Arquivos -or $Arquivos.Count -eq 0) { Falhar 'informe os arquivos do commit.' }

$Arquivos = @($Arquivos | ForEach-Object { $_ -replace '\\', '/' -replace '^\./', '' })
$temSrc = $false
foreach ($a in $Arquivos) {
    if ($a -match '^target(/|$)') { Falhar "target/ nao entra no commit ($a)." }
    if ($a -match '^src/') { $temSrc = $true }
    $existe = Test-Path -LiteralPath $a
    if (-not $existe) {
        git cat-file -e "HEAD:$a" 2>$null
        if ($LASTEXITCODE -ne 0) { Falhar "arquivo nao existe nem esta no git: $a" }
        continue
    }
    # Fontes: UTF-8 sem BOM e sem misturar CRLF com LF (cada arquivo mantem o que ja tem)
    if ($a -match '^src/.*\.(js|ftl|css|xml|info|properties|html)$') {
        $b = [IO.File]::ReadAllBytes((Join-Path $widget $a))
        if ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) { Falhar "$a tem BOM." }
        $lf = 0; $crlf = 0
        for ($i = 0; $i -lt $b.Length; $i++) {
            if ($b[$i] -eq 10) { $lf++; if ($i -gt 0 -and $b[$i - 1] -eq 13) { $crlf++ } }
        }
        if ($crlf -gt 0 -and $crlf -ne $lf) { Falhar "$a mistura quebras: $crlf CRLF e $($lf - $crlf) LF." }
    }
}
Write-Host "OK  BOM/quebra de linha ($($Arquivos.Count) arquivo(s))"

if ($temSrc) {
    $js = "src/main/webapp/resources/js/$nome.js"
    $saida = node --check $js 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { Write-Host $saida; Falhar 'node --check falhou.' }
    Write-Host "OK  node --check $js"

    $saida = powershell.exe -NoProfile -ExecutionPolicy Bypass -File $pack -Path (Join-Path $widget $js) 2>&1 | Out-String
    $war = Join-Path $widget "target\$nome.war"
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $war)) { Write-Host $saida; Falhar 'empacotamento do .war falhou.' }
    $kb = [math]::Round((Get-Item $war).Length / 1KB)
    Write-Host "OK  target/$nome.war ($kb KB)"
} else {
    Write-Host '--  sem arquivo em src/: node --check e .war pulados'
}

if ($Simular) { Write-Host '--  -Simular: sem commit e sem push'; exit 0 }

# Apagado que ja esta no indice (git rm/git mv) nao casa no git add: so entra no commit
$paraAdicionar = @($Arquivos | Where-Object { (Test-Path -LiteralPath $_) -or (git ls-files -- $_) })
if ($paraAdicionar.Count -gt 0) {
    git add -A -- $paraAdicionar
    if ($LASTEXITCODE -ne 0) { Falhar 'git add falhou.' }
}
$msgArq = Join-Path $env:TEMP "entregar-$nome-msg.txt"
[IO.File]::WriteAllText($msgArq, $Mensagem + "`n", (New-Object Text.UTF8Encoding $false))
$saida = git commit -q -F $msgArq -- $Arquivos 2>&1 | Out-String
$codigo = $LASTEXITCODE
Remove-Item $msgArq -ErrorAction SilentlyContinue
if ($codigo -ne 0) { Write-Host $saida; Falhar 'git commit falhou.' }
$hash = git rev-parse --short HEAD
Write-Host "OK  commit $hash $Mensagem"

$branch = git rev-parse --abbrev-ref HEAD
$saida = git push -q origin $branch 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { Write-Host $saida; Falhar 'git push falhou.' }
$local = git rev-parse HEAD
$remoto = (git ls-remote origin $branch) -split '\s+' | Select-Object -First 1
if ($remoto -ne $local) { Falhar "remoto ($remoto) diferente do local ($local)." }
Write-Host "OK  push $branch = $hash"
