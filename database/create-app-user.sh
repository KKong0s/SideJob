#!/bin/bash
# Runs once when the MySQL container initialises (after schema/geo/seed).
# Creates the Node-RED database user with least privilege:
#   - geo tables: SELECT only
#   - admin_logs: SELECT, INSERT only (append-only audit log)
#   - other tables: SELECT, INSERT, UPDATE, DELETE
# Grants are per table, so tables added later need a matching GRANT (see README.md).
set -euo pipefail

: "${MYSQL_APP_USER:?MYSQL_APP_USER is required}"
: "${MYSQL_APP_PASSWORD:?MYSQL_APP_PASSWORD is required}"

mysql_root() {
  mysql --protocol=socket -uroot -p"${MYSQL_ROOT_PASSWORD}" "$@"
}

mysql_root <<SQL
CREATE USER IF NOT EXISTS '${MYSQL_APP_USER}'@'%' IDENTIFIED BY '${MYSQL_APP_PASSWORD}';
SQL

tables=$(mysql_root -N -B -e "SELECT table_name FROM information_schema.tables WHERE table_schema = 'sidejob' AND table_type = 'BASE TABLE'")

grants=""
for t in $tables; do
  case "$t" in
    regions|provinces|districts) privs="SELECT" ;;
    admin_logs)                  privs="SELECT, INSERT" ;;
    *)                           privs="SELECT, INSERT, UPDATE, DELETE" ;;
  esac
  grants+="GRANT ${privs} ON sidejob.\`${t}\` TO '${MYSQL_APP_USER}'@'%';"$'\n'
done

mysql_root <<SQL
${grants}
FLUSH PRIVILEGES;
SQL

echo "create-app-user: granted privileges on $(echo "$tables" | wc -w) tables to ${MYSQL_APP_USER}"
