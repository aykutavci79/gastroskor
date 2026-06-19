# Yonetici PowerShell: Sag tik -> "Yonetici olarak calistir"
# Metro 8081-8084 + Node.exe — telefonun LAN uzerinden baglanabilmesi icin

$isAdmin = (
  [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  Write-Host "HATA: Yonetici PowerShell gerekli." -ForegroundColor Red
  exit 1
}

$ports = 8081, 8082, 8083, 8084
foreach ($port in $ports) {
  $name = "GastroSkor Expo Metro $port"
  if (Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue) {
    Write-Host "Zaten var: TCP $port" -ForegroundColor Yellow
  } else {
    New-NetFirewallRule -DisplayName $name -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -Profile Any | Out-Null
    Write-Host "Eklendi: TCP $port" -ForegroundColor Green
  }
}

$nodeName = "GastroSkor Node.js"
if (-not (Get-NetFirewallRule -DisplayName $nodeName -ErrorAction SilentlyContinue)) {
  $nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
  if ($nodePath) {
    New-NetFirewallRule -DisplayName $nodeName -Direction Inbound -Program $nodePath -Action Allow -Profile Any | Out-Null
    Write-Host "Eklendi: Node.exe ($nodePath)" -ForegroundColor Green
  }
}

Write-Host "`nWi-Fi Genel (Public) ise once:" -ForegroundColor Yellow
Write-Host "  .\scripts\wifi-ozel-ag.ps1`n" -ForegroundColor White
Write-Host "Norton: Ayarlar -> Firewall -> Program Kontrolu -> node.exe = Izin ver`n" -ForegroundColor Yellow
Write-Host "Sonra NORMAL PowerShell:" -ForegroundColor Cyan
Write-Host "  npm run start:clean`n" -ForegroundColor White
