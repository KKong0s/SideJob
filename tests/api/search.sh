#!/usr/bin/env bash
# Phase 4 API smoke tests: job search filters, pagination, detail, area counts, saved jobs, seeker profile.
# Usage (from the repo root): bash tests/api/search.sh
# Search results are filtered by a keyword unique to this run so existing jobs do not interfere.
. "$(dirname "$0")/lib.sh"

d() { node -e "const d=new Date(Date.now()+7*3600e3+($1)*864e5);process.stdout.write(d.toISOString().slice(0,10))"; }
K="kw$RUN"   # keyword in every test job title

new_seeker seeker; SEEKER_TOKEN=$TOKEN
new_shop shop; SHOP_TOKEN=$TOKEN; MY_SHOP=$SHOP_ID
new_shop pending; PENDING_TOKEN=$TOKEN; PENDING_SHOP=$SHOP_ID
verify_shop_db "$MY_SHOP"; verify_shop_db "$PENDING_SHOP"

mk() { # <title> <json fields> -> prints job id
  api POST /shop/jobs "$2" "{\"title\":\"$1 $K\",\"description\":\"รายละเอียด\",\"categoryId\":${4:-1},\"provinceId\":38,\"districtId\":5001,\"wage\":60,\"wageUnit\":\"hour\",\"scheduleType\":\"weekly\",\"workDays\":[\"sat\",\"sun\"],\"startTime\":\"09:00\",\"endTime\":\"17:00\"${3:+,$3}}"
  json "$TMP/fix.out" j.job.id
}
A=$(mk "A-cafe-weekend" "$SHOP_TOKEN")
B=$(mk "B-bkk-weekday" "$SHOP_TOKEN" '"provinceId":1,"districtId":1001,"workDays":["mon","tue"],"wage":400,"wageUnit":"day"' 2)
C=$(mk "C-chiangmai-other-district" "$SHOP_TOKEN" '"districtId":5002,"wage":80')
DATES=$(mk "D-one-day-event" "$SHOP_TOKEN" "\"scheduleType\":\"dates\",\"startDate\":\"$(d 3)\",\"endDate\":\"$(d 3)\",\"wage\":700,\"wageUnit\":\"job\"")
CLOSED=$(mk "E-closed" "$SHOP_TOKEN")
api POST "/shop/jobs/$CLOSED/close" "$SHOP_TOKEN"
EXPIRED=$(mk "F-expired" "$SHOP_TOKEN")
root_sql "UPDATE jobs SET expires_on = DATE_SUB(CURDATE(), INTERVAL 1 DAY) WHERE id=$EXPIRED"
HIDDEN=$(mk "G-hidden" "$SHOP_TOKEN")
root_sql "UPDATE jobs SET status='hidden' WHERE id=$HIDDEN"
UNVERIFIED=$(mk "H-unverified-shop" "$PENDING_TOKEN")
root_sql "UPDATE shops SET verify_status='pending' WHERE id=$PENDING_SHOP"
DAYS_WEEKDAY=$(node -e "const w=['sun','mon','tue','wed','thu','fri','sat'];process.stdout.write(w[new Date('$(d 3)T12:00:00Z').getUTCDay()])")

ids() { body 'j.items.map(i=>i.title.split(" ")[0]).sort().join(",")'; }

echo "== visibility"
req "search: public, no token" GET "/jobs?q=$K" 200
expect_eq "search: only visible jobs" "$(ids)" "A-cafe-weekend,B-bkk-weekday,C-chiangmai-other-district,D-one-day-event"
expect_eq "search: no phone / LINE / description in list" "$(body 'JSON.stringify(j.items).includes("053") || "description" in j.items[0]')" "false"
expect_eq "search: shop + accepting" "$(body 'j.items[0].shop.name.length>0 && j.items.every(i=>i.acceptingApplications)')" "true"
expect_eq "search: newest first" "$(body 'j.items[0].title.split(" ")[0]')" "D-one-day-event"

