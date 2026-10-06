#!/usr/bin/env bash
# Applies database/migrations/*.sql to the running MySQL container (in name order), then re-runs the
# per-table GRANTs so the app user can use new tables. Migrations are written to be safe to run again.
# Usage (from the repo root, docker stack running): bash database/migrate.sh
set -euo pipefail
cd "$(dirname "$0")/.."

for f in database/migrations/*.sql; do
  echo "migrate: $f"
  docker exec -i sidejob-mysql sh -c 'mysql --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD"' < "$f"
done

# Same script that runs on first start; it uses the container's MYSQL_* environment
docker exec -i sidejob-mysql bash < database/create-app-user.sh
