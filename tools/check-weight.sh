#!/usr/bin/env bash
# Vérifie les contraintes de poids du site : total < 25 Mo, aucun fichier > 8 Mo.
set -euo pipefail
cd "$(dirname "$0")/../site"
limit_total=$((25 * 1024 * 1024))
limit_file=$((8 * 1024 * 1024))
total=0
status=0
while IFS= read -r -d '' f; do
  size=$(stat -c %s "$f")
  total=$((total + size))
  if [ "$size" -gt "$limit_file" ]; then
    echo "TROP LOURD (> 8 Mo) : $f ($((size / 1024)) Ko)"
    status=1
  fi
done < <(find . -type f -print0)
echo "Poids total du site : $((total / 1024)) Ko ($(awk "BEGIN{printf \"%.2f\", $total/1048576}") Mo)"
if [ "$total" -gt "$limit_total" ]; then
  echo "TROP LOURD : le site dépasse 25 Mo"
  status=1
fi
echo "Fichiers les plus lourds :"
find . -type f -printf '%s %p\n' | sort -rn | head -8 | awk '{printf "  %7d Ko  %s\n", $1/1024, $2}'
exit $status