echo "== filters"
req "filter: province" GET "/jobs?q=$K&provinceId=38" 200
expect_eq "filter: province 38" "$(ids)" "A-cafe-weekend,C-chiangmai-other-district,D-one-day-event"
req "filter: districts" GET "/jobs?q=$K&provinceId=38&districtIds=5001" 200
expect_eq "filter: district 5001" "$(ids)" "A-cafe-weekend,D-one-day-event"
req "filter: multiple districts" GET "/jobs?q=$K&districtIds=5002,1001" 200
expect_eq "filter: 5002 + 1001" "$(ids)" "B-bkk-weekday,C-chiangmai-other-district"
req "filter: category" GET "/jobs?q=$K&categoryId=2" 200
expect_eq "filter: category 2" "$(ids)" "B-bkk-weekday"
req "filter: wage range + unit" GET "/jobs?q=$K&wageUnit=hour&wageMin=70&wageMax=100" 200
expect_eq "filter: hourly 70-100" "$(ids)" "C-chiangmai-other-district"
req "filter: work days (weekly)" GET "/jobs?q=$K&workDays=mon" 200
expect_eq "filter: monday" "$(ids)" "$( [[ $DAYS_WEEKDAY == mon ]] && echo 'B-bkk-weekday,D-one-day-event' || echo 'B-bkk-weekday')"
req "filter: work days (dates job)" GET "/jobs?q=$K&workDays=$DAYS_WEEKDAY&wageUnit=job" 200
expect_eq "filter: weekday of the one-day event" "$(ids)" "D-one-day-event"
req "filter: bad districtIds" GET "/jobs?districtIds=1,x" 400
req "filter: bad workDays" GET "/jobs?workDays=funday" 400
req "filter: bad wage" GET "/jobs?wageMin=-5" 400

echo "== pagination"
req "page 1 of 2" GET "/jobs?q=$K&pageSize=3" 200
expect_eq "page 1: 3 items + next" "$(body 'j.items.length+"/"+j.hasNext+"/"+j.page')" "3/true/1"
req "page 2 of 2" GET "/jobs?q=$K&pageSize=3&page=2" 200
expect_eq "page 2: 1 item, no next" "$(body 'j.items.length+"/"+j.hasNext')" "1/false"

echo "== area counts"
req "area counts" GET /jobs/area-counts 200
expect_eq "area counts: 1001 has our job" "$(body 'j.districts["1001"]>=1 && j.provinces["1"]>=j.districts["1001"] && j.total>=4')" "true"

echo "== detail"
req "detail: open job" GET "/jobs/$A" 200
expect_eq "detail: description + shop, no contact" "$(body 'j.job.description+"/"+j.job.acceptingApplications+"/"+("phone" in j.job.shop)')" "รายละเอียด/true/false"
req "detail: closed job readable, not accepting" GET "/jobs/$CLOSED" 200
expect_eq "detail: closed not accepting" "$(body j.job.acceptingApplications)" "false"
req "detail: expired job not accepting" GET "/jobs/$EXPIRED" 200
expect_eq "detail: expired not accepting" "$(body j.job.acceptingApplications)" "false"
req "detail: hidden job -> 404" GET "/jobs/$HIDDEN" 404
req "detail: unverified shop -> 404" GET "/jobs/$UNVERIFIED" 404
req "detail: unknown -> 404" GET "/jobs/99999999" 404
req "categories still routed" GET /jobs/categories 200

echo "== saved jobs"
req "save: no token" PUT "/seeker/saved-jobs/$A" 401
req "save: shop forbidden" PUT "/seeker/saved-jobs/$A" 403 "$SHOP_TOKEN"
req "save: ok" PUT "/seeker/saved-jobs/$A" 200 "$SEEKER_TOKEN"
req "save: twice is fine" PUT "/seeker/saved-jobs/$A" 200 "$SEEKER_TOKEN"
req "save: closed job" PUT "/seeker/saved-jobs/$CLOSED" 200 "$SEEKER_TOKEN"
req "save: hidden -> 404" PUT "/seeker/saved-jobs/$HIDDEN" 404 "$SEEKER_TOKEN"
req "save: unknown -> 404" PUT "/seeker/saved-jobs/99999999" 404 "$SEEKER_TOKEN"
req "saved list" GET /seeker/saved-jobs 200 "$SEEKER_TOKEN"
expect_eq "saved list: newest first + accepting flags" "$(body 'j.items.map(i=>i.title.split(" ")[0]+":"+i.acceptingApplications).join(",")')" "E-closed:false,A-cafe-weekend:true"
req "status: saved, no application" GET "/seeker/jobs/$A/status" 200 "$SEEKER_TOKEN"
expect_eq "status" "$(body 'j.saved+"/"+j.application')" "true/null"
req "unsave" DELETE "/seeker/saved-jobs/$A" 200 "$SEEKER_TOKEN"
req "status after unsave" GET "/seeker/jobs/$A/status" 200 "$SEEKER_TOKEN"
expect_eq "status: not saved" "$(body j.saved)" "false"

echo "== seeker profile"
req "profile: shop forbidden" GET /seeker/profile 403 "$SHOP_TOKEN"
req "profile: ok" GET /seeker/profile 200 "$SEEKER_TOKEN"
expect_eq "profile: fields" "$(body 'j.profile.fullName+"/"+j.profile.birthDate+"/"+j.profile.areas[0].provinceName+"/"+j.profile.areas[0].districtId')" "ผู้หางาน seeker/2000-01-15/เชียงใหม่/null"

echo "== cleanup"
finish
