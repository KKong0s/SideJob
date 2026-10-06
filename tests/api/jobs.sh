#!/usr/bin/env bash
# Phase 3 API smoke tests: categories, job create / edit / close / renew, lock rules, daily expiry.
# Usage (from the repo root): bash tests/api/jobs.sh
. "$(dirname "$0")/lib.sh"

d() { node -e "const d=new Date(Date.now()+7*3600e3+($1)*864e5);process.stdout.write(d.toISOString().slice(0,10))"; }
TODAY=$(d 0)

new_seeker seeker; SEEKER_TOKEN=$TOKEN; SEEKER_ID=$USER_ID
new_shop shop; SHOP_TOKEN=$TOKEN; SHOP_USER=$USER_ID; MY_SHOP=$SHOP_ID
new_shop other; OTHER_TOKEN=$TOKEN; OTHER_SHOP=$SHOP_ID

job_body() { # <title> [extra json fields]
  echo "{\"title\":\"$1\",\"description\":\"ช่วยงานหน้าร้าน\",\"categoryId\":1,\"provinceId\":38,\"districtId\":5001,\"wage\":60,\"wageUnit\":\"hour\",\"scheduleType\":\"weekly\",\"workDays\":[\"sat\",\"sun\"],\"startTime\":\"09:00\",\"endTime\":\"17:00\"${2:+,$2}}"
}

echo "== categories"
req "categories: public" GET /jobs/categories 200
expect_eq "categories: seeded" "$(body 'j.items.length>=10 && j.items[0].name.length>0')" "true"

echo "== create"
req "create: seeker forbidden" POST /shop/jobs 403 "$SEEKER_TOKEN" "$(job_body งาน)"
req "create: unverified shop" POST /shop/jobs 403 "$SHOP_TOKEN" "$(job_body งาน)"
expect_eq "create: code" "$(err_code)" "SHOP_NOT_VERIFIED"
verify_shop_db "$MY_SHOP"; verify_shop_db "$OTHER_SHOP"
req "create: missing title" POST /shop/jobs 400 "$SHOP_TOKEN" "$(job_body '')"
req "create: wage 0" POST /shop/jobs 400 "$SHOP_TOKEN" "$(job_body งาน '"wage":0')"
req "create: bad time" POST /shop/jobs 400 "$SHOP_TOKEN" "$(job_body งาน '"startTime":"25:00"')"
req "create: no work days" POST /shop/jobs 400 "$SHOP_TOKEN" "$(job_body งาน '"workDays":[]')"
req "create: district mismatch" POST /shop/jobs 400 "$SHOP_TOKEN" "$(job_body งาน '"districtId":1001')"
req "create: min age 16" POST /shop/jobs 400 "$SHOP_TOKEN" "$(job_body งาน '"minAge":16')"
req "create: expiry 61 days" POST /shop/jobs 400 "$SHOP_TOKEN" "$(job_body งาน "\"expiresOn\":\"$(d 61)\"")"
req "create: expiry today" POST /shop/jobs 400 "$SHOP_TOKEN" "$(job_body งาน "\"expiresOn\":\"$TODAY\"")"
req "create: dates in the past" POST /shop/jobs 400 "$SHOP_TOKEN" "$(job_body งาน "\"scheduleType\":\"dates\",\"startDate\":\"$(d -1)\",\"endDate\":\"$(d 1)\"")"
req "create: weekly ok" POST /shop/jobs 201 "$SHOP_TOKEN" "$(job_body 'พนักงานเสิร์ฟ' '"minAge":20')"
JOB=$(body j.job.id)
expect_eq "create: default expiry 30 days" "$(body j.job.expiresOn)" "$(d 30)"
expect_eq "create: fields" "$(body 'j.job.status+"/"+j.job.workDays.join(",")+"/"+j.job.wage+"/"+j.job.locked+"/"+j.job.category.name.length')" "open/sat,sun/60/false/17"
req "create: dates ok (derives weekdays)" POST /shop/jobs 201 "$SHOP_TOKEN" "$(job_body 'งานอีเวนต์' "\"scheduleType\":\"dates\",\"startDate\":\"$(d 1)\",\"endDate\":\"$(d 1)\",\"wageUnit\":\"day\",\"wage\":500,\"expiresOn\":\"$(d 5)\"")"
JOB2=$(body j.job.id)
expect_eq "create: dates job has one weekday" "$(body 'j.job.workDays.length+"/"+j.job.scheduleType')" "1/dates"

