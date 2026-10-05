#!/usr/bin/env bash
# Phase 1 API smoke tests: auth, onboarding, avatar upload, geo.
# Requires the docker stack running. Usage (from the repo root): bash tests/api/auth.sh
# Creates throwaway users (test-*@example.com) and deletes them at the end.
set -uo pipefail

cd "$(dirname "$0")/../.."
set -a; . ./.env; set +a

API="http://localhost:${NODE_RED_PORT:-1881}/api"
UPLOADS="http://localhost:${NODE_RED_PORT:-1881}/uploads"
RUN="$(date +%s)$RANDOM"
TMP="$(mktemp -d)"
PASS=0; FAIL=0

# json <file> <js expression using `j`>
json() { node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));const v=($2);process.stdout.write(v===undefined||v===null?'':String(v))" "$1"; }

# req <name> <method> <path> <expected status> [token] [json body]
req() {
  local name=$1 method=$2 path=$3 expect=$4 token=${5:-} body=${6:-}
  local args=(-s -o "$TMP/body" -w '%{http_code}' -X "$method" "$API$path")
  [[ -n $token ]] && args+=(-H "Authorization: Bearer $token")
  # Body goes through a UTF-8 file: curl on Windows re-encodes command-line arguments
  if [[ -n $body ]]; then
    printf '%s' "$body" > "$TMP/req.json"
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
    PASS=$((PASS + 1)); printf '  ok   %-60s %s\n' "$1" "$2"
  else
    FAIL=$((FAIL + 1)); printf '  FAIL %-60s got %s, want %s\n       %s\n' "$1" "$2" "$3" "$(head -c 300 "$TMP/body")"
  fi
}

expect_eq() { # <name> <actual> <expected>
  if [[ $2 == "$3" ]]; then PASS=$((PASS + 1)); printf '  ok   %-60s %s\n' "$1" "$2"
  else FAIL=$((FAIL + 1)); printf '  FAIL %-60s got "%s", want "%s"\n' "$1" "$2" "$3"; fi
}

err_code() { json "$TMP/body" 'j.error && j.error.code'; }

