#!/usr/bin/env bash
# Shared helpers for the API smoke tests. Source it from a test script:  . "$(dirname "$0")/lib.sh"
# Requires the docker stack running. Test users are test-*@example.com and are removed by cleanup_test_data.
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."
set -a; . ./.env; set +a

API="http://localhost:${NODE_RED_PORT:-1881}/api"
UPLOADS="http://localhost:${NODE_RED_PORT:-1881}/uploads"
RUN="$(date +%s)$RANDOM"
TMP="$(mktemp -d)"
PW="Passw0rd$RUN"
PASS=0; FAIL=0

# json <file> <js expression using `j`>
json() { node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));const v=($2);process.stdout.write(v===undefined||v===null?'':String(v))" "$1"; }
body() { json "$TMP/body" "$1"; }

# req <name> <method> <path> <expected status> [token] [json body]
req() {
  local name=$1 method=$2 path=$3 expect=$4 token=${5:-} data=${6:-}
  local args=(-s -o "$TMP/body" -w '%{http_code}' -X "$method" "$API$path")
  [[ -n $token ]] && args+=(-H "Authorization: Bearer $token")
  # Body goes through a UTF-8 file: curl on Windows re-encodes command-line arguments
  if [[ -n $data ]]; then
    printf '%s' "$data" > "$TMP/req.json"
    args+=(-H 'Content-Type: application/json' --data-binary "@$TMP/req.json")
  fi
  local status; status=$(curl "${args[@]}")
  check "$name" "$status" "$expect"
}

# upload <name> <path> <expected status> <token> <file>
upload() {
  local status
  status=$(curl -s -o "$TMP/body" -w '%{http_code}' -X POST "$API$2" -H "Authorization: Bearer $4" -F "file=@$5")
  check "$1" "$status" "$3"
}

check() {
  if [[ $2 == "$3" ]]; then
    PASS=$((PASS + 1)); printf '  ok   %-64s %s\n' "$1" "$2"
  else
    FAIL=$((FAIL + 1)); printf '  FAIL %-64s got %s, want %s\n       %s\n' "$1" "$2" "$3" "$(head -c 300 "$TMP/body")"
  fi
}

expect_eq() { # <name> <actual> <expected>
  if [[ $2 == "$3" ]]; then PASS=$((PASS + 1)); printf '  ok   %-64s %s\n' "$1" "$2"
  else FAIL=$((FAIL + 1)); printf '  FAIL %-64s got "%s", want "%s"\n' "$1" "$2" "$3"; fi
}

err_code() { body 'j.error && j.error.code'; }

root_sql() { docker exec -i sidejob-mysql mysql --default-character-set=utf8mb4 -uroot -p"$MYSQL_ROOT_PASSWORD" sidejob -N -e "$1" 2>/dev/null; }

# Minimal valid files
printf '\x89PNG\r\n\x1a\n\0\0\0\rIHDR\0\0\0\1\0\0\0\1\x08\x06\0\0\0\x1f\x15\xc4\x89\0\0\0\rIDATx\x9cc\xf8\x0f\0\0\x01\x01\0\x05\x18\xd8N\0\0\0\0IEND\xaeB`\x82' > "$TMP/a.png"
printf '%%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%%%EOF\n' > "$TMP/doc.pdf"
printf '<svg xmlns="http://www.w3.org/2000/svg"/>' > "$TMP/evil.png"

login() { # <email> <password> -> prints token
  curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    --data-binary "{\"email\":\"$1\",\"password\":\"$2\"}" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(JSON.parse(s).token||''))"
}

# Silent JSON call used while setting up fixtures: api <method> <path> <token> [json]
api() {
  printf '%s' "${4:-}" > "$TMP/fix.json"
  curl -s -X "$1" "$API$2" -H "Authorization: Bearer $3" -H 'Content-Type: application/json' --data-binary "@$TMP/fix.json" > "$TMP/fix.out"
}

