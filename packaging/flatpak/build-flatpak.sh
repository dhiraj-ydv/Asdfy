#!/usr/bin/env bash
# Build the TypeDH Flatpak bundle from a clean checkout.
# Produces dist/typedh-<version>-x86_64.flatpak (single-file bundle).
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

app_id="io.github.exolithelabs.typedh"
manifest="packaging/flatpak/${app_id}.yml"
version="$(node -p "require('./package.json').version")"
output_dir="$repo_root/dist"
bundle="$output_dir/typedh-${version}-x86_64.flatpak"

command -v flatpak >/dev/null || { echo "flatpak is not installed" >&2; exit 1; }
command -v flatpak-builder >/dev/null || { echo "flatpak-builder is not installed" >&2; exit 1; }
[[ -f "$manifest" ]] || { echo "Missing $manifest" >&2; exit 1; }

rm -rf .flatpak-builder packaging/flatpak/build-dir packaging/flatpak/repo
mkdir -p "$output_dir"

flatpak-builder --force-clean --repo=packaging/flatpak/repo \
  packaging/flatpak/build-dir "$manifest"

flatpak build-bundle --runtime-repo=https://flathub.org/repo/flathub.flatpakrepo packaging/flatpak/repo \
  "$bundle" "$app_id"

echo "Wrote $bundle"
