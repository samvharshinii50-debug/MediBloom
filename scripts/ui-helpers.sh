#!/usr/bin/env bash
# Small helpers for driving the app over adb during on-device testing.
# Source this, don't run it:  source scripts/ui-helpers.sh
export ANDROID_HOME="${ANDROID_HOME:-/c/Users/saish/dev-tools/android-sdk}"
export PATH="$ANDROID_HOME/platform-tools:$PATH"

PKG=com.medibloom.app
SHOTS="${SHOTS:-/c/Users/saish/AppData/Local/Temp/claude/C--Users-saish/d1f4b857-5311-4f0a-b7a2-07f6fc03db46/scratchpad/shots}"
mkdir -p "$SHOTS"

shot() { adb exec-out screencap -p > "$SHOTS/$1.png"; echo "shot: $1"; }

# Git Bash rewrites anything that looks like a POSIX path into a Windows one,
# which turns /sdcard/ui.xml into C:/Files/Git/sdcard/ui.xml on the device.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

# Dumps the view hierarchy and prints every piece of visible text, one per line.
# Far more reliable than reading a screenshot when checking wording.
ui_dump() {
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  adb shell cat /sdcard/ui.xml 2>/dev/null
}

ui_text() {
  ui_dump \
    | tr '>' '\n' \
    | grep -o 'text="[^"]*"' \
    | sed 's/text="//; s/"$//' \
    | grep -v '^$'
}

# Waits until the app window is focused rather than sleeping a fixed amount.
wait_focused() {
  for _ in $(seq 1 40); do
    adb shell dumpsys window 2>/dev/null | grep -q "mCurrentFocus.*$PKG" && return 0
    sleep 1
  done
  echo "WARN: app never took focus"; return 1
}

relaunch() {
  adb shell am force-stop $PKG
  adb shell am start -n $PKG/.MainActivity >/dev/null 2>&1
  wait_focused
  sleep 4
}

# Taps the centre of the first node whose text matches $1 exactly.
tap_text() {
  local bounds
  bounds=$(ui_dump | tr '>' '\n' \
    | grep -F "text=\"$1\"" | head -1 \
    | grep -o 'bounds="\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]"' | head -1)
  if [ -z "$bounds" ]; then echo "NOT FOUND: $1"; return 1; fi
  local nums x1 y1 x2 y2
  nums=$(echo "$bounds" | grep -o '[0-9]*')
  x1=$(echo "$nums" | sed -n 1p); y1=$(echo "$nums" | sed -n 2p)
  x2=$(echo "$nums" | sed -n 3p); y2=$(echo "$nums" | sed -n 4p)
  adb shell input tap $(( (x1 + x2) / 2 )) $(( (y1 + y2) / 2 ))
  echo "tapped: $1"
}

errors_since() {
  adb logcat -d -t "${1:-200}" 2>/dev/null \
    | grep -Ei "FATAL|AndroidRuntime|ReactNativeJS.*(Error|Warn)" | head -20
}
