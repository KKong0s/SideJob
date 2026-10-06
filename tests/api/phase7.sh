#!/usr/bin/env bash
# Phase 7 API smoke tests: work completed, reviews (14-day window, once per side, ratings), reports,
# admin users / jobs / reports / reviews / categories with audit log.
# Usage (from the repo root): bash tests/api/phase7.sh
. "$(dirname "$0")/lib.sh"

new_seeker seeker; SEEKER_TOKEN=$TOKEN; SEEKER_ID=$USER_ID
new_seeker seeker2; SEEKER2_TOKEN=$TOKEN; SEEKER2_ID=$USER_ID
new_shop shop; SHOP_TOKEN=$TOKEN; SHOP_USER=$USER_ID; MY_SHOP=$SHOP_ID
new_shop other; OTHER_TOKEN=$TOKEN
verify_shop_db "$MY_SHOP"

mk() {
  api POST /shop/jobs "$SHOP_TOKEN" "{\"title\":\"งานเฟส7 $1\",\"description\":\"x\",\"categoryId\":1,\"provinceId\":38,\"districtId\":5001,\"wage\":60,\"wageUnit\":\"hour\",\"scheduleType\":\"weekly\",\"workDays\":[\"sat\"],\"startTime\":\"09:00\",\"endTime\":\"17:00\"}"
  json "$TMP/fix.out" j.job.id
}
JOB=$(mk a); JOB2=$(mk b)
api POST "/seeker/jobs/$JOB/apply" "$SEEKER_TOKEN"; APP=$(json "$TMP/fix.out" j.application.id)
api POST "/seeker/jobs/$JOB/apply" "$SEEKER2_TOKEN"; APP2=$(json "$TMP/fix.out" j.application.id)

echo "== work completed"
req "complete: pending not allowed" POST "/shop/applications/$APP/complete" 409 "$SHOP_TOKEN"
api POST "/shop/applications/$APP/accept" "$SHOP_TOKEN"
req "review before completed" POST "/seeker/applications/$APP/review" 409 "$SEEKER_TOKEN" '{"rating":5}'
expect_eq "review code" "$(err_code)" "REVIEW_NOT_ALLOWED"
req "complete: other shop 404" POST "/shop/applications/$APP/complete" 404 "$OTHER_TOKEN"
req "complete: ok" POST "/shop/applications/$APP/complete" 200 "$SHOP_TOKEN"
expect_eq "complete: seeker notified" "$(root_sql "SELECT type FROM notifications WHERE user_id=$SEEKER_ID AND type='application.completed'")" "application.completed"
req "complete: again" POST "/shop/applications/$APP/complete" 409 "$SHOP_TOKEN"
req "completed: contact still open" GET "/seeker/applications/$APP" 200 "$SEEKER_TOKEN"
expect_eq "completed: contact + review window" "$(body 'j.application.contact.phone+"/"+j.application.reviewOpen+"/"+j.application.myReview')" "053123456/true/null"

