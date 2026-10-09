#!/usr/bin/env bash
# Loads demo data into the running stack (safe to run again: old demo data is removed first).
# Accounts: shop01..shop14, store001..store100 (all 77 provinces) and seeker01..seeker06 @demo.sidejob.local, password Demo@1234
# Usage (from the repo root): bash database/demo/seed-demo.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

mysql_root() {
  docker exec -i sidejob-mysql sh -c 'mysql --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD" sidejob 2>&1 | grep -v "Using a password" || true'
}

echo "demo: removing previous demo data"
mysql_root <<'SQL'
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET @demo := '%@demo.sidejob.local';
DELETE r FROM reports r JOIN users u ON u.id = r.reporter_user_id WHERE u.email LIKE @demo;
DELETE r FROM reviews r JOIN applications a ON a.id = r.application_id JOIN jobs j ON j.id = a.job_id JOIN shops s ON s.id = j.shop_id JOIN users u ON u.id = s.owner_user_id WHERE u.email LIKE @demo;
DELETE r FROM reviews r JOIN users u ON u.id IN (r.reviewer_user_id, r.reviewee_user_id) WHERE u.email LIKE @demo;
DELETE a FROM applications a JOIN jobs j ON j.id = a.job_id JOIN shops s ON s.id = j.shop_id JOIN users u ON u.id = s.owner_user_id WHERE u.email LIKE @demo;
DELETE a FROM applications a JOIN users u ON u.id = a.seeker_user_id WHERE u.email LIKE @demo;
DELETE l FROM admin_logs l JOIN shops s ON l.target_type = 'shop' AND l.target_id = s.id JOIN users u ON u.id = s.owner_user_id WHERE u.email LIKE @demo;
DELETE l FROM admin_logs l JOIN users u ON l.target_type = 'user' AND l.target_id = u.id WHERE u.email LIKE @demo;
DELETE j FROM jobs j JOIN shops s ON s.id = j.shop_id JOIN users u ON u.id = s.owner_user_id WHERE u.email LIKE @demo;
DELETE s FROM shops s JOIN users u ON u.id = s.owner_user_id WHERE u.email LIKE @demo;
DELETE FROM users WHERE email LIKE @demo;
SQL

echo "demo: inserting shops, jobs, seekers, applications, reviews"
node database/demo/build-seed-demo.js | mysql_root

# Verification documents referenced by the demo shops (private folder, viewable by admins only)
docker exec sidejob-nodered sh -c '
  mkdir -p /data/uploads/private/verify
  for n in 01 02 03 04 05 06 07 08 09 10 11 12 13; do
    printf "%%PDF-1.4\n%% SideJob demo verification document for shop $n\n1 0 obj<<>>endobj\ntrailer<<>>\n%%%%EOF\n" \
      > /data/uploads/private/verify/000000000000000000000000000000$n.pdf
  done
  for n in $(seq -w 1 100); do
    printf "%%PDF-1.4\n%% SideJob demo verification document for store $n\n1 0 obj<<>>endobj\ntrailer<<>>\n%%%%EOF\n" \
      > /data/uploads/private/verify/b0000000000000000000000000000$n.pdf
  done'

echo "demo: done"
echo "  shops   : shop01..shop14@demo.sidejob.local  (01-10 verified, 11-12 pending, 13 rejected, 14 no document)"
echo "  stores  : store001..store100@demo.sidejob.local (one or more in every province, mostly verified with jobs)"
echo "  seekers : seeker01..seeker06@demo.sidejob.local"
echo "  password: Demo@1234"
