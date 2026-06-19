#!/usr/bin/env bash
# MacBook: Xcode / CocoaPods kurulum kontrolu (EAS cloud yok).
set -euo pipefail
cd "$(dirname "$0")/.."

echo ""
echo "=== GastroSkor iOS build ortami (Mac) ==="
echo ""

check() {
  if command -v "$1" >/dev/null 2>&1; then
    echo "  [OK] $1"
    return 0
  fi
  echo "  [!!] $1 eksik"
  return 1
}

ok=0
check node || ok=1
check npm || ok=1
check pod || ok=1
check xcodebuild || ok=1

if xcode-select -p >/dev/null 2>&1; then
  echo "  [OK] Xcode CLI: $(xcode-select -p)"
else
  echo "  [!!] xcode-select — App Store'dan Xcode kur"
  ok=1
fi

if [[ -f .env ]]; then
  echo "  [OK] .env mevcut"
else
  echo "  [!!] .env yok — cp .env.example .env"
  ok=1
fi

echo ""
echo "Kurulum (ucretsiz, bir kez):"
echo "  1. App Store -> Xcode (buyuk indirme)"
echo "  2. Xcode ac -> Settings -> Accounts -> Apple ID (Developer hesabi)"
echo "  3. sudo gem install cocoapods   (veya: brew install cocoapods)"
echo "  4. .env doldur (canli API + Google iOS client ID)"
echo ""
echo "Build + TestFlight yukleme (EAS ucreti yok):"
echo "  npm run build:ios:local"
echo "  veya Xcode: open ios/GastroSkor.xcworkspace -> Product -> Archive -> Distribute"
echo ""
echo "App Store Connect: https://appstoreconnect.apple.com/apps/6776410673/testflight/ios"
echo ""

if [[ $ok -eq 0 ]]; then
  echo "Ortam hazir gorunuyor."
else
  echo "Eksikleri tamamla."
fi
