# Kurumsal/antivirus SSL kesmesi icin Java trust store olusturur.
# JBR cacerts kopyalanir + sistem proxy uzerinden hedef sunuculardan
# sunulan sertifika zinciri (Norton/AV MITM kok sertifikasi dahil) yakalanip
# icine aktarilir. Cikti (son satir): truststore yolu.
param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$javaHome = if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
  $env:JAVA_HOME
} else {
  "C:\Program Files\Android\Android Studio\jbr"
}
$keytool = Join-Path $javaHome "bin\keytool.exe"
$srcCacerts = Join-Path $javaHome "lib\security\cacerts"
if (-not (Test-Path $keytool)) { throw "keytool yok: $keytool" }
if (-not (Test-Path $srcCacerts)) { throw "cacerts yok: $srcCacerts" }

$buildDir = Join-Path (Get-Location) ".android-build"
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null
$truststore = Join-Path $buildDir "gastroskor-truststore.jks"
$storePass = "changeit"

if ((Test-Path $truststore) -and (-not $Force)) {
  Write-Host "Trust store mevcut (yeniden uretmek icin -Force)." -ForegroundColor DarkGray
  Write-Output $truststore
  return
}

Copy-Item $srcCacerts $truststore -Force

$certDir = Join-Path $buildDir "certs"
if (Test-Path $certDir) { Remove-Item $certDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $certDir | Out-Null

# Sistem proxy uzerinden hedef sunuculardan sunulan sertifika zincirini yakala.
$global:GsCaptured = New-Object System.Collections.ArrayList
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {
  param($s, $cert, $chain, $err)
  if ($chain -and $chain.ChainElements) {
    foreach ($el in $chain.ChainElements) { [void]$global:GsCaptured.Add($el.Certificate) }
  }
  if ($cert) { [void]$global:GsCaptured.Add($cert) }
  $true
}

$urls = @(
  "https://services.gradle.org/distributions/",
  "https://dl.google.com/",
  "https://maven.google.com/",
  "https://repo.maven.apache.org/maven2/",
  "https://plugins.gradle.org/",
  "https://jitpack.io/"
)

foreach ($u in $urls) {
  try {
    $req = [System.Net.HttpWebRequest]::Create($u)
    $req.Proxy = [System.Net.WebRequest]::GetSystemWebProxy()
    $req.Proxy.Credentials = [System.Net.CredentialCache]::DefaultCredentials
    $req.Timeout = 20000
    $req.Method = "HEAD"
    $resp = $req.GetResponse()
    $resp.Close()
    Write-Host "  zincir alindi: $u" -ForegroundColor DarkGray
  } catch {
    # HEAD bazen 405 doner ama cert zinciri yine yakalanir; sorun degil
    Write-Host "  denendi: $u" -ForegroundColor DarkGray
  }
}

[System.Net.ServicePointManager]::ServerCertificateValidationCallback = $null

Write-Host "Yakalanan sertifika sayisi: $($global:GsCaptured.Count)" -ForegroundColor DarkGray

$seen = @{}
$count = 0
foreach ($c in $global:GsCaptured) {
  if (-not $c) { continue }
  $cert2 = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($c)
  $tp = $cert2.Thumbprint
  if (-not $tp -or $seen.ContainsKey($tp)) { continue }
  $seen[$tp] = $true
  try {
    $cerPath = Join-Path $certDir "$tp.cer"
    $bytes = $cert2.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
    [System.IO.File]::WriteAllBytes($cerPath, $bytes)
    $ktArgs = @("-importcert", "-noprompt", "-trustcacerts", "-alias", "mitm-$tp", "-file", $cerPath, "-keystore", $truststore, "-storepass", $storePass)
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $keytool @ktArgs 2>$null | Out-Null
    $ec = $LASTEXITCODE
    $ErrorActionPreference = $prevEAP
    if ($ec -eq 0) {
      $count++
      Write-Host "  + $($cert2.Subject)" -ForegroundColor DarkGray
    }
  } catch {
    # tekil hata onemli degil
  }
}

if ($count -eq 0) {
  Write-Host "UYARI: Hicbir MITM sertifikasi yakalanamadi. Proxy/baglanti yok olabilir." -ForegroundColor Yellow
} else {
  Write-Host "$count sertifika trust store'a aktarildi." -ForegroundColor Green
}

Write-Output $truststore
