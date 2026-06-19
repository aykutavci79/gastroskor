# 8081-8084 uzerindeki eski Metro/Node sureclerini kapatir
$ports = 8081, 8082, 8083, 8084
$killed = @()

foreach ($port in $ports) {
  $lines = netstat -ano | Select-String ":$port\s" | Select-String "LISTENING"
  foreach ($line in $lines) {
    $procId = ($line -split '\s+')[-1]
    if ($procId -match '^\d+$' -and $procId -ne '0' -and $killed -notcontains $procId) {
      $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
      if ($proc) {
        Write-Host "Kapatiliyor: PID $procId ($($proc.ProcessName)) port $port" -ForegroundColor Yellow
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        $killed += $procId
      }
    }
  }
}

if ($killed.Count -eq 0) {
  Write-Host "Temiz: Metro portu bos." -ForegroundColor Green
} else {
  Write-Host "Tamam: $($killed.Count) surec kapatildi." -ForegroundColor Green
}