echo "== list / get / ownership"
req "list: own jobs" GET "/shop/jobs?status=open" 200 "$SHOP_TOKEN"
expect_eq "list: two open jobs" "$(body 'j.items.length+"/"+j.hasNext')" "2/false"
req "list: pageSize 1" GET "/shop/jobs?pageSize=1" 200 "$SHOP_TOKEN"
expect_eq "list: has next page" "$(body 'j.items.length+"/"+j.hasNext')" "1/true"
req "list: other shop sees none of them" GET /shop/jobs 200 "$OTHER_TOKEN"
expect_eq "list: other shop empty" "$(body j.items.length)" "0"
req "get: own" GET "/shop/jobs/$JOB" 200 "$SHOP_TOKEN"
req "get: other shop -> 404" GET "/shop/jobs/$JOB" 404 "$OTHER_TOKEN"
req "update: other shop -> 404" PUT "/shop/jobs/$JOB" 404 "$OTHER_TOKEN" "$(job_body 'ขโมย')"
req "close: other shop -> 404" POST "/shop/jobs/$JOB/close" 404 "$OTHER_TOKEN"
req "renew: other shop -> 404" POST "/shop/jobs/$JOB/renew" 404 "$OTHER_TOKEN"

echo "== update + lock rules"
req "update: change wage (no applicants)" PUT "/shop/jobs/$JOB" 200 "$SHOP_TOKEN" "$(job_body 'พนักงานเสิร์ฟ (แก้ไข)' '"wage":70')"
expect_eq "update: saved" "$(body 'j.job.title+"/"+j.job.wage')" "พนักงานเสิร์ฟ (แก้ไข)/70"
root_sql "INSERT INTO applications (job_id, seeker_user_id) VALUES ($JOB, $SEEKER_ID)"
req "update: wage locked with applicant" PUT "/shop/jobs/$JOB" 409 "$SHOP_TOKEN" "$(job_body 'พนักงานเสิร์ฟ' '"wage":80')"
expect_eq "update: lock code" "$(err_code)" "JOB_LOCKED"
req "update: schedule locked" PUT "/shop/jobs/$JOB" 409 "$SHOP_TOKEN" "$(job_body 'พนักงานเสิร์ฟ' '"wage":70,"workDays":["sat"]')"
req "update: title still editable" PUT "/shop/jobs/$JOB" 200 "$SHOP_TOKEN" "$(job_body 'พนักงานเสิร์ฟ ด่วน' '"wage":70,"description":"รายละเอียดใหม่"')"
expect_eq "update: locked flag / counts" "$(body 'j.job.locked+"/"+j.job.pendingCount+"/"+j.job.applicantCount')" "true/1/1"

echo "== renew"
req "renew: open job +30 days" POST "/shop/jobs/$JOB2/renew" 200 "$SHOP_TOKEN"
expect_eq "renew: from current expiry" "$(body j.expiresOn)" "$(d 35)"
req "renew: capped at 60 days" POST "/shop/jobs/$JOB2/renew" 200 "$SHOP_TOKEN"
expect_eq "renew: cap" "$(body j.expiresOn)" "$(d 60)"
req "renew: already at limit" POST "/shop/jobs/$JOB2/renew" 409 "$SHOP_TOKEN"
expect_eq "renew: code" "$(err_code)" "RENEW_LIMIT"

echo "== close"
req "close: ok" POST "/shop/jobs/$JOB/close" 200 "$SHOP_TOKEN"
expect_eq "close: pending application rejected" "$(body j.rejectedApplications)/$(root_sql "SELECT status FROM applications WHERE job_id=$JOB")" "1/rejected"
expect_eq "close: seeker notified" "$(root_sql "SELECT COUNT(*) FROM notifications WHERE user_id=$SEEKER_ID AND type='application.rejected'")" "1"
req "close: again" POST "/shop/jobs/$JOB/close" 409 "$SHOP_TOKEN"
req "renew: reopens closed job" POST "/shop/jobs/$JOB/renew" 200 "$SHOP_TOKEN"
expect_eq "renew: reopened (+30 from current expiry, capped)" "$(body 'j.status+"/"+j.expiresOn')" "open/$(d 60)"

