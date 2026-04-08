#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[release-check] cargo check"
cargo check --manifest-path "$REPO_ROOT/src-tauri/Cargo.toml"

echo "[release-check] web build"
npm run web:build --prefix "$REPO_ROOT"

echo "[release-check] desktop smoke test"
ORIGINAL_HOME="${ORIGINAL_HOME:-$HOME}" \
  npm run desktop:test:smoke --prefix "$REPO_ROOT"

echo "[release-check] complete"
