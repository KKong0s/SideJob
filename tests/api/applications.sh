#!/usr/bin/env bash
# Phase 5 API smoke tests: apply / cancel / accept / reject, contact details only after acceptance, ownership.
# Usage (from the repo root): bash tests/api/applications.sh
. "$(dirname "$0")/lib.sh"

new_seeker seeker; SEEKER_TOKEN=$TOKEN; SEEKER_ID=$USER_ID
new_seeker seeker2; SEEKER2_TOKEN=$TOKEN; SEEKER2_ID=$USER_ID
new_shop shop; SHOP_TOKEN=$TOKEN; SHOP_USER=$USER_ID; MY_SHOP=$SHOP_ID
new_shop other; OTHER_TOKEN=$TOKEN; OTHER_SHOP=$SHOP_ID
verify_shop_db "$MY_SHOP"; verify_shop_db "$OTHER_SHOP"

mk() { # <token> [extra json] -> prints job id
  api POST /shop/jobs "$1" "{\"title\":\"งานทดสอบใบสมัคร\",\"description\":\"รายละเอียด\",\"categoryId\":1,\"provinceId\":38,\"districtId\":5001,\"wage\":60,\"wageUnit\":\"hour\",\"scheduleType\":\"weekly\",\"workDays\":[\"sat\"],\"startTime\":\"09:00\",\"endTime\":\"17:00\"${2:+,$2}}"
  json "$TMP/fix.out" j.job.id
}
JOB=$(mk "$SHOP_TOKEN")
OLD=$(mk "$SHOP_TOKEN" '"minAge":30')
CLOSED=$(mk "$SHOP_TOKEN"); api POST "/shop/jobs/$CLOSED/close" "$SHOP_TOKEN"
HIDDEN=$(mk "$SHOP_TOKEN"); root_sql "UPDATE jobs SET status='hidden' WHERE id=$HIDDEN"

echo "== apply"
req "apply: no token" POST "/seeker/jobs/$JOB/apply" 401
req "apply: shop forbidden" POST "/seeker/jobs/$JOB/apply" 403 "$SHOP_TOKEN"
req "apply: unknown job" POST "/seeker/jobs/99999999/apply" 404 "$SEEKER_TOKEN"
req "apply: hidden job" POST "/seeker/jobs/$HIDDEN/apply" 404 "$SEEKER_TOKEN"
req "apply: closed job" POST "/seeker/jobs/$CLOSED/apply" 409 "$SEEKER_TOKEN"
expect_eq "apply: closed code" "$(err_code)" "JOB_CLOSED"
req "apply: under min age (30)" POST "/seeker/jobs/$OLD/apply" 403 "$SEEKER_TOKEN"
expect_eq "apply: age code" "$(err_code)" "AGE_REQUIREMENT"
req "apply: ok" POST "/seeker/jobs/$JOB/apply" 201 "$SEEKER_TOKEN"
APP=$(body j.application.id)
expect_eq "apply: pending" "$(body j.application.status)" "pending"
req "apply: duplicate" POST "/seeker/jobs/$JOB/apply" 409 "$SEEKER_TOKEN"
expect_eq "apply: duplicate code" "$(err_code)" "ALREADY_APPLIED"
expect_eq "apply: shop notified with link" "$(root_sql "SELECT link FROM notifications WHERE user_id=$SHOP_USER AND type='application.new'")" "/shop/applicants/$APP"
req "status: shows application" GET "/seeker/jobs/$JOB/status" 200 "$SEEKER_TOKEN"
expect_eq "status: application" "$(body 'j.application.id+"/"+j.application.status')" "$APP/pending"

echo "== no contact details before acceptance"
req "seeker list" GET /seeker/applications 200 "$SEEKER_TOKEN"
expect_eq "seeker list: one, contact hidden" "$(body 'j.items.length+"/"+j.items[0].contact+"/"+j.items[0].job.shop.name')" "1/null/ร้านทดสอบ shop"
expect_eq "seeker list: no shop phone anywhere" "$(body 'JSON.stringify(j).includes("053123456")')" "false"
req "shop list" GET "/shop/applications?jobId=$JOB" 200 "$SHOP_TOKEN"
expect_eq "shop list: applicant, contact hidden" "$(body 'j.items.length+"/"+j.items[0].seeker.fullName+"/"+j.items[0].seeker.age+"/"+j.items[0].contact')" "1/ผู้หางาน seeker/26/null"
expect_eq "shop list: no seeker phone / LINE anywhere" "$(body 'JSON.stringify(j).includes("0812345678") || JSON.stringify(j).includes("seeker.seeker")')" "false"
req "shop detail: hidden contact" GET "/shop/applications/$APP" 200 "$SHOP_TOKEN"
expect_eq "shop detail: contact null" "$(body j.application.contact)" ""

echo "== ownership"
req "other shop: list is empty" GET /shop/applications 200 "$OTHER_TOKEN"
expect_eq "other shop: none" "$(body j.items.length)" "0"
req "other shop: detail 404" GET "/shop/applications/$APP" 404 "$OTHER_TOKEN"
req "other shop: accept 404" POST "/shop/applications/$APP/accept" 404 "$OTHER_TOKEN"
req "other seeker: detail 404" GET "/seeker/applications/$APP" 404 "$SEEKER2_TOKEN"
req "other seeker: cancel 404" POST "/seeker/applications/$APP/cancel" 404 "$SEEKER2_TOKEN"
req "seeker cannot accept" POST "/shop/applications/$APP/accept" 403 "$SEEKER_TOKEN"

