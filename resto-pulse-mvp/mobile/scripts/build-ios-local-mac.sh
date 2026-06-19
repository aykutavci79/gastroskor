#!/usr/bin/env bash
# MacBook: lokal iOS archive (EAS cloud yok). TestFlight icin Xcode'dan yukle.
set -euo pipefail
cd "$(dirname "$0")/.."

APPLY_PREFLIGHT=false
SKIP_PREBUILD=false
for arg in "$@"; do
  case "$arg" in
    --apply-preflight) APPLY_PREFLIGHT=true ;;
    --skip-prebuild) SKIP_PREBUILD=true ;;
  esac
done

echo ""
echo "=== GastroSkor lokal iOS build (Mac) ==="

if [[ ! -f .env ]]; then
  echo "HATA: .env yok"
  exit 1
fi

if $APPLY_PREFLIGHT; then
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/release-preflight-local.ps1 -IosOnly -Apply 2>/dev/null \
    || node -e "console.log('Preflight: app.config.js buildNumber magazadan buyuk olmali')"
fi

if ! $SKIP_PREBUILD; then
  echo "prebuild (ios)..."
  npx expo prebuild --platform ios --clean
fi

echo "pod install..."
cd ios
pod install
cd ..

WORKSPACE="ios/GastroSkor.xcworkspace"
if [[ ! -d "$WORKSPACE" ]]; then
  # Expo slug farkli olabilir
  WORKSPACE=$(find ios -maxdepth 1 -name '*.xcworkspace' | head -n 1)
fi

if [[ -z "$WORKSPACE" || ! -d "$WORKSPACE" ]]; then
  echo "HATA: .xcworkspace bulunamadi — ios/ klasorunu kontrol et"
  exit 1
fi

echo ""
echo "Xcode aciliyor: $WORKSPACE"
echo ""
echo "Sonraki adimlar (ucretsiz, App Store Connect):"
echo "  1. Scheme: GastroSkor + Any iOS Device (arm64)"
echo "  2. Product -> Archive"
echo "  3. Distribute App -> App Store Connect -> Upload"
echo "  4. TestFlight'ta build islenince test et"
echo ""

open "$WORKSPACE"
