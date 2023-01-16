#!/usr/bin/env bash
set -euo pipefail

THIS_DIR="$(dirname "$(realpath "$0")")"

code_quality() {
  echo "Checking for unformatted TypeScript sources"
  deno fmt --check
  echo "Linting all TypeScript sources"
  deno lint
}

auto_fmt() {
  echo "Auto-formatting TypeScript sources"
  deno fmt
}

update_cache() {
  echo "Updating cache"
  deno cache ./src/**/**.ts "$@"
  echo "All good!"
}

update_lock() {
  "$0" update_cache --lock-write
}

run_tests() {
  deno test -A
}

"$@"