# Windows: EAS GraphQL "unable to verify the first certificate" icin sistem CA kullan.
param(
  [ValidateSet('android', 'ios', 'all')]
  [string]$Platform = 'all'
)

$ErrorActionPreference = "Stop"
$env:NODE_OPTIONS = "--use-system-ca"
Set-Location $PSScriptRoot\..

$argsList = @("build", "--profile", "production", "--platform", $Platform, "--non-interactive")
if ($args.Count -gt 0) {
  $argsList += $args
}

Write-Host "GastroSkor production build — platform: $Platform"
Write-Host "NODE_OPTIONS=$env:NODE_OPTIONS"
Write-Host "eas $($argsList -join ' ')"
& eas @argsList
