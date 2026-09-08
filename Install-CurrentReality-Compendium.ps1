[CmdletBinding()]
param(
    [string]$Root = 'F:\FFXIServerComplete'
)

$ErrorActionPreference = 'Stop'
$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$payload = Join-Path $packageRoot 'Compendium-Payload'
$target = Join-Path $Root 'compendium'
$adminRoot = Join-Path $Root 'compendium-admin'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $Root 'backups'
$backup = Join-Path $backupRoot "compendium-before-player-wiki-$stamp"
$adminDatabase = Join-Path $adminRoot "Server-Database-before-player-wiki-$stamp"

if (-not (Test-Path -LiteralPath $payload -PathType Container)) {
    throw "Compendium payload was not found beside this installer: $payload"
}

$required = @(
    'index.html',
    'reference\index.html',
    'assets\data\item-index.json',
    'assets\item-popovers.js',
    'missions\san-doria\index.html',
    'missions\bastok\index.html',
    'missions\windurst\index.html',
    'quests\san-doria\index.html',
    'quests\bastok\index.html',
    'quests\windurst\index.html'
)

foreach ($relativePath in $required) {
    $candidate = Join-Path $payload $relativePath
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        throw "Required package file is missing: $relativePath"
    }
}

New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

if (Test-Path -LiteralPath $target -PathType Container) {
    Copy-Item -LiteralPath $target -Destination $backup -Recurse
    Write-Host "Public Compendium backup: $backup" -ForegroundColor Cyan

    if (Test-Path -LiteralPath $adminRoot -PathType Container) {
        Copy-Item -LiteralPath $target -Destination $adminDatabase -Recurse
        Write-Host "Previous raw database view relocated to: $adminDatabase" -ForegroundColor Cyan
    }
}
else {
    New-Item -ItemType Directory -Path $target -Force | Out-Null
}

Get-ChildItem -LiteralPath $payload -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $target -Recurse -Force
}

Write-Host ''
Write-Host 'Current Reality player Compendium installed.' -ForegroundColor Green
Write-Host 'The public Database page is now the Item Encyclopedia.' -ForegroundColor Green
Write-Host 'Starter-nation missions and city quests are installed with item hover cards and full item links.' -ForegroundColor Green
Write-Host "Installed to: $target"
