# Sirali magaza build: once bir platform, bitince digeri.
# Paralel "all" build kredisi ve submit hatalarinda cift kayip riskini onler.
param(
  [ValidateSet('ios-first', 'android-first')]
  [string]$Order = 'ios-first',
  [switch]$Submit,
  [switch]$SkipSecond
)

$ErrorActionPreference = "Stop"
$env:NODE_OPTIONS = "--use-system-ca"
Set-Location $PSScriptRoot\..

function Invoke-PlatformBuild([string]$Platform) {
  Write-Host ""
  Write-Host ">> eas build --profile production --platform $Platform --non-interactive --wait"
  & eas build --profile production --platform $Platform --non-interactive --wait
  if ($LASTEXITCODE -ne 0) {
    throw "Build failed: $Platform"
  }
}

function Invoke-PlatformSubmit([string]$Platform) {
  if (-not $Submit) {
    Write-Host ">> Submit atlandi ($Platform). -Submit ile acilir."
    return
  }

  Write-Host ""
  Write-Host ">> eas submit --profile production --platform $Platform --latest --non-interactive"
  & eas submit --profile production --platform $Platform --latest --non-interactive
  if ($LASTEXITCODE -ne 0) {
    throw "Submit failed: $Platform"
  }
}

$first = if ($Order -eq 'ios-first') { 'ios' } else { 'android' }
$second = if ($Order -eq 'ios-first') { 'android' } else { 'ios' }

Write-Host "GastroSkor sirali release - $Order$(if ($Submit) { ' + submit' } else { '' })"
Write-Host "NODE_OPTIONS=$env:NODE_OPTIONS"

Write-Host ""
Write-Host "=== 1/2 $first ==="
Invoke-PlatformBuild $first
Invoke-PlatformSubmit $first

if ($SkipSecond) {
  Write-Host ""
  Write-Host "Ikinci platform atlandi (-SkipSecond)."
  exit 0
}

Write-Host ""
Write-Host "=== 2/2 $second ==="
Invoke-PlatformBuild $second
Invoke-PlatformSubmit $second

Write-Host ""
Write-Host "Sirali release tamamlandi."
