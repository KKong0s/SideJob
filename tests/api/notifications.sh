#!/usr/bin/env bash
# Phase 6 API smoke tests: notification list, unread count, mark read, read all, ownership.
# Usage (from the repo root): bash tests/api/notifications.sh
. "$(dirname "$0")/lib.sh"

new_seeker seeker; SEEKER_TOKEN=$TOKEN; SEEKER_ID=$USER_ID
new_shop shop; SHOP_TOKEN=$TOKEN; SHOP_USER=$USER_ID; MY_SHOP=$SHOP_ID
verify_shop_db "$MY_SHOP"
api POST /shop/jobs "$SHOP_TOKEN" '{"title":"งานแจ้งเตือน","description":"x","categoryId":1,"provinceId":38,"districtId":5001,"wage":60,"wageUnit":"hour","scheduleType":"weekly","workDays":["sat"],"startTime":"09:00","endTime":"17:00"}'
JOB=$(json "$TMP/fix.out" j.job.id)

echo "== events create notifications"
req "count: no token" GET /notifications/unread-count 401
req "count: shop starts at 0" GET /notifications/unread-count 200 "$SHOP_TOKEN"
expect_eq "count: 0" "$(body j.unread)" "0"
api POST "/seeker/jobs/$JOB/apply" "$SEEKER_TOKEN"; APP=$(json "$TMP/fix.out" j.application.id)
req "count: shop got new applicant" GET /notifications/unread-count 200 "$SHOP_TOKEN"
expect_eq "count: 1" "$(body j.unread)" "1"
api POST "/shop/applications/$APP/accept" "$SHOP_TOKEN"
req "list: seeker" GET /notifications 200 "$SEEKER_TOKEN"
expect_eq "list: accepted notification + link" "$(body 'j.items.length+"/"+j.items[0].type+"/"+j.items[0].link+"/"+j.items[0].isRead')" "1/application.accepted//seeker/applications/$APP/false"
N=$(body j.items[0].id)

echo "== read / ownership"
req "read: other user -> 404" POST "/notifications/$N/read" 404 "$SHOP_TOKEN"
req "read: own" POST "/notifications/$N/read" 200 "$SEEKER_TOKEN"
req "count: seeker 0" GET /notifications/unread-count 200 "$SEEKER_TOKEN"
expect_eq "count after read" "$(body j.unread)" "0"
req "read: unknown" POST "/notifications/999999999/read" 404 "$SEEKER_TOKEN"
root_sql "INSERT INTO notifications (user_id, type, message) VALUES ($SHOP_USER,'test','a'),($SHOP_USER,'test','b'),($SHOP_USER,'test','c')"
req "list: unread only" GET "/notifications?unread=1&pageSize=2" 200 "$SHOP_TOKEN"
expect_eq "list: paged unread" "$(body 'j.items.length+"/"+j.hasNext')" "2/true"
req "read-all" POST /notifications/read-all 200 "$SHOP_TOKEN"
expect_eq "read-all: updated 4" "$(body j.updated)" "4"
req "count: shop 0" GET /notifications/unread-count 200 "$SHOP_TOKEN"
expect_eq "count after read-all" "$(body j.unread)" "0"
req "seeker notifications untouched by shop read-all" GET /notifications 200 "$SEEKER_TOKEN"
expect_eq "seeker still 1 item" "$(body j.items.length)" "1"
req "admin can call (no notifications)" GET /notifications/unread-count 200 "$ADMIN_TOKEN"

echo "== cleanup"
finish
