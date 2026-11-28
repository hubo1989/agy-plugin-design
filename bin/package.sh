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

VERSION="$(node -p "require('./agy-plugin.json').version")"
DIST_DIR="dist"
ARCHIVE_NAME="agy-plugin-design-${VERSION}.tar.gz"
ARCHIVE_PATH="${DIST_DIR}/${ARCHIVE_NAME}"
SHA512_PATH="${ARCHIVE_PATH}.sha512"

mkdir -p "$DIST_DIR"
COPYFILE_DISABLE=1 tar -czf "$ARCHIVE_PATH" -C "$OUT" .
node -e "
const fs = require('node:fs');
const crypto = require('node:crypto');
const buf = fs.readFileSync(process.argv[1]);
const hex = crypto.createHash('sha512').update(buf).digest('hex');
fs.writeFileSync(process.argv[2], hex + '  ' + process.argv[3] + '\n');
" "$ARCHIVE_PATH" "$SHA512_PATH" "$ARCHIVE_NAME"

echo "== packaged archive =="
ls -lh "$ARCHIVE_PATH" "$SHA512_PATH"
cat "$SHA512_PATH"
