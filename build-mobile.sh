#!/usr/bin/env bash
# =========================================================================
# Сборка мобильного приложения
#
# Запуск из mobile-platform/:
#   ./build-mobile.sh web      — Web build (статика для CDN)
#   ./build-mobile.sh android  — APK через EAS Build (нужен Expo аккаунт)
#   ./build-mobile.sh ios      — iOS через EAS Build (нужен Apple Dev)
#   ./build-mobile.sh all      — все три варианта
#   ./build-mobile.sh submit   — отправить в App Store + Play Store
#   ./build-mobile.sh local-android  — локальный APK через Gradle
#   ./build-mobile.sh dev      — preview build (внутренний APK для теста)
# =========================================================================

set -euo pipefail

MOBILE_DIR="$(cd "$(dirname "$0")/apps/mobile" && pwd)"
PNPM="pnpm"

# На Windows pnpm часто не в PATH — пробуем найти
if ! command -v pnpm >/dev/null 2>&1; then
  if [[ -f "/c/Users/Roman/AppData/Roaming/npm/pnpm.cmd" ]]; then
    export PATH="/c/Users/Roman/AppData/Roaming/npm:$PATH"
  fi
fi

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}→${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC}  $*"; }
err()  { echo -e "${RED}✗${NC}  $*" >&2; }

cmd_web() {
  cd "$MOBILE_DIR"
  log "Web build (Expo Router → static)"
  $PNPM exec expo export --platform web --output-dir dist-web
  log "✓ Готово: $MOBILE_DIR/dist-web/"
  log "  Можно деплоить на любой статический хостинг или nginx"
  ls -lh "$MOBILE_DIR/dist-web/" | head -10
}

cmd_dev_android() {
  cd "$MOBILE_DIR"
  log "EAS Build — preview (APK для внутреннего теста)"

  if ! command -v eas >/dev/null 2>&1; then
    err "eas-cli не установлен. Запусти: npm i -g eas-cli && eas login"
    exit 1
  fi

  $PNPM exec eas build --platform android --profile preview --non-interactive
}

cmd_android() {
  cd "$MOBILE_DIR"
  log "EAS Build — production AAB для Google Play"
  $PNPM exec eas build --platform android --profile production --non-interactive
}

cmd_ios() {
  cd "$MOBILE_DIR"
  log "EAS Build — production IPA для App Store"
  warn "Нужен Apple Developer аккаунт + настроенный ASC App ID в eas.json"
  $PNPM exec eas build --platform ios --profile production --non-interactive
}

cmd_all() {
  cmd_web
  warn "Native builds запускаются на серверах Expo и могут занять 15-30 минут каждый"
  cmd_android
  cmd_ios
}

cmd_submit() {
  cd "$MOBILE_DIR"
  log "Submit последних build'ов в сторы"
  $PNPM exec eas submit --platform android --latest
  $PNPM exec eas submit --platform ios --latest
}

cmd_local_android() {
  cd "$MOBILE_DIR"
  log "Локальный Android APK через expo prebuild + gradle"
  warn "Требуется Android SDK + Gradle. Если нет — используй ./build-mobile.sh dev (через EAS)"
  $PNPM exec expo prebuild --platform android --clean
  cd android && ./gradlew assembleRelease
  log "✓ APK: $MOBILE_DIR/android/app/build/outputs/apk/release/app-release.apk"
}

cmd_help() {
  cat <<EOF
Сборка мобильного приложения

Использование: ./build-mobile.sh <команда>

  web              Web build (статика, готова к деплою на любой CDN)
  dev              Preview APK через EAS Build (для внутреннего теста)
  android          Production AAB для Google Play (через EAS)
  ios              Production IPA для App Store (через EAS, нужен Apple Dev)
  all              web + android + ios
  submit           отправить последние build'ы в сторы
  local-android    локальный APK через Gradle (нужен Android SDK)

Предусловия:
  - Зависимости: pnpm install (в корне монорепо)
  - Для EAS: eas-cli установлен (npm i -g eas-cli) + eas login
  - Для iOS: \$99/год Apple Developer + настроенный eas.json
  - Для local-android: Android SDK + Gradle

Конфигурация:
  - apps/mobile/app.json   (имя, slug, bundleId)
  - apps/mobile/eas.json   (EAS profiles + submit credentials)
EOF
}

case "${1:-help}" in
  web)     cmd_web ;;
  dev)     cmd_dev_android ;;
  android) cmd_android ;;
  ios)     cmd_ios ;;
  all)     cmd_all ;;
  submit)  cmd_submit ;;
  local-android) cmd_local_android ;;
  help|-h|--help) cmd_help ;;
  *)
    err "Неизвестная команда: $1"
    cmd_help
    exit 1
    ;;
esac