echo "== reviews"
req "review: bad rating" POST "/seeker/applications/$APP/review" 400 "$SEEKER_TOKEN" '{"rating":6}'
req "review: other seeker 404" POST "/seeker/applications/$APP/review" 404 "$SEEKER2_TOKEN" '{"rating":5}'
req "seeker reviews shop" POST "/seeker/applications/$APP/review" 201 "$SEEKER_TOKEN" '{"rating":4,"comment":"ร้านใจดี"}'
req "seeker reviews twice" POST "/seeker/applications/$APP/review" 409 "$SEEKER_TOKEN" '{"rating":5}'
expect_eq "twice code" "$(err_code)" "ALREADY_REVIEWED"
expect_eq "shop notified of review" "$(root_sql "SELECT link FROM notifications WHERE user_id=$SHOP_USER AND type='review.received'")" "/shop/profile"
req "shop reviews seeker" POST "/shop/applications/$APP/review" 201 "$SHOP_TOKEN" '{"rating":5,"comment":"ขยันมาก"}'
req "application shows both reviews" GET "/seeker/applications/$APP" 200 "$SEEKER_TOKEN"
expect_eq "my / their review" "$(body 'j.application.myReview.rating+"/"+j.application.theirReview.comment')" "4/ขยันมาก"
req "public shop rating on job detail" GET "/jobs/$JOB" 200
expect_eq "shop rating" "$(body 'j.job.shop.rating.average+"/"+j.job.shop.rating.count')" "4/1"
req "shop profile rating" GET /shop/profile 200 "$SHOP_TOKEN"
expect_eq "shop own rating" "$(body 'j.shop.rating.average')" "4"
req "seeker profile rating" GET /seeker/profile 200 "$SEEKER_TOKEN"
expect_eq "seeker own rating" "$(body 'j.profile.rating.average+"/"+j.profile.rating.count')" "5/1"
req "applicant list shows seeker rating" GET "/shop/applications?jobId=$JOB" 200 "$SHOP_TOKEN"
expect_eq "applicant rating" "$(body "j.items.find(i=>i.id===$APP).seeker.rating.average")" "5"
req "public shop reviews" GET "/jobs/shops/$MY_SHOP/reviews" 200
expect_eq "shop reviews list" "$(body 'j.items.length+"/"+j.items[0].reviewerName+"/"+j.items[0].comment')" "1/ผู้หางาน seeker/ร้านใจดี"
REVIEW=$(body j.items[0].id)
req "seeker received reviews" GET /seeker/reviews 200 "$SEEKER_TOKEN"
expect_eq "seeker reviews list" "$(body 'j.items[0].reviewerName')" "ร้านทดสอบ shop"
req "shop sees applicant's reviews" GET "/shop/seekers/$SEEKER_ID/reviews" 200 "$SHOP_TOKEN"
req "other shop cannot see them" GET "/shop/seekers/$SEEKER_ID/reviews" 404 "$OTHER_TOKEN"
root_sql "UPDATE applications SET completed_at = NOW() - INTERVAL 15 DAY WHERE id=$APP; DELETE FROM reviews WHERE application_id=$APP AND reviewer_user_id=$SHOP_USER"
req "review after 14 days" POST "/shop/applications/$APP/review" 409 "$SHOP_TOKEN" '{"rating":3}'
expect_eq "window code" "$(err_code)" "REVIEW_WINDOW_CLOSED"

echo "== reports"
req "report: admin forbidden" POST /reports 403 "$ADMIN_TOKEN" "{\"targetType\":\"job\",\"targetId\":$JOB2,\"reason\":\"x\"}"
req "report: no reason" POST /reports 400 "$SEEKER_TOKEN" "{\"targetType\":\"job\",\"targetId\":$JOB2,\"reason\":\" \"}"
req "report: unknown target" POST /reports 404 "$SEEKER_TOKEN" '{"targetType":"job","targetId":99999999,"reason":"spam"}'
req "report: job" POST /reports 201 "$SEEKER_TOKEN" "{\"targetType\":\"job\",\"targetId\":$JOB2,\"reason\":\"ประกาศหลอกลวง\"}"
REPORT_JOB=$(body j.report.id)
req "report: duplicate" POST /reports 409 "$SEEKER_TOKEN" "{\"targetType\":\"job\",\"targetId\":$JOB2,\"reason\":\"again\"}"
expect_eq "duplicate code" "$(err_code)" "ALREADY_REPORTED"
req "report: same job by shop of other" POST /reports 201 "$OTHER_TOKEN" "{\"targetType\":\"job\",\"targetId\":$JOB2,\"reason\":\"ไม่เหมาะสม\"}"
req "report: review" POST /reports 201 "$SHOP_TOKEN" "{\"targetType\":\"review\",\"targetId\":$REVIEW,\"reason\":\"รีวิวไม่จริง\"}"
REPORT_REVIEW=$(body j.report.id)
req "report: second review report to dismiss" POST /reports 201 "$SEEKER2_TOKEN" "{\"targetType\":\"review\",\"targetId\":$REVIEW,\"reason\":\"test\"}"
REPORT_DISMISS=$(body j.report.id)

