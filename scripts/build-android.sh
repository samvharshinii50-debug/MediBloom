#!/usr/bin/env bash
# Builds and installs MediBloom on whatever device/emulator adb sees.
set -euo pipefail

export JAVA_HOME="/c/Users/saish/dev-tools/jdk17"
export ANDROID_HOME="/c/Users/saish/dev-tools/android-sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

cd /c/Users/saish/MediBloom/app

echo "=== prebuild (generate native android project) ==="
npx expo prebuild --platform android --no-install

echo "=== build + install ==="
npx expo run:android --no-bundler --device emulator-5554

echo "BUILD DONE"
