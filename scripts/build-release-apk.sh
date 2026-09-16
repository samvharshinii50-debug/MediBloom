#!/usr/bin/env bash
# Builds a signed, standalone release APK — JS bundled in, no Metro needed.
# Safe to re-run: it re-applies signing config after any `expo prebuild --clean`.
set -euo pipefail

export JAVA_HOME="/c/Users/saish/dev-tools/jdk17"
export ANDROID_HOME="/c/Users/saish/dev-tools/android-sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

APP=/c/Users/saish/MediBloom/app
KEYSTORE_SRC="$APP/credentials/medibloom-release.keystore"
GRADLE_PROPS="$APP/android/gradle.properties"
BUILD_GRADLE="$APP/android/app/build.gradle"

cd "$APP"

if [ ! -f "$KEYSTORE_SRC" ]; then
  echo "ERROR: keystore missing at $KEYSTORE_SRC"
  echo "Create one with:"
  echo "  keytool -genkeypair -v -storetype PKCS12 -keystore $KEYSTORE_SRC \\"
  echo "    -alias medibloom -keyalg RSA -keysize 2048 -validity 10000"
  exit 1
fi

# Signing passwords live outside version control. Put them in
# app/credentials/signing.env (gitignored), or export them before running:
#
#   MEDIBLOOM_KEY_ALIAS=medibloom
#   MEDIBLOOM_STORE_PASSWORD=...
#   MEDIBLOOM_KEY_PASSWORD=...
#
SIGNING_ENV="$APP/credentials/signing.env"
if [ -f "$SIGNING_ENV" ]; then
  # shellcheck disable=SC1090
  . "$SIGNING_ENV"
fi

: "${MEDIBLOOM_KEY_ALIAS:=medibloom}"
if [ -z "${MEDIBLOOM_STORE_PASSWORD:-}" ] || [ -z "${MEDIBLOOM_KEY_PASSWORD:-}" ]; then
  echo "ERROR: signing passwords not set."
  echo "Create $SIGNING_ENV containing:"
  echo "  MEDIBLOOM_KEY_ALIAS=medibloom"
  echo "  MEDIBLOOM_STORE_PASSWORD=your-password"
  echo "  MEDIBLOOM_KEY_PASSWORD=your-password"
  exit 1
fi

echo "=== placing keystore ==="
cp "$KEYSTORE_SRC" android/app/medibloom-release.keystore

echo "=== signing properties ==="
if ! grep -q "MEDIBLOOM_UPLOAD_STORE_FILE" "$GRADLE_PROPS"; then
  cat >> "$GRADLE_PROPS" <<EOF

# MediBloom release signing (generated locally, never committed)
MEDIBLOOM_UPLOAD_STORE_FILE=medibloom-release.keystore
MEDIBLOOM_UPLOAD_KEY_ALIAS=$MEDIBLOOM_KEY_ALIAS
MEDIBLOOM_UPLOAD_STORE_PASSWORD=$MEDIBLOOM_STORE_PASSWORD
MEDIBLOOM_UPLOAD_KEY_PASSWORD=$MEDIBLOOM_KEY_PASSWORD
EOF
fi

echo "=== wiring release signingConfig ==="
if ! grep -q "MEDIBLOOM_UPLOAD_STORE_FILE" "$BUILD_GRADLE"; then
  # Add a release signing config and point buildTypes.release at it.
  python - "$BUILD_GRADLE" <<'PY'
import re, sys
path = sys.argv[1]
src = open(path, encoding='utf-8').read()

signing_block = '''        release {
            if (project.hasProperty('MEDIBLOOM_UPLOAD_STORE_FILE')) {
                storeFile file(MEDIBLOOM_UPLOAD_STORE_FILE)
                storePassword MEDIBLOOM_UPLOAD_STORE_PASSWORD
                keyAlias MEDIBLOOM_UPLOAD_KEY_ALIAS
                keyPassword MEDIBLOOM_UPLOAD_KEY_PASSWORD
            }
        }
'''

# Insert the release signing config right after the debug one.
m = re.search(r'(signingConfigs\s*\{.*?debug\s*\{.*?\n\s*\}\n)', src, re.S)
if m and 'release {' not in m.group(1):
    src = src[:m.end(1)] + signing_block + src[m.end(1):]

# Point the release build type at it.
src = re.sub(
    r'(buildTypes\s*\{.*?release\s*\{[^}]*?signingConfig\s+)signingConfigs\.debug',
    r'\1signingConfigs.release',
    src, flags=re.S)

open(path, 'w', encoding='utf-8').write(src)
print("build.gradle patched")
PY
fi

echo "=== building release APK (all ABIs) ==="
cd android
./gradlew assembleRelease --console=plain 2>&1 | grep -Ei "BUILD SUCCESSFUL|BUILD FAILED|FAILURE:|error:" | tail -10

OUT="$APP/android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$OUT" ]; then
  DEST=/c/Users/saish/MediBloom/MediBloom.apk
  cp "$OUT" "$DEST"
  echo "RELEASE APK READY: $DEST"
  ls -la "$DEST" | awk '{print "size:", $5}'
else
  echo "RELEASE APK NOT PRODUCED"; exit 1
fi
