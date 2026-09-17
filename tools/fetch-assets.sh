#!/usr/bin/env bash
# Downloads every asset listed in a manifest into the repository.
# Manifest format: one asset per line -> "<destination path> <https url>"
# Lines starting with # and blank lines are ignored.
set -euo pipefail
manifest="${1:-tools/assets-manifest.txt}"
[ -f "$manifest" ] || { echo "manifest not found: $manifest" >&2; exit 1; }
while read -r dest url; do
  [ -z "${dest:-}" ] && continue
  case "$dest" in \#*) continue ;; esac
  mkdir -p "$(dirname "$dest")"
  echo "-> $dest"
  curl -fsSL --retry 4 --retry-delay 3 -o "$dest" "$url"
  ls -la "$dest"
done < "$manifest"
