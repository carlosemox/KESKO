#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
CI=true corepack pnpm audit --prod --audit-level=high
scan_status=0
rg -l --hidden --glob '!.git/**' --glob '!node_modules/**' --glob '!scripts/harness/security-check.sh' '(BEGIN .*PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{20,}|sk-proj-[A-Za-z0-9_-]{20,})' . || scan_status=$?
if [ "$scan_status" -eq 0 ]; then
  echo "Potential secret pattern found" >&2
  exit 1
fi
if [ "$scan_status" -ne 1 ]; then
  echo "Secret scan could not complete" >&2
  exit 1
fi
