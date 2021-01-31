#!/usr/bin/env bash
set -euo pipefail

deno fmt --unstable --check
deno lint --unstable
deno test -A