echo "== admin: reports"
req "reports: shop forbidden" GET /admin/reports 403 "$SHOP_TOKEN"
req "reports: open list" GET "/admin/reports?pageSize=50" 200 "$ADMIN_TOKEN"
expect_eq "reports: has ours with target" "$(body "j.items.find(r=>r.id===$REPORT_JOB).target.title")" "งานเฟส7 b"
req "dismiss" POST "/admin/reports/$REPORT_DISMISS/dismiss" 200 "$ADMIN_TOKEN" '{"reason":"ไม่ผิดกฎ"}'
req "dismiss again" POST "/admin/reports/$REPORT_DISMISS/dismiss" 409 "$ADMIN_TOKEN"
req "resolve review report + hide review" POST "/admin/reports/$REPORT_REVIEW/resolve" 200 "$ADMIN_TOKEN" '{"hideTarget":true,"reason":"ข้อความไม่สุภาพ"}'
expect_eq "review hidden" "$(root_sql "SELECT is_hidden FROM reviews WHERE id=$REVIEW")" "1"
req "hidden review not public" GET "/jobs/shops/$MY_SHOP/reviews" 200
expect_eq "public reviews now empty" "$(body j.items.length)" "0"
req "shop rating ignores hidden" GET "/jobs/$JOB" 200
expect_eq "rating count 0" "$(body j.job.shop.rating.count)" "0"
req "resolve job report + hide job" POST "/admin/reports/$REPORT_JOB/resolve" 200 "$ADMIN_TOKEN" '{"hideTarget":true,"reason":"หลอกลวง"}'
expect_eq "job hidden" "$(root_sql "SELECT status FROM jobs WHERE id=$JOB2")" "hidden"
expect_eq "other report of same job auto-resolved" "$(root_sql "SELECT COUNT(*) FROM reports WHERE target_type='job' AND target_id=$JOB2 AND status='open'")" "0"
expect_eq "shop notified job hidden" "$(root_sql "SELECT COUNT(*) FROM notifications WHERE user_id=$SHOP_USER AND type='job.hidden'")" "1"
expect_eq "logs for report actions" "$(root_sql "SELECT GROUP_CONCAT(DISTINCT action ORDER BY action) FROM admin_logs WHERE (target_type='report' AND target_id IN ($REPORT_JOB,$REPORT_REVIEW,$REPORT_DISMISS)) OR (target_type='job' AND target_id=$JOB2) OR (target_type='review' AND target_id=$REVIEW)")" "job.hide,report.dismiss,report.resolve,review.hide"

echo "== admin: jobs"
req "jobs list" GET "/admin/jobs?status=hidden&q=%E0%B8%87" 200 "$ADMIN_TOKEN"
req "jobs list: all" GET "/admin/jobs?pageSize=50" 200 "$ADMIN_TOKEN"
expect_eq "jobs list has job + counts" "$(body "j.items.find(i=>i.id===$JOB).applicantCount")" "2"
req "job detail" GET "/admin/jobs/$JOB" 200 "$ADMIN_TOKEN"
expect_eq "job detail counts" "$(body 'j.job.applicationCounts.completed+"/"+j.job.applicationCounts.pending')" "1/1"
req "job applicants" GET "/admin/jobs/$JOB/applications" 200 "$ADMIN_TOKEN"
expect_eq "applicants: no contact" "$(body 'j.items.length+"/"+JSON.stringify(j).includes("0812345678")')" "2/false"
req "hide job directly" POST "/admin/jobs/$JOB/hide" 200 "$ADMIN_TOKEN" '{}'
expect_eq "hide: pending rejected" "$(body j.rejectedApplications)/$(root_sql "SELECT status FROM applications WHERE id=$APP2")" "1/rejected"
req "hide again" POST "/admin/jobs/$JOB/hide" 409 "$ADMIN_TOKEN"
req "unhide -> closed" POST "/admin/jobs/$JOB/unhide" 200 "$ADMIN_TOKEN"
expect_eq "unhide status" "$(root_sql "SELECT status FROM jobs WHERE id=$JOB")" "closed"
req "hide: shop forbidden" POST "/admin/jobs/$JOB/hide" 403 "$SHOP_TOKEN"