root_sql() { docker exec -i sidejob-mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" sidejob -N -e "$1" 2>/dev/null; }

# HS256 token signed with the real secret, for testing claim checks
sign() { node -e "
const c=require('crypto');const b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const h=b({alg:'HS256',typ:'JWT'}), p=b(JSON.parse(process.argv[1]));
process.stdout.write(h+'.'+p+'.'+c.createHmac('sha256',process.env.JWT_SECRET).update(h+'.'+p).digest('base64url'));" "$1"; }

# Minimal valid image files
printf '\x89PNG\r\n\x1a\n\0\0\0\rIHDR\0\0\0\1\0\0\0\1\x08\x06\0\0\0\x1f\x15\xc4\x89\0\0\0\rIDATx\x9cc\xf8\x0f\0\0\x01\x01\0\x05\x18\xd8N\0\0\0\0IEND\xaeB`\x82' > "$TMP/a.png"
printf '\xff\xd8\xff\xe0\0\x10JFIF\0\x01\x01\0\0\x01\0\x01\0\0\xff\xd9' > "$TMP/b.jpg"
printf '<svg xmlns="http://www.w3.org/2000/svg"/>' > "$TMP/evil.png"

SEEKER="test-seeker-$RUN@example.com"
SHOP="test-shop-$RUN@example.com"
PW="Passw0rd$RUN"

echo "== system / geo"
req "health" GET /health 200
req "geo" GET /geo 200
expect_eq "geo counts" "$(json "$TMP/body" '[j.regions.length,j.provinces.length,j.districts.length].join("/")')" "4/77/930"
expect_eq "geo thai text" "$(json "$TMP/body" 'j.provinces.find(p=>p.id===38).nameTh')" "เชียงใหม่"

echo "== register"
req "register: bad email" POST /auth/register 400 "" '{"email":"nope","password":"Passw0rd1"}'
expect_eq "error body format" "$(err_code)" "VALIDATION_ERROR"
req "register: weak password" POST /auth/register 400 "" "{\"email\":\"$SEEKER\",\"password\":\"password\"}"
req "register: seeker" POST /auth/register 201 "" "{\"email\":\"$SEEKER\",\"password\":\"$PW\"}"
SEEKER_TOKEN=$(json "$TMP/body" j.token)
expect_eq "register: onboarding step" "$(json "$TMP/body" j.user.onboardingStep)" "role"
expect_eq "register: no password hash in response" "$(json "$TMP/body" '"passwordHash" in j.user || "password_hash" in j.user')" "false"
req "register: duplicate (case-insensitive)" POST /auth/register 409 "" "{\"email\":\"${SEEKER^^}\",\"password\":\"$PW\"}"
expect_eq "duplicate code" "$(err_code)" "EMAIL_TAKEN"

echo "== login"
req "login: wrong password" POST /auth/login 401 "" "{\"email\":\"$SEEKER\",\"password\":\"Wrong1234\"}"
req "login: unknown email" POST /auth/login 401 "" '{"email":"nobody@example.com","password":"Wrong1234"}'
req "login: ok" POST /auth/login 200 "" "{\"email\":\"$SEEKER\",\"password\":\"$PW\"}"
SEEKER_TOKEN=$(json "$TMP/body" j.token)
req "login: admin" POST /auth/login 200 "" '{"email":"admin@sidejob.local","password":"Admin@1234"}'
ADMIN_TOKEN=$(json "$TMP/body" j.token)
expect_eq "login: admin role/step" "$(json "$TMP/body" 'j.user.role+"/"+j.user.onboardingStep')" "admin/done"

echo "== auth-check"
req "me: no token" GET /auth/me 401
req "me: garbage token" GET /auth/me 401 "garbage.token.here"
req "me: forged signature" GET /auth/me 401 "${SEEKER_TOKEN%?}x"
LINK_AS_ACCESS=$(sign "{\"typ\":\"google-link\",\"sub\":\"1\",\"exp\":$(( $(date +%s) + 600 ))}")
req "me: link token used as access token" GET /auth/me 401 "$LINK_AS_ACCESS"
EXPIRED=$(sign "{\"typ\":\"access\",\"sub\":\"1\",\"exp\":$(( $(date +%s) - 10 ))}")
req "me: expired token" GET /auth/me 401 "$EXPIRED"
req "me: ok" GET /auth/me 200 "$SEEKER_TOKEN"

echo "== onboarding (seeker)"
req "profile before role -> forbidden" PUT /auth/onboarding/profile 403 "$SEEKER_TOKEN" '{}'
req "role: invalid" POST /auth/onboarding/role 400 "$SEEKER_TOKEN" '{"role":"admin"}'
req "role: seeker" POST /auth/onboarding/role 200 "$SEEKER_TOKEN" '{"role":"seeker"}'
expect_eq "role: step" "$(json "$TMP/body" j.user.onboardingStep)" "profile"
req "role: change again" POST /auth/onboarding/role 409 "$SEEKER_TOKEN" '{"role":"shop"}'
req "terms before profile" POST /auth/onboarding/accept-terms 409 "$SEEKER_TOKEN" '{"acceptTerms":true,"acceptPdpa":true}'
upload "avatar before profile" /seeker/profile/avatar 409 "$SEEKER_TOKEN" "$TMP/a.png"
UNDERAGE=$(( $(date +%Y) - 17 ))-01-01
req "profile: under 18" PUT /auth/onboarding/profile 400 "$SEEKER_TOKEN" "{\"fullName\":\"ทดสอบ\",\"birthDate\":\"$UNDERAGE\",\"phone\":\"0812345678\",\"areas\":[{\"provinceId\":1,\"districtId\":null}]}"
expect_eq "under 18 code" "$(err_code)" "UNDERAGE"
req "profile: district not in province" PUT /auth/onboarding/profile 400 "$SEEKER_TOKEN" '{"fullName":"ทดสอบ","birthDate":"2000-01-01","phone":"0812345678","areas":[{"provinceId":38,"districtId":1001}]}'
req "profile: bad phone" PUT /auth/onboarding/profile 400 "$SEEKER_TOKEN" '{"fullName":"ทดสอบ","birthDate":"2000-01-01","phone":"12345","areas":[{"provinceId":1,"districtId":null}]}'
req "profile: no areas" PUT /auth/onboarding/profile 400 "$SEEKER_TOKEN" '{"fullName":"ทดสอบ","birthDate":"2000-01-01","phone":"0812345678","areas":[]}'
req "profile: ok" PUT /auth/onboarding/profile 200 "$SEEKER_TOKEN" '{"fullName":"สมชาย ใจดี","birthDate":"2000-02-29","phone":"081-234-5678","lineId":"somchai.j","areas":[{"provinceId":1,"districtId":1001},{"provinceId":1,"districtId":1002},{"provinceId":38,"districtId":null},{"provinceId":38,"districtId":5001}]}'
expect_eq "profile: step / name" "$(json "$TMP/body" 'j.user.onboardingStep+"/"+j.user.displayName')" "terms/สมชาย ใจดี"
SEEKER_ID=$(json "$TMP/body" j.user.id)
expect_eq "profile: areas normalised" "$(root_sql "SELECT GROUP_CONCAT(CONCAT(province_id,':',IFNULL(district_id,'all')) ORDER BY province_id, district_id) FROM seeker_areas WHERE user_id=$SEEKER_ID")" "1:1001,1:1002,38:all"
req "profile: update replaces areas" PUT /auth/onboarding/profile 200 "$SEEKER_TOKEN" '{"fullName":"สมชาย ใจดี","birthDate":"2000-02-29","phone":"0812345678","areas":[{"provinceId":38,"districtId":5001}]}'
expect_eq "profile: areas after update" "$(root_sql "SELECT GROUP_CONCAT(CONCAT(province_id,':',IFNULL(district_id,'all'))) FROM seeker_areas WHERE user_id=$SEEKER_ID")" "38:5001"

echo "== avatar upload"
upload "avatar: svg renamed .png rejected" /seeker/profile/avatar 415 "$SEEKER_TOKEN" "$TMP/evil.png"
head -c $((5 * 1024 * 1024 + 10)) /dev/zero > "$TMP/big.jpg"
upload "avatar: over 5 MB" /seeker/profile/avatar 413 "$SEEKER_TOKEN" "$TMP/big.jpg"
upload "avatar: png" /seeker/profile/avatar 200 "$SEEKER_TOKEN" "$TMP/a.png"
AV1=$(json "$TMP/body" j.avatarPath)
check "avatar: public URL" "$(curl -s -o /dev/null -w '%{http_code}' "$UPLOADS/$AV1")" 200
upload "avatar: replace with jpg" /seeker/profile/avatar 200 "$SEEKER_TOKEN" "$TMP/b.jpg"
AV2=$(json "$TMP/body" j.avatarPath)
check "avatar: old file removed" "$(curl -s -o /dev/null -w '%{http_code}' "$UPLOADS/$AV1")" 404
check "avatar: new file served" "$(curl -s -o /dev/null -w '%{http_code}' "$UPLOADS/$AV2")" 200

echo "== accept terms"
req "terms: missing consent" POST /auth/onboarding/accept-terms 400 "$SEEKER_TOKEN" '{"acceptTerms":true}'
req "terms: ok" POST /auth/onboarding/accept-terms 200 "$SEEKER_TOKEN" '{"acceptTerms":true,"acceptPdpa":true}'
expect_eq "terms: completed" "$(json "$TMP/body" 'j.user.onboardingStep+"/"+j.user.profileCompleted+"/"+j.user.avatarPath')" "done/true/$AV2"

echo "== onboarding (shop)"
req "register: shop" POST /auth/register 201 "" "{\"email\":\"$SHOP\",\"password\":\"$PW\"}"
SHOP_TOKEN=$(json "$TMP/body" j.token)
req "role: shop" POST /auth/onboarding/role 200 "$SHOP_TOKEN" '{"role":"shop"}'
req "shop profile: district mismatch" PUT /auth/onboarding/profile 400 "$SHOP_TOKEN" '{"shopName":"ร้านทดสอบ","address":"1 ถนนทดสอบ","provinceId":38,"districtId":1001,"phone":"021234567"}'
req "shop profile: ok" PUT /auth/onboarding/profile 200 "$SHOP_TOKEN" '{"shopName":"ร้านกาแฟทดสอบ","address":"1 ถนนนิมมาน","provinceId":38,"districtId":5001,"phone":"053123456","lineId":"@testcafe"}'
expect_eq "shop profile: verify status" "$(json "$TMP/body" 'j.user.shop.verifyStatus+"/"+j.user.displayName')" "unsubmitted/ร้านกาแฟทดสอบ"
req "shop terms: ok" POST /auth/onboarding/accept-terms 200 "$SHOP_TOKEN" '{"acceptTerms":true,"acceptPdpa":true}'
upload "shop cannot use seeker avatar API" /seeker/profile/avatar 403 "$SHOP_TOKEN" "$TMP/a.png"
req "admin cannot run onboarding profile" PUT /auth/onboarding/profile 403 "$ADMIN_TOKEN" '{}'

echo "== google"
if [[ -z ${GOOGLE_CLIENT_ID:-} ]]; then
  req "google: not configured" POST /auth/google 503 "" '{"idToken":"x"}'
else
  req "google: invalid id token" POST /auth/google 401 "" '{"idToken":"not-a-real-token"}'
fi
req "google link: bad link token" POST /auth/google/link 401 "" '{"linkToken":"x","password":"y"}'
FORGED_LINK=$(sign "{\"typ\":\"access\",\"gid\":\"123\",\"sub\":\"$SEEKER_ID\",\"exp\":$(( $(date +%s) + 600 ))}")
req "google link: access token used as link token" POST /auth/google/link 401 "" "{\"linkToken\":\"$FORGED_LINK\",\"password\":\"$PW\"}"
GOOD_LINK=$(sign "{\"typ\":\"google-link\",\"gid\":\"test-gid-$RUN\",\"sub\":\"$SEEKER_ID\",\"exp\":$(( $(date +%s) + 600 ))}")
req "google link: wrong password" POST /auth/google/link 401 "" "{\"linkToken\":\"$GOOD_LINK\",\"password\":\"Wrong1234\"}"
req "google link: ok" POST /auth/google/link 200 "" "{\"linkToken\":\"$GOOD_LINK\",\"password\":\"$PW\"}"
expect_eq "google link: hasGoogle" "$(json "$TMP/body" j.user.hasGoogle)" "true"
req "google link: already linked" POST /auth/google/link 409 "" "{\"linkToken\":\"$GOOD_LINK\",\"password\":\"$PW\"}"

echo "== suspended account"
root_sql "UPDATE users SET status='suspended' WHERE id=$SEEKER_ID"
req "suspended: existing token rejected" GET /auth/me 403 "$SEEKER_TOKEN"
expect_eq "suspended code" "$(err_code)" "ACCOUNT_SUSPENDED"
req "suspended: login rejected" POST /auth/login 403 "" "{\"email\":\"$SEEKER\",\"password\":\"$PW\"}"

echo "== cleanup"
docker exec sidejob-nodered sh -c "rm -f /data/uploads/public/$AV2"
root_sql "DELETE s FROM shops s JOIN users u ON u.id = s.owner_user_id WHERE u.email LIKE 'test-%@example.com';
          DELETE FROM users WHERE email LIKE 'test-%@example.com';"
rm -rf "$TMP"

echo
echo "passed: $PASS  failed: $FAIL"
[[ $FAIL -eq 0 ]]
