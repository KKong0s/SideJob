#!/usr/bin/env bash
# Runs every API test suite in phase order and prints a summary.
# Usage (from the repo root, docker stack running): bash tests/api/run-all.sh
cd "$(dirname "$0")"
failed=0
for suite in auth shop jobs search applications notifications phase7 chat; do
  printf '%-15s ' "$suite"
  result=$(bash "./$suite.sh" 2>&1 | tail -1)
  echo "$result"
  [[ $result == *"failed: 0"* ]] || failed=1
done
exit $failed
