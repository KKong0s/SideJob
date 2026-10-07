#!/usr/bin/env bash
# Phase 2 API smoke tests: shop profile, image, verification document, admin verify / reject, audit log.
# Usage (from the repo root): bash tests/api/shop.sh
. "$(dirname "$0")/lib.sh"

new_seeker seeker; SEEKER_TOKEN=$TOKEN
new_shop shop; SHOP_TOKEN=$TOKEN; SHOP_USER=$USER_ID

echo "== shop profile"
req "profile: no token" GET /shop/profile 401
req "profile: seeker forbidden" GET /shop/profile 403 "$SEEKER_TOKEN"
req "profile: ok" GET /shop/profile 200 "$SHOP_TOKEN"
expect_eq "profile: status / province" "$(body 'j.shop.verifyStatus+"/"+j.shop.provinceName+"/"+j.shop.hasVerifyDoc')" "unsubmitted/เชียงใหม่/false"
req "update: district mismatch" PUT /shop/profile 400 "$SHOP_TOKEN" '{"shopName":"ร้านใหม่","address":"2 ถนน","provinceId":38,"districtId":1001,"phone":"053123456"}'
req "update: ok" PUT /shop/profile 200 "$SHOP_TOKEN" '{"shopName":"ร้านกาแฟใหม่","address":"2 ถนนห้วยแก้ว","provinceId":38,"districtId":5001,"phone":"053999999","description":"กาแฟดี"}'
expect_eq "update: saved" "$(body 'j.shop.name+"/"+j.shop.phone+"/"+j.shop.description')" "ร้านกาแฟใหม่/053999999/กาแฟดี"

echo "== shop image"
upload "image: svg disguised as png" /shop/profile/image 415 "$SHOP_TOKEN" "$TMP/evil.png"
upload "image: pdf not allowed" /shop/profile/image 415 "$SHOP_TOKEN" "$TMP/doc.pdf"
upload "image: png" /shop/profile/image 200 "$SHOP_TOKEN" "$TMP/a.png"
IMG=$(body j.imagePath)
check "image: public URL" "$(curl -s -o /dev/null -w '%{http_code}' "$UPLOADS/$IMG")" 200

echo "== verification document"
upload "doc: svg rejected" /shop/verification 415 "$SHOP_TOKEN" "$TMP/evil.png"
upload "doc: seeker forbidden" /shop/verification 403 "$SEEKER_TOKEN" "$TMP/doc.pdf"
upload "doc: pdf" /shop/verification 200 "$SHOP_TOKEN" "$TMP/doc.pdf"
expect_eq "doc: pending" "$(body j.verifyStatus)" "pending"
DOC=$(root_sql "SELECT verify_doc_file FROM shops WHERE id=$SHOP_ID")
check "doc: not under /uploads (private)" "$(curl -s -o /dev/null -w '%{http_code}' "$UPLOADS/verify/$DOC")" 404
check "doc: no path traversal to private" "$(curl -s -o /dev/null -w '%{http_code}' --path-as-is "$UPLOADS/../private/verify/$DOC")" 404
req "post job before verified -> profile shows pending" GET /shop/profile 200 "$SHOP_TOKEN"
expect_eq "profile: pending + hasDoc" "$(body 'j.shop.verifyStatus+"/"+j.shop.hasVerifyDoc')" "pending/true"

echo "== admin: list / detail / document"
req "admin shops: seeker forbidden" GET /admin/shops 403 "$SEEKER_TOKEN"
req "admin shops: pending list" GET "/admin/shops?status=pending&pageSize=50" 200 "$ADMIN_TOKEN"
expect_eq "admin shops: contains shop" "$(body "j.items.some(s=>s.id===$SHOP_ID)")" "true"
req "admin shops: bad status" GET "/admin/shops?status=nope" 400 "$ADMIN_TOKEN"
req "admin shops: search by email" GET "/admin/shops?status=all&q=test-shop-$RUN" 200 "$ADMIN_TOKEN"
expect_eq "admin shops: search result" "$(body 'j.items.length+"/"+j.hasNext')" "1/false"
req "admin shop detail" GET "/admin/shops/$SHOP_ID" 200 "$ADMIN_TOKEN"
expect_eq "admin shop detail: doc type / owner" "$(body 'j.shop.verifyDocType+"/"+j.shop.owner.email')" "pdf/test-shop-$RUN@example.com"
req "admin shop detail: not found" GET "/admin/shops/99999999" 404 "$ADMIN_TOKEN"
check "document: admin gets pdf" "$(curl -s -o "$TMP/dl" -w '%{http_code} %{content_type}' "$API/admin/shops/$SHOP_ID/document" -H "Authorization: Bearer $ADMIN_TOKEN")" "200 application/pdf"
expect_eq "document: same bytes" "$(cmp -s "$TMP/dl" "$TMP/doc.pdf" && echo same)" "same"
req "document: shop owner forbidden" GET "/admin/shops/$SHOP_ID/document" 403 "$SHOP_TOKEN"
req "document: no token" GET "/admin/shops/$SHOP_ID/document" 401