echo "== hidden job"
root_sql "UPDATE jobs SET status='hidden' WHERE id=$JOB"
req "hidden: cannot edit" PUT "/shop/jobs/$JOB" 409 "$SHOP_TOKEN" "$(job_body 'x' '"wage":70')"
req "hidden: cannot renew" POST "/shop/jobs/$JOB/renew" 409 "$SHOP_TOKEN"
req "hidden: listed under hidden" GET "/shop/jobs?status=hidden" 200 "$SHOP_TOKEN"
expect_eq "hidden: count" "$(body j.items.length)" "1"

echo "== daily expiry"
root_sql "UPDATE jobs SET expires_on = DATE_SUB(CURDATE(), INTERVAL 1 DAY) WHERE id=$JOB2;
          INSERT INTO applications (job_id, seeker_user_id) VALUES ($JOB2, $SEEKER_ID)"
req "expire: shop cannot trigger" POST /admin/jobs/close-expired 403 "$SHOP_TOKEN"
req "expire: admin trigger" POST /admin/jobs/close-expired 200 "$ADMIN_TOKEN"
expect_eq "expire: job closed" "$(root_sql "SELECT status FROM jobs WHERE id=$JOB2")" "closed"
expect_eq "expire: pending application rejected" "$(root_sql "SELECT status FROM applications WHERE job_id=$JOB2")" "rejected"
expect_eq "expire: shop notified" "$(root_sql "SELECT link FROM notifications WHERE user_id=$SHOP_USER AND type='job.expired'")" "/shop/jobs/$JOB2"
req "expire: second run closes nothing new" POST /admin/jobs/close-expired 200 "$ADMIN_TOKEN"
expect_eq "expire: idempotent" "$(root_sql "SELECT COUNT(*) FROM notifications WHERE user_id=$SHOP_USER AND type='job.expired'")" "1"

echo "== sample photos"
P=$(api POST /shop/jobs "$SHOP_TOKEN" "$(job_body 'งานมีรูป')"; json "$TMP/fix.out" j.job.id)
upload "photo: svg rejected" "/shop/jobs/$P/images" 415 "$SHOP_TOKEN" "$TMP/evil.png"
upload "photo: other shop -> 404" "/shop/jobs/$P/images" 404 "$OTHER_TOKEN" "$TMP/a.png"
upload "photo: seeker forbidden" "/shop/jobs/$P/images" 403 "$SEEKER_TOKEN" "$TMP/a.png"
for i in 1 2 3 4 5; do upload "photo: add #$i" "/shop/jobs/$P/images" 201 "$SHOP_TOKEN" "$TMP/a.png"; done
IMG=$(body j.image.id); IMG_PATH=$(body j.image.path)
check "photo: public URL" "$(curl -s -o /dev/null -w '%{http_code}' "$UPLOADS/$IMG_PATH")" 200
upload "photo: 6th over limit" "/shop/jobs/$P/images" 409 "$SHOP_TOKEN" "$TMP/a.png"
expect_eq "photo: limit code" "$(err_code)" "IMAGE_LIMIT"
expect_eq "photo: no stray file after limit" "$(docker exec sidejob-nodered sh -c "ls /data/uploads/public/jobs | wc -l")" "$(root_sql "SELECT COUNT(*) FROM job_images")"
req "photo: listed on own job" GET "/shop/jobs/$P" 200 "$SHOP_TOKEN"
expect_eq "photo: 5 images in order" "$(body 'j.job.images.length+"/"+(j.job.images[4].id==='"$IMG"')')" "5/true"
req "photo: listed on public detail" GET "/jobs/$P" 200
expect_eq "photo: public images" "$(body 'j.job.images.length')" "5"
req "photo: not in search list" GET "/jobs?provinceId=38&pageSize=50" 200
expect_eq "photo: list has no images field" "$(body 'j.items.some(i=>i.id==='"$P"') && j.items.every(i=>!("images" in i))')" "true"
req "photo: other shop cannot delete" DELETE "/shop/jobs/$P/images/$IMG" 404 "$OTHER_TOKEN"
req "photo: delete" DELETE "/shop/jobs/$P/images/$IMG" 200 "$SHOP_TOKEN"
check "photo: file removed" "$(curl -s -o /dev/null -w '%{http_code}' "$UPLOADS/$IMG_PATH")" 404
upload "photo: add again after delete" "/shop/jobs/$P/images" 201 "$SHOP_TOKEN" "$TMP/a.png"
docker exec sidejob-nodered sh -c "cd /data/uploads/public/jobs && rm -f $(root_sql "SELECT GROUP_CONCAT(file_name SEPARATOR ' ') FROM job_images WHERE job_id=$P")"

echo "== cleanup"
finish
