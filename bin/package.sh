#!/usr/bin/env bash
# Assemble a clean, installable agy-plugin-design folder outside the repo tree and verify it.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${PLUGIN_DIST_DIR:-../agy-design-dist}"

INCLUDE=(
  agy-plugin.json
  settings.schema.json
  package.json
  LICENSE
  NOTICE.md
  README.md
  vendor-rewrites.json
  locales
  assets
  references
  scripts
  src
  templates
  tools
  vendor
)

rm -rf "$OUT"
mkdir -p "$OUT"
rsync -a --exclude '.DS_Store' --exclude '__MACOSX' "${INCLUDE[@]}" "$OUT/"

echo "== verify dist =="
node "$OUT/scripts/verify.js" "$OUT"
du -sh "$OUT"
echo "dist assembled at $OUT/"