echo "== admin: reject / verify"
req "reject: reason required" POST "/admin/shops/$SHOP_ID/reject" 400 "$ADMIN_TOKEN" '{"reason":"  "}'
req "reject: ok" POST "/admin/shops/$SHOP_ID/reject" 200 "$ADMIN_TOKEN" '{"reason":"เอกสารไม่ชัด"}'
expect_eq "reject: log written" "$(root_sql "SELECT CONCAT(action,'/',reason) FROM admin_logs WHERE target_type='shop' AND target_id=$SHOP_ID")" "shop.reject/เอกสารไม่ชัด"
expect_eq "reject: shop notified" "$(root_sql "SELECT type FROM notifications WHERE user_id=$SHOP_USER")" "shop.rejected"
req "reject again: invalid state" POST "/admin/shops/$SHOP_ID/reject" 409 "$ADMIN_TOKEN" '{"reason":"x"}'
req "verify rejected shop: invalid state" POST "/admin/shops/$SHOP_ID/verify" 409 "$ADMIN_TOKEN"
req "shop sees reason" GET /shop/profile 200 "$SHOP_TOKEN"
expect_eq "shop: rejected + reason" "$(body 'j.shop.verifyStatus+"/"+j.shop.rejectReason')" "rejected/เอกสารไม่ชัด"
upload "doc: re-submit (png)" /shop/verification 200 "$SHOP_TOKEN" "$TMP/a.png"
check "doc: replaced file removed" "$(docker exec sidejob-nodered sh -c "test -f /data/uploads/private/verify/$DOC && echo kept || echo removed")" removed
req "verify: shop cannot call admin API" POST "/admin/shops/$SHOP_ID/verify" 403 "$SHOP_TOKEN"
req "verify: ok" POST "/admin/shops/$SHOP_ID/verify" 200 "$ADMIN_TOKEN"
expect_eq "verify: logs" "$(root_sql "SELECT GROUP_CONCAT(action ORDER BY id) FROM admin_logs WHERE target_type='shop' AND target_id=$SHOP_ID")" "shop.reject,shop.verify"
expect_eq "verify: notification link" "$(root_sql "SELECT link FROM notifications WHERE user_id=$SHOP_USER AND type='shop.verified'")" "/shop/profile"
req "session shows verified" GET /auth/me 200 "$SHOP_TOKEN"
expect_eq "session: verifyStatus" "$(body j.user.shop.verifyStatus)" "verified"
upload "doc: upload after verified" /shop/verification 409 "$SHOP_TOKEN" "$TMP/doc.pdf"
expect_eq "doc: code" "$(err_code)" "ALREADY_VERIFIED"
req "update after verified keeps status" PUT /shop/profile 200 "$SHOP_TOKEN" '{"shopName":"ร้านกาแฟใหม่ 2","address":"2 ถนนห้วยแก้ว","provinceId":38,"districtId":5001,"phone":"053999999"}'
expect_eq "update: still verified" "$(body j.shop.verifyStatus)" "verified"

echo "== audit log"
req "logs: shop forbidden" GET /admin/logs 403 "$SHOP_TOKEN"
req "logs: filter action" GET "/admin/logs?action=shop.reject&from=$(date +%Y-%m-%d)&to=$(date +%Y-%m-%d)" 200 "$ADMIN_TOKEN"
expect_eq "logs: filtered" "$(body "j.items.every(l=>l.action==='shop.reject') && j.items.some(l=>l.targetId===$SHOP_ID)")" "true"
req "logs: bad date" GET "/admin/logs?from=2026-13-01" 400 "$ADMIN_TOKEN"
req "logs: future range empty" GET "/admin/logs?from=2099-01-01" 200 "$ADMIN_TOKEN"
expect_eq "logs: empty" "$(body j.items.length)" "0"
req "logs: filter options" GET /admin/logs/filters 200 "$ADMIN_TOKEN"
expect_eq "logs: options" "$(body 'j.admins.some(a=>a.email==="admin@sidejob.local") && j.actions.includes("shop.verify")')" "true"
req "logs: no delete API" DELETE /admin/logs 404 "$ADMIN_TOKEN"
req "stats" GET /admin/stats 200 "$ADMIN_TOKEN"

echo "== cleanup"
docker exec sidejob-nodered sh -c "rm -f /data/uploads/public/$IMG /data/uploads/private/verify/$(root_sql "SELECT verify_doc_file FROM shops WHERE id=$SHOP_ID")"
finish
