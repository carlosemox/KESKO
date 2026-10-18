#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
CI=true corepack pnpm verify