echo "== accept -> contact details for both sides"
req "accept: ok" POST "/shop/applications/$APP/accept" 200 "$SHOP_TOKEN"
expect_eq "accept: seeker notified" "$(root_sql "SELECT link FROM notifications WHERE user_id=$SEEKER_ID AND type='application.accepted'")" "/seeker/applications/$APP"
req "accept: again" POST "/shop/applications/$APP/accept" 409 "$SHOP_TOKEN"
req "reject accepted: invalid" POST "/shop/applications/$APP/reject" 409 "$SHOP_TOKEN"
req "seeker detail: shop contact" GET "/seeker/applications/$APP" 200 "$SEEKER_TOKEN"
expect_eq "seeker detail: shop phone + LINE" "$(body 'j.application.status+"/"+j.application.contact.phone+"/"+j.application.contact.lineId+"/"+j.application.job.description')" "accepted/053123456/@shopshop/รายละเอียด"
req "shop detail: seeker contact" GET "/shop/applications/$APP" 200 "$SHOP_TOKEN"
expect_eq "shop detail: seeker phone + LINE" "$(body 'j.application.contact.phone+"/"+j.application.contact.lineId')" "0812345678/seeker.seeker"
req "other seeker still sees nothing" GET /seeker/applications 200 "$SEEKER2_TOKEN"
expect_eq "other seeker: empty" "$(body j.items.length)" "0"

echo "== reject"
req "seeker2 apply" POST "/seeker/jobs/$JOB/apply" 201 "$SEEKER2_TOKEN"
APP2=$(body j.application.id)
req "reject: ok" POST "/shop/applications/$APP2/reject" 200 "$SHOP_TOKEN"
expect_eq "reject: seeker2 notified" "$(root_sql "SELECT type FROM notifications WHERE user_id=$SEEKER2_ID")" "application.rejected"
req "rejected: no contact" GET "/seeker/applications/$APP2" 200 "$SEEKER2_TOKEN"
expect_eq "rejected: contact null" "$(body 'j.application.status+"/"+j.application.contact')" "rejected/null"
req "rejected: cannot re-apply" POST "/seeker/jobs/$JOB/apply" 409 "$SEEKER2_TOKEN"
req "rejected: cannot cancel" POST "/seeker/applications/$APP2/cancel" 409 "$SEEKER2_TOKEN"

echo "== filters / dashboard"
req "seeker filter: accepted" GET "/seeker/applications?status=pending,accepted" 200 "$SEEKER_TOKEN"
expect_eq "seeker filter: 1" "$(body j.items.length)" "1"
req "seeker filter: rejected only" GET "/seeker/applications?status=rejected" 200 "$SEEKER_TOKEN"
expect_eq "seeker filter: 0" "$(body j.items.length)" "0"
req "bad status" GET "/seeker/applications?status=nope" 400 "$SEEKER_TOKEN"
req "shop filter: pending" GET "/shop/applications?status=pending" 200 "$SHOP_TOKEN"
expect_eq "shop filter: none pending" "$(body j.items.length)" "0"
req "shop dashboard" GET /shop/dashboard 200 "$SHOP_TOKEN"
expect_eq "dashboard: counts" "$(body 'j.verifyStatus+"/"+j.openJobs+"/"+j.pendingApplicants+"/"+j.acceptedApplicants')" "verified/2/0/1"

echo "== cancel"
req "cancel accepted: ok" POST "/seeker/applications/$APP/cancel" 200 "$SEEKER_TOKEN"
expect_eq "cancel: shop notified" "$(root_sql "SELECT COUNT(*) FROM notifications WHERE user_id=$SHOP_USER AND type='application.cancelled'")" "1"
req "cancelled: contact hidden again" GET "/seeker/applications/$APP" 200 "$SEEKER_TOKEN"
expect_eq "cancelled: contact null" "$(body 'j.application.status+"/"+j.application.contact')" "cancelled/null"
req "cancelled: hidden from shop list by default" GET "/shop/applications?jobId=$JOB" 200 "$SHOP_TOKEN"
expect_eq "shop list: only rejected one left" "$(body 'j.items.map(i=>i.status).join(",")')" "rejected"
req "cancel again: invalid" POST "/seeker/applications/$APP/cancel" 409 "$SEEKER_TOKEN"
req "re-apply after cancel" POST "/seeker/jobs/$JOB/apply" 201 "$SEEKER_TOKEN"
expect_eq "re-apply: same application id" "$(body j.application.id)" "$APP"
req "cancel pending: ok" POST "/seeker/applications/$APP/cancel" 200 "$SEEKER_TOKEN"
expect_eq "cancel pending: shop not notified again" "$(root_sql "SELECT COUNT(*) FROM notifications WHERE user_id=$SHOP_USER AND type='application.cancelled'")" "1"

echo "== cleanup"
finish
