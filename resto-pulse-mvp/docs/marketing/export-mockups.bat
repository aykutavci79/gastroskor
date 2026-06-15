@echo off
setlocal
cd /d "%~dp0"
if not exist panel-mockups mkdir panel-mockups

for %%f in (01-dashboard 02-siparis 03-menu 04-promo 05-mobil) do (
  echo Exporting %%f...
  call npx -y playwright screenshot "http://127.0.0.1:8765/%%f.html" "panel-mockups/%%f.png" --viewport-size "1280,820" --wait-for-timeout 500
)

echo Done. Files in panel-mockups\
