#!/usr/bin/env bash
# Portable Android toolchain setup — no admin, no UAC, all under ~/dev-tools
set -euo pipefail

TOOLS="/c/Users/saish/dev-tools"
JDK_DIR="$TOOLS/jdk17"
SDK_DIR="$TOOLS/android-sdk"
DL="$TOOLS/downloads"

mkdir -p "$DL" "$TOOLS"

echo "=== [1/5] JDK 17 ==="
if [ ! -x "$JDK_DIR/bin/java.exe" ]; then
  curl -L --retry 3 -o "$DL/jdk17.zip" \
    "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse"
  rm -rf "$TOOLS/_jdk_tmp" && mkdir -p "$TOOLS/_jdk_tmp"
  unzip -q "$DL/jdk17.zip" -d "$TOOLS/_jdk_tmp"
  INNER="$(find "$TOOLS/_jdk_tmp" -maxdepth 1 -mindepth 1 -type d | head -1)"
  rm -rf "$JDK_DIR" && mv "$INNER" "$JDK_DIR"
  rm -rf "$TOOLS/_jdk_tmp"
  echo "JDK installed: $JDK_DIR"
else
  echo "JDK already present"
fi
export JAVA_HOME="$JDK_DIR"
export PATH="$JDK_DIR/bin:$PATH"
java -version 2>&1 | head -2

echo "=== [2/5] Android command-line tools ==="
if [ ! -f "$SDK_DIR/cmdline-tools/latest/bin/sdkmanager.bat" ]; then
  curl -L --retry 3 -o "$DL/cmdline-tools.zip" \
    "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
  rm -rf "$TOOLS/_cmd_tmp" && mkdir -p "$TOOLS/_cmd_tmp"
  unzip -q "$DL/cmdline-tools.zip" -d "$TOOLS/_cmd_tmp"
  mkdir -p "$SDK_DIR/cmdline-tools"
  rm -rf "$SDK_DIR/cmdline-tools/latest"
  mv "$TOOLS/_cmd_tmp/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"
  rm -rf "$TOOLS/_cmd_tmp"
  echo "cmdline-tools installed"
else
  echo "cmdline-tools already present"
fi

export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="$SDK_DIR"
SDKMGR="$SDK_DIR/cmdline-tools/latest/bin/sdkmanager.bat"

echo "=== [3/5] Accepting licenses ==="
yes | "$SDKMGR" --licenses > /dev/null 2>&1 || true

echo "=== [4/5] SDK packages (this is the big download) ==="
"$SDKMGR" --install \
  "platform-tools" \
  "platforms;android-34" \
  "build-tools;34.0.0" \
  "emulator" \
  "system-images;android-34;google_apis;x86_64" 2>&1 | tail -5

echo "=== [5/5] Creating AVD ==="
AVDMGR="$SDK_DIR/cmdline-tools/latest/bin/avdmanager.bat"
if ! "$AVDMGR" list avd 2>/dev/null | grep -q "medibloom_test"; then
  echo "no" | "$AVDMGR" create avd -n medibloom_test \
    -k "system-images;android-34;google_apis;x86_64" -d "pixel_6" --force
  echo "AVD created"
else
  echo "AVD already exists"
fi

echo ""
echo "TOOLCHAIN READY"
echo "JAVA_HOME=$JDK_DIR"
echo "ANDROID_HOME=$SDK_DIR"
