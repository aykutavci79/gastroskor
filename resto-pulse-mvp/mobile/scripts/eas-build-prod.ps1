# Windows: EAS GraphQL "unable to verify the first certificate" icin sistem CA kullan.
$ErrorActionPreference = "Stop"
$env:NODE_OPTIONS = "--use-system-ca"
Set-Location $PSScriptRoot\..

$argsList = @("build", "--profile", "production", "--platform", "android")
if ($args.Count -gt 0) {
  $argsList += $args
}

Write-Host "NODE_OPTIONS=$env:NODE_OPTIONS"
Write-Host "eas $($argsList -join ' ')"
& eas @argsList
