# Eglence + Sofra bundle gorsellerini ekran boyutuna kucultur (APK bitmap bellek baskisi).
# Orijinaller git'te kayitli; gerekirse `git checkout -- <path>` ile geri alinir.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..
Add-Type -AssemblyName System.Drawing

function Resize-PngMaxEdge {
  param([string]$Path, [int]$MaxEdge)
  $src = [System.Drawing.Image]::FromFile($Path)
  $scale = [Math]::Min(1.0, $MaxEdge / [Math]::Max($src.Width, $src.Height))
  if ($scale -ge 1.0) {
    Write-Host ("ATLA (zaten kucuk): {0} ({1}x{2})" -f $Path, $src.Width, $src.Height) -ForegroundColor DarkGray
    $src.Dispose()
    return
  }
  $newW = [int][Math]::Round($src.Width * $scale)
  $newH = [int][Math]::Round($src.Height * $scale)
  $oldKB = [math]::Round((Get-Item $Path).Length / 1KB)
  $bmp = New-Object System.Drawing.Bitmap($newW, $newH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($src, 0, 0, $newW, $newH)
  $g.Dispose()
  $src.Dispose()
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $newKB = [math]::Round((Get-Item $Path).Length / 1KB)
  Write-Host ("OK PNG {0} -> {1}x{2}  {3}KB -> {4}KB" -f $Path, $newW, $newH, $oldKB, $newKB) -ForegroundColor Green
}

function Resize-JpegMaxWidth {
  param([string]$Path, [int]$MaxWidth, [int]$Quality = 82)
  $src = [System.Drawing.Image]::FromFile($Path)
  $scale = [Math]::Min(1.0, $MaxWidth / [double]$src.Width)
  if ($scale -ge 1.0 -and (Get-Item $Path).Length -lt 350KB) {
    Write-Host ("ATLA (yeterince kucuk): {0} ({1}x{2})" -f $Path, $src.Width, $src.Height) -ForegroundColor DarkGray
    $src.Dispose()
    return
  }
  $newW = [int][Math]::Round($src.Width * $scale)
  $newH = [int][Math]::Round($src.Height * $scale)
  $oldKB = [math]::Round((Get-Item $Path).Length / 1KB)
  $bmp = New-Object System.Drawing.Bitmap($newW, $newH, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($src, 0, 0, $newW, $newH)
  $g.Dispose()
  $src.Dispose()
  $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
  $bmp.Save($Path, $encoder, $encParams)
  $bmp.Dispose()
  $newKB = [math]::Round((Get-Item $Path).Length / 1KB)
  Write-Host ("OK JPG {0} -> {1}x{2}  {3}KB -> {4}KB" -f $Path, $newW, $newH, $oldKB, $newKB) -ForegroundColor Green
}

# path => max kenar (px). Carousel ~158px; 384 = ~2.4x retina.
$pngTargets = @{
  "assets/gastro-hub/games/kelime-sofrasi-icon.png"           = 384
  "assets/gastro-hub/games/gunluk-kelime-icon.png"           = 384
  "assets/gastro-hub/games/kelime-yarismasi-icon.png"         = 384
  "assets/gastro-hub/games/kelime-bul-icon.png"               = 384
  "assets/gastro-hub/games/soru-cevap-icon.png"               = 384
  "assets/gastro-hub/games/sudoku-icon.png"                   = 384
  "assets/gastro-hub/tasks/daily-login.png"                   = 192
  "assets/gastro-hub/tasks/follow.png"                        = 192
  "assets/gastro-hub/tasks/invite.png"                        = 192
  "assets/gastro-hub/tasks/order.png"                         = 192
  "assets/gastro-hub/tasks/review.png"                        = 192
  "assets/gastro-hub/gastrocoin-icon-gc.png"                  = 192
  "assets/gastro-hub/gastrocoin-logo.png"                     = 256
  "assets/gastro-hub/gastrocoin-wallet-transparent.png"       = 256
  "assets/gastro-hub/designs/gastrocoin-wallet-coin-transparent.png" = 192
}

foreach ($rel in $pngTargets.Keys) {
  $path = Join-Path (Get-Location) $rel
  if (-not (Test-Path $path)) { Write-Host "ATLA (yok): $rel" -ForegroundColor DarkYellow; continue }
  Resize-PngMaxEdge -Path $path -MaxEdge $pngTargets[$rel]
}

$jpgDir = Join-Path (Get-Location) "assets/regional-flavors"
if (Test-Path $jpgDir) {
  Get-ChildItem $jpgDir -Filter *.jpg | ForEach-Object {
    Resize-JpegMaxWidth -Path $_.FullName -MaxWidth 960 -Quality 82
  }
}

Write-Host "Eglence + Sofra bundle gorselleri optimize edildi." -ForegroundColor Cyan