echo "== admin: users"
req "users: filter seeker" GET "/admin/users?role=seeker&q=test-seeker-$RUN" 200 "$ADMIN_TOKEN"
expect_eq "users: found + no hash" "$(body 'j.items.length+"/"+JSON.stringify(j).includes("password")')" "1/false"
req "suspend: reason required" POST "/admin/users/$SEEKER2_ID/suspend" 400 "$ADMIN_TOKEN" '{}'
req "suspend: ok" POST "/admin/users/$SEEKER2_ID/suspend" 200 "$ADMIN_TOKEN" '{"reason":"สแปม"}'
req "suspended user blocked" GET /auth/me 403 "$SEEKER2_TOKEN"
req "suspend admin forbidden" POST "/admin/users/1/suspend" 403 "$ADMIN_TOKEN" '{"reason":"x"}'
req "unsuspend" POST "/admin/users/$SEEKER2_ID/unsuspend" 200 "$ADMIN_TOKEN"
req "unsuspended user works" GET /auth/me 200 "$SEEKER2_TOKEN"
expect_eq "user logs" "$(root_sql "SELECT GROUP_CONCAT(CONCAT(action,':',IFNULL(reason,'-')) ORDER BY id) FROM admin_logs WHERE target_type='user' AND target_id=$SEEKER2_ID")" "user.suspend:สแปม,user.unsuspend:-"

echo "== admin: categories"
CAT="หมวดทดสอบ$RUN"
req "category: create" POST /admin/categories 201 "$ADMIN_TOKEN" "{\"name\":\"$CAT\",\"icon\":\"cafe-outline\",\"sortOrder\":500}"
CAT_ID=$(body j.category.id)
req "category: duplicate" POST /admin/categories 409 "$ADMIN_TOKEN" "{\"name\":\"$CAT\"}"
req "category: bad icon" POST /admin/categories 400 "$ADMIN_TOKEN" '{"name":"x","icon":"<b>"}'
req "category: deactivate" PUT "/admin/categories/$CAT_ID" 200 "$ADMIN_TOKEN" "{\"name\":\"$CAT\",\"icon\":\"cafe-outline\",\"sortOrder\":500,\"isActive\":false}"
req "category: public list hides inactive" GET /jobs/categories 200
expect_eq "inactive not public" "$(body "j.items.some(c=>c.id===$CAT_ID)")" "false"
req "category: admin list" GET /admin/categories 200 "$ADMIN_TOKEN"
expect_eq "admin sees inactive" "$(body "j.items.find(c=>c.id===$CAT_ID).isActive")" "false"
req "category: shop forbidden" POST /admin/categories 403 "$SHOP_TOKEN" '{"name":"x"}'

echo "== cleanup"
root_sql "DELETE FROM admin_logs WHERE (target_type='user' AND target_id=$SEEKER2_ID) OR (target_type='job' AND target_id IN ($JOB,$JOB2)) OR (target_type='review' AND target_id=$REVIEW) OR (target_type='report' AND target_id IN ($REPORT_JOB,$REPORT_REVIEW,$REPORT_DISMISS)) OR (target_type='category' AND target_id=$CAT_ID);
          DELETE FROM reports WHERE (target_type='job' AND target_id IN ($JOB,$JOB2)) OR (target_type='review' AND target_id=$REVIEW);
          DELETE FROM categories WHERE id=$CAT_ID;"
finish
