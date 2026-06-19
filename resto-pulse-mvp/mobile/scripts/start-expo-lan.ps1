# Metro LAN — telefon ayni Wi-Fi uzerinden baglanir (Expo Go veya dev client)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "`n=== GastroSkor Metro (LAN) ===" -ForegroundColor Cyan

& "$PSScriptRoot\metro-port-temizle.ps1"

$wifi = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.InterfaceAlias -match 'Wi-Fi|WLAN' -and $_.IPAddress -notlike '169.*' } |
  Select-Object -First 1

if (-not $wifi) {
  Write-Host 'Wi-Fi IPv4 bulunamadi. Ethernet kullaniyorsan IP adresini elle gir.' -ForegroundColor Red
  $ip = '192.168.68.54'
} else {
  $ip = $wifi.IPAddress
}

Write-Host "`nPC IP: $ip" -ForegroundColor Green
Write-Host 'Telefonda Expo Go -> Enter URL manually:' -ForegroundColor Yellow
Write-Host "  exp://${ip}:8081`n" -ForegroundColor White

Write-Host 'Kontrol listesi:' -ForegroundColor Cyan
Write-Host "  - Telefon mobil veri KAPALI, ayni Wi-Fi ($ip agi)"
Write-Host '  - TestFlight surumu Metro baglantisi alamaz — Expo Go kullan'
Write-Host '  - Norton: node.exe icin Izin ver (Gelen + Giden)'
Write-Host '  - Tunnel icin Norton ngrok baglantisini da engelliyor olabilir'
Write-Host ''

$env:REACT_NATIVE_PACKAGER_HOSTNAME = $ip
& node "$PSScriptRoot\expo-start-skip-doctor.js" -c --lan --port 8081
