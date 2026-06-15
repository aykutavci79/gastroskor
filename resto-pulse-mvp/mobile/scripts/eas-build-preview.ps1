# Preview APK — telefona direkt kurulum (internal), canli API testi.
$ErrorActionPreference = "Stop"
$env:NODE_OPTIONS = "--use-system-ca"
Set-Location $PSScriptRoot\..

& "$PSScriptRoot\run-code-preflight.ps1"

Write-Host "NODE_OPTIONS=$env:NODE_OPTIONS"
Write-Host "eas build --profile preview --platform android"
& eas build --profile preview --platform android @args
