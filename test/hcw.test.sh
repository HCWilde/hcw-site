#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { echo "FAIL: $1" >&2; exit 1; }

# --- slugify ---
HCW_LIB=1 source "$ROOT/bin/hcw"
[ "$(slugify 'Harbour at 6am')" = "harbour-at-6am" ] || fail "slugify basic"
[ "$(slugify '  The Sea, Remembered!  ')" = "the-sea-remembered" ] || fail "slugify punctuation/trim"

echo "PASS: hcw slugify"
