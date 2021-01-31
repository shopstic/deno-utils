#!/usr/bin/env bash
set -euo pipefail

echo "Checking formatting..."
deno fmt --unstable --check
echo "Linting..."
deno lint --unstable
echo "Runnning tests..."
deno test -A