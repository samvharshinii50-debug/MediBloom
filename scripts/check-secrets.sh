#!/usr/bin/env bash
# Refuses to let a credential reach the repository.
#
#   bash scripts/check-secrets.sh        # scan tracked + staged files
#
# Wire it into git so it runs on every commit:
#   git config core.hooksPath .githooks
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; OFF=$'\033[0m'
found=0

# Pattern, and what it is, so the failure explains itself.
check() {
  local pattern="$1" label="$2" allow="${3:-}"
  local hits
  # Only look at files git actually knows about — build output and
  # node_modules are not our problem.
  hits=$(git grep -nE "$pattern" -- \
        ':!scripts/check-secrets.sh' ':!.githooks/*' 2>/dev/null)
  # Drop known-safe placeholders so the scan stays worth reading.
  if [ -n "$allow" ] && [ -n "$hits" ]; then
    hits=$(printf '%s\n' "$hits" | grep -vE "$allow")
  fi
  if [ -n "$hits" ]; then
    echo "${RED}✗ $label${OFF}"
    echo "$hits" | sed 's/^/    /'
    found=1
  fi
}

echo "Scanning tracked files for credentials…"

check 'gsk_[A-Za-z0-9]{30,}'                  'Groq API key'
check 'sk-[A-Za-z0-9]{32,}'                   'OpenAI-style API key'
check 'sk-or-v1-[A-Za-z0-9]{20,}'             'OpenRouter API key'
check 'AIza[A-Za-z0-9_-]{30,}'                'Google API key'
check 'ghp_[A-Za-z0-9]{30,}'                  'GitHub personal access token'
check "apiKey:[[:space:]]*'[^']{12,}'"         'non-empty apiKey literal'
check "publicKey:[[:space:]]*'[^']{8,}'"       'non-empty EmailJS public key'
check "privateKey:[[:space:]]*'[^']{8,}'"      'non-empty EmailJS private key'
check "serviceId:[[:space:]]*'[^']{6,}'"       'non-empty EmailJS service id'
check 'MEDIBLOOM_UPLOAD_(STORE|KEY)_PASSWORD=[^$]' 'hardcoded keystore password'
# Real addresses only — placeholders like your.email@gmail.com are the point of
# a placeholder, and example.com is reserved for exactly this.
check '[A-Za-z0-9._%+-]+@(gmail|yahoo|outlook|hotmail)\.com' 'personal email address' \
      'your\.email@|your@|name@|user@|someone@|example@|caregiver@|patient@'

# Files that must never be tracked at all.
for path in app/credentials app/credentials/signing.env; do
  if git ls-files --error-unmatch "$path" >/dev/null 2>&1; then
    echo "${RED}✗ $path is tracked by git${OFF}"
    found=1
  fi
done
if git ls-files 2>/dev/null | grep -qE '\.(keystore|jks|apk|aab)$'; then
  echo "${RED}✗ a keystore or built APK is tracked by git${OFF}"
  git ls-files | grep -E '\.(keystore|jks|apk|aab)$' | sed 's/^/    /'
  found=1
fi

if [ "$found" -eq 0 ]; then
  echo "${GREEN}✓ clean — no credentials found in tracked files${OFF}"
  exit 0
fi

echo
echo "${YELLOW}Fix the lines above before committing or pushing.${OFF}"
echo "Keys belong in the app's Settings screen, or in app/credentials/signing.env,"
echo "both of which stay out of git."
exit 1
