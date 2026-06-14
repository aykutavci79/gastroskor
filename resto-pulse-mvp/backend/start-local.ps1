# GastroSkor API — local gelistirme (Windows)
# Kullanim: .\start-local.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    Write-Host "Sanal ortam yok — olusturuluyor..." -ForegroundColor Yellow
    python -m venv .venv
    .\.venv\Scripts\python.exe -m pip install --upgrade pip
    .\.venv\Scripts\python.exe -m pip install -r requirements.txt
}

Write-Host "API: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "Docs: http://127.0.0.1:8000/docs" -ForegroundColor Green
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
