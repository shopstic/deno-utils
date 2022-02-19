#!/usr/bin/env bash
set -euo pipefail

echo "Checking formatting..."
deno fmt --check --ignore=.vscode
echo "Linting..."
deno lint
echo "Runnning tests..."
deno test -A