# new_seeker <label> [birthDate] -> sets TOKEN, USER_ID; email test-<label>-$RUN@example.com
new_seeker() {
  local email="test-$1-$RUN@example.com"
  api POST /auth/register "" "{\"email\":\"$email\",\"password\":\"$PW\"}"
  TOKEN=$(json "$TMP/fix.out" j.token); USER_ID=$(json "$TMP/fix.out" j.user.id)
  api POST /auth/onboarding/role "$TOKEN" '{"role":"seeker"}'
  api PUT /auth/onboarding/profile "$TOKEN" "{\"fullName\":\"ผู้หางาน $1\",\"birthDate\":\"${2:-2000-01-15}\",\"phone\":\"0812345678\",\"lineId\":\"seeker.$1\",\"areas\":[{\"provinceId\":38,\"districtId\":null}]}"
  api POST /auth/onboarding/accept-terms "$TOKEN" '{"acceptTerms":true,"acceptPdpa":true}'
}

# new_shop <label> -> sets TOKEN, USER_ID, SHOP_ID (verify status: unsubmitted)
new_shop() {
  local email="test-$1-$RUN@example.com"
  api POST /auth/register "" "{\"email\":\"$email\",\"password\":\"$PW\"}"
  TOKEN=$(json "$TMP/fix.out" j.token); USER_ID=$(json "$TMP/fix.out" j.user.id)
  api POST /auth/onboarding/role "$TOKEN" '{"role":"shop"}'
  api PUT /auth/onboarding/profile "$TOKEN" "{\"shopName\":\"ร้านทดสอบ $1\",\"address\":\"1 ถนนนิมมาน\",\"provinceId\":38,\"districtId\":5001,\"phone\":\"053123456\",\"lineId\":\"@shop$1\"}"
  SHOP_ID=$(json "$TMP/fix.out" j.user.shop.id)
  api POST /auth/onboarding/accept-terms "$TOKEN" '{"acceptTerms":true,"acceptPdpa":true}'
}

# Marks a shop verified directly in the database (fixture shortcut)
verify_shop_db() { root_sql "UPDATE shops SET verify_status='verified', verified_at=NOW() WHERE id=$1"; }

ADMIN_TOKEN=$(login admin@sidejob.local 'Admin@1234')

cleanup_test_data() {
  root_sql "
    SET @u := (SELECT GROUP_CONCAT(id) FROM users WHERE email LIKE 'test-%@example.com');
    DELETE r FROM reviews r JOIN users u ON u.id IN (r.reviewer_user_id, r.reviewee_user_id) WHERE u.email LIKE 'test-%@example.com';
    DELETE a FROM applications a JOIN jobs j ON j.id = a.job_id JOIN shops s ON s.id = j.shop_id JOIN users u ON u.id = s.owner_user_id WHERE u.email LIKE 'test-%@example.com';
    DELETE a FROM applications a JOIN users u ON u.id = a.seeker_user_id WHERE u.email LIKE 'test-%@example.com';
    DELETE l FROM admin_logs l JOIN shops s ON l.target_type = 'shop' AND l.target_id = s.id JOIN users u ON u.id = s.owner_user_id WHERE u.email LIKE 'test-%@example.com';
    DELETE j FROM jobs j JOIN shops s ON s.id = j.shop_id JOIN users u ON u.id = s.owner_user_id WHERE u.email LIKE 'test-%@example.com';
    DELETE s FROM shops s JOIN users u ON u.id = s.owner_user_id WHERE u.email LIKE 'test-%@example.com';
    DELETE FROM reports WHERE reporter_user_id IN (SELECT id FROM users WHERE email LIKE 'test-%@example.com');
    DELETE FROM users WHERE email LIKE 'test-%@example.com';"
  rm -rf "$TMP"
}

finish() {
  cleanup_test_data
  echo
  echo "passed: $PASS  failed: $FAIL"
  [[ $FAIL -eq 0 ]]
}
