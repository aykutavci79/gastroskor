# Tek platform production build. Iki OS icin eas-build-release.ps1 kullan.
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('android', 'ios')]
  [string]$Platform
)

$ErrorActionPreference = "Stop"
$env:NODE_OPTIONS = "--use-system-ca"
Set-Location $PSScriptRoot\..

$argsList = @("build", "--profile", "production", "--platform", $Platform, "--non-interactive", "--wait")
if ($args.Count -gt 0) {
  $argsList += $args
}

Write-Host "GastroSkor production build — platform: $Platform"
Write-Host "NODE_OPTIONS=$env:NODE_OPTIONS"
Write-Host "Paralel iki OS build icin: npm run build:prod"
Write-Host "eas $($argsList -join ' ')"
& eas @argsList
