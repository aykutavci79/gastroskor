# Yonetici PowerShell — Wi-Fi'yi "Ozel ag" yapar (Public = telefon baglanamaz)
$isAdmin = (
  [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  Write-Host "Yonetici PowerShell gerekli." -ForegroundColor Red
  exit 1
}

$profile = Get-NetConnectionProfile | Where-Object { $_.IPv4Connectivity -ne 'Disconnected' } | Select-Object -First 1
if (-not $profile) {
  Write-Host "Aktif ag bulunamadi." -ForegroundColor Red
  exit 1
}

if ($profile.NetworkCategory -eq 'Private') {
  Write-Host "Zaten Ozel ag: $($profile.InterfaceAlias)" -ForegroundColor Green
} else {
  Set-NetConnectionProfile -InterfaceIndex $profile.InterfaceIndex -NetworkCategory Private
  Write-Host "Ozel ag yapildi: $($profile.InterfaceAlias) (once: $($profile.NetworkCategory))" -ForegroundColor Green
}

Write-Host "`nSonra firewall + Metro:" -ForegroundColor Cyan
Write-Host "  .\scripts\firewall-expo.ps1" -ForegroundColor White
Write-Host "  npm run start:clean`n" -ForegroundColor White
