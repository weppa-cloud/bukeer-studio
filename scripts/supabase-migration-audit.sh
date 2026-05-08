#!/usr/bin/env bash
set -euo pipefail

studio_dir="${STUDIO_DIR:-$(pwd)}"
flutter_dir="${FLUTTER_DIR:-../bukeer_flutter}"

studio_migrations="$studio_dir/supabase/migrations"
flutter_migrations="$flutter_dir/supabase/migrations"

if [[ ! -d "$studio_migrations" ]]; then
  echo "Missing Studio migrations directory: $studio_migrations" >&2
  exit 1
fi

if [[ ! -d "$flutter_migrations" ]]; then
  echo "Missing Flutter migrations directory: $flutter_migrations" >&2
  exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

studio_files="$tmp_dir/studio-files.txt"
studio_normalized="$tmp_dir/studio-normalized.txt"
flutter_files="$tmp_dir/flutter-files.txt"
common_files="$tmp_dir/common-files.txt"
studio_only="$tmp_dir/studio-only.txt"
flutter_only="$tmp_dir/flutter-only.txt"
duplicate_twos="$tmp_dir/duplicate-twos.txt"
hash_mismatches="$tmp_dir/hash-mismatches.txt"
studio_versions="$tmp_dir/studio-versions.tsv"
flutter_versions="$tmp_dir/flutter-versions.tsv"
version_collisions="$tmp_dir/version-collisions.txt"

find "$studio_migrations" -maxdepth 1 -type f -name '*.sql' -exec basename {} \; | sort > "$studio_files"
sed 's/ 2\.sql$/.sql/' "$studio_files" | sort -u > "$studio_normalized"
find "$flutter_migrations" -maxdepth 1 -type f -name '*.sql' -exec basename {} \; | sort -u > "$flutter_files"
grep ' 2\.sql$' "$studio_files" > "$duplicate_twos" || true
awk '{ name=$0; version=name; sub(/_.*/, "", version); print version "\t" name }' "$studio_normalized" > "$studio_versions"
awk '{ name=$0; version=name; sub(/_.*/, "", version); print version "\t" name }' "$flutter_files" > "$flutter_versions"

comm -12 "$studio_normalized" "$flutter_files" > "$common_files"
comm -23 "$studio_normalized" "$flutter_files" > "$studio_only"
comm -13 "$studio_normalized" "$flutter_files" > "$flutter_only"

while IFS= read -r name; do
  studio_path="$studio_migrations/$name"
  duplicate_path="${studio_path%.sql} 2.sql"
  flutter_path="$flutter_migrations/$name"

  [[ -f "$studio_path" ]] || studio_path="$duplicate_path"
  [[ -f "$studio_path" && -f "$flutter_path" ]] || continue

  if ! cmp -s "$studio_path" "$flutter_path"; then
    echo "$name"
  fi
done < "$common_files" > "$hash_mismatches"

awk -F '\t' '
  NR == FNR {
    flutter[$1] = $2
    next
  }
  ($1 in flutter && flutter[$1] != $2) {
    print $1 "\tstudio=" $2 "\tflutter=" flutter[$1]
  }
' "$flutter_versions" "$studio_versions" > "$version_collisions"

count_file() {
  wc -l < "$1" | tr -d ' '
}

echo "Supabase migration audit"
echo "Studio:  $studio_migrations"
echo "Flutter: $flutter_migrations"
echo
echo "Counts"
echo "  studio sql files:             $(count_file "$studio_files")"
echo "  studio normalized migrations: $(count_file "$studio_normalized")"
echo "  flutter sql files:            $(count_file "$flutter_files")"
echo "  shared by name:               $(count_file "$common_files")"
echo "  studio-only normalized:       $(count_file "$studio_only")"
echo "  flutter-only:                 $(count_file "$flutter_only")"
echo "  studio duplicate '* 2.sql':   $(count_file "$duplicate_twos")"
echo "  shared filename mismatches:   $(count_file "$hash_mismatches")"
echo "  same-version name collisions: $(count_file "$version_collisions")"

print_section() {
  local title="$1"
  local file="$2"
  echo
  echo "$title"
  if [[ -s "$file" ]]; then
    sed -n '1,120p' "$file"
    local total
    total="$(count_file "$file")"
    if (( total > 120 )); then
      echo "... ($((total - 120)) more)"
    fi
  else
    echo "  none"
  fi
}

print_section "Studio duplicate '* 2.sql' files" "$duplicate_twos"
print_section "Shared filenames with different SQL contents" "$hash_mismatches"
print_section "Same-version Studio/Flutter filename collisions" "$version_collisions"
print_section "Studio-only normalized migrations" "$studio_only"
print_section "Flutter-only migrations" "$flutter_only"
