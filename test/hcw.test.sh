#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail() { echo "FAIL: $1" >&2; exit 1; }

# --- slugify ---
HCW_LIB=1 source "$ROOT/bin/hcw"
[ "$(slugify 'Harbour at 6am')" = "harbour-at-6am" ] || fail "slugify basic"
[ "$(slugify '  The Sea, Remembered!  ')" = "the-sea-remembered" ] || fail "slugify punctuation/trim"

echo "PASS: hcw slugify"

# --- scaffold (isolated temp git repo) ---
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git -C "$TMP" init -q
git -C "$TMP" commit -q --allow-empty -m init
mkdir -p "$TMP/bin"
cp "$ROOT/bin/hcw" "$TMP/bin/hcw"

OUT="$(cd "$TMP" && HCW_LIB=1 bash -c 'source bin/hcw; scaffold verses poem "Test Title"')"
[ "$OUT" = "$TMP/src/verses/test-title.md" ] || fail "scaffold returns file path ($OUT)"
[ -f "$TMP/src/verses/test-title.md" ] || fail "scaffold created file"
grep -q '^title: Test Title$'  "$TMP/src/verses/test-title.md" || fail "frontmatter title"
grep -q '^kind: poem$'         "$TMP/src/verses/test-title.md" || fail "frontmatter kind"
grep -q '^date: [0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}$' "$TMP/src/verses/test-title.md" || fail "frontmatter date"
[ "$(git -C "$TMP" rev-parse --abbrev-ref HEAD)" = "edit/test-title" ] || fail "edit branch created"

echo "PASS: hcw scaffold"
