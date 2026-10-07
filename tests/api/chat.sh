#!/usr/bin/env bash
# Chat API + WebSocket smoke tests: room opens on accept, membership checks, text / image messages,
# unread counts, read receipts, real-time push, read-only after cancel.
# Usage (from the repo root): bash tests/api/chat.sh
. "$(dirname "$0")/lib.sh"

WS="ws://localhost:${NODE_RED_PORT:-1881}/ws/chat"
ORIGIN="http://localhost:4200"

new_seeker seeker; SEEKER_TOKEN=$TOKEN; SEEKER_ID=$USER_ID
new_seeker other; OTHER_TOKEN=$TOKEN
new_shop shop; SHOP_TOKEN=$TOKEN; SHOP_USER=$USER_ID; MY_SHOP=$SHOP_ID
verify_shop_db "$MY_SHOP"
api POST /shop/jobs "$SHOP_TOKEN" '{"title":"งานทดสอบแชท","description":"x","categoryId":1,"provinceId":38,"districtId":5001,"wage":60,"wageUnit":"hour","scheduleType":"weekly","workDays":["sat"],"startTime":"09:00","endTime":"17:00"}'
JOB=$(json "$TMP/fix.out" j.job.id)
api POST "/seeker/jobs/$JOB/apply" "$SEEKER_TOKEN"; APP=$(json "$TMP/fix.out" j.application.id)
api POST "/seeker/jobs/$JOB/apply" "$OTHER_TOKEN"

echo "== room opens only after accept"
req "by-application: pending -> 404" GET "/chat/by-application/$APP" 404 "$SEEKER_TOKEN"
api POST "/shop/applications/$APP/accept" "$SHOP_TOKEN"
req "by-application: seeker" GET "/chat/by-application/$APP" 200 "$SEEKER_TOKEN"
CONV=$(body j.conversation.id)
expect_eq "seeker sees shop as other party" "$(body 'j.conversation.myRole+"/"+j.conversation.other.name+"/"+j.conversation.canSend')" "seeker/ร้านทดสอบ shop/true"
req "by-application: shop" GET "/chat/by-application/$APP" 200 "$SHOP_TOKEN"
expect_eq "shop sees seeker as other party" "$(body 'j.conversation.myRole+"/"+j.conversation.other.name+"/"+j.conversation.id')" "shop/ผู้หางาน seeker/$CONV"

echo "== membership"
req "other seeker: conversation 404" GET "/chat/conversations/$CONV" 404 "$OTHER_TOKEN"
req "other seeker: messages 404" GET "/chat/conversations/$CONV/messages" 404 "$OTHER_TOKEN"
req "other seeker: send 404" POST "/chat/conversations/$CONV/messages" 404 "$OTHER_TOKEN" '{"body":"แอบส่ง"}'
req "admin forbidden" GET /chat/conversations 403 "$ADMIN_TOKEN"
req "no token" GET /chat/conversations 401

echo "== real-time push + messages"
node tests/api/ws-client.js "$WS" "$ORIGIN" "$SHOP_TOKEN" "$TMP/ws-shop.txt" 6 &
node tests/api/ws-client.js "$WS" "$ORIGIN" "garbage.token" "$TMP/ws-bad.txt" 3 &
node tests/api/ws-client.js "$WS" "http://evil.example" "$SHOP_TOKEN" "$TMP/ws-evil.txt" 3 &
sleep 1.5
req "send: empty" POST "/chat/conversations/$CONV/messages" 400 "$SEEKER_TOKEN" '{"body":"   "}'
req "send: text" POST "/chat/conversations/$CONV/messages" 201 "$SEEKER_TOKEN" '{"body":"สวัสดีครับ พรุ่งนี้เข้างานกี่โมง"}'
M1=$(body j.message.id)
upload "send: image" "/chat/conversations/$CONV/images" 201 "$SEEKER_TOKEN" "$TMP/a.png"
IMG=$(body j.message.imagePath)
check "image: served" "$(curl -s -o /dev/null -w '%{http_code}' "$UPLOADS/$IMG")" 200
upload "send: svg disguised" "/chat/conversations/$CONV/images" 415 "$SEEKER_TOKEN" "$TMP/evil.png"
sleep 1
expect_eq "ws: shop authenticated" "$(grep -c '"type":"auth.ok"' "$TMP/ws-shop.txt")" "1"
expect_eq "ws: shop got both messages live" "$(grep -c '"type":"message"' "$TMP/ws-shop.txt")" "2"
expect_eq "ws: pushed message content" "$(grep '"type":"message"' "$TMP/ws-shop.txt" | head -1 | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const e=JSON.parse(s);process.stdout.write(e.message.body+'|'+e.conversationId)})")" "สวัสดีครับ พรุ่งนี้เข้างานกี่โมง|$CONV"
expect_eq "ws: bad token rejected" "$(grep -c 'auth.error' "$TMP/ws-bad.txt")" "1"
expect_eq "ws: bad token gets no messages" "$(grep -c '"type":"message"' "$TMP/ws-bad.txt")" "0"
expect_eq "ws: foreign origin refused" "$(grep -c 'socket.error' "$TMP/ws-evil.txt")" "1"

echo "== unread + read receipts"
req "shop unread count" GET /chat/unread-count 200 "$SHOP_TOKEN"
expect_eq "shop unread = 2" "$(body j.unread)" "2"
req "seeker unread count (own messages)" GET /chat/unread-count 200 "$SEEKER_TOKEN"
expect_eq "seeker unread = 0" "$(body j.unread)" "0"
req "shop list" GET /chat/conversations 200 "$SHOP_TOKEN"
expect_eq "list: unread + last message is image" "$(body 'j.items[0].unread+"/"+j.items[0].lastMessage.hasImage+"/"+j.items[0].job.title')" "2/true/งานทดสอบแชท"
req "shop history" GET "/chat/conversations/$CONV/messages" 200 "$SHOP_TOKEN"
LAST=$(body 'j.items[j.items.length-1].id')
expect_eq "history oldest first" "$(body 'j.items.length+"/"+j.items[0].id')" "2/$M1"
node tests/api/ws-client.js "$WS" "$ORIGIN" "$SEEKER_TOKEN" "$TMP/ws-seeker.txt" 3 &
sleep 1
req "shop marks read" POST "/chat/conversations/$CONV/read" 200 "$SHOP_TOKEN" "{\"lastMessageId\":$LAST}"
req "read: bad id" POST "/chat/conversations/$CONV/read" 400 "$SHOP_TOKEN" '{"lastMessageId":"x"}'
sleep 1
expect_eq "ws: seeker got read receipt" "$(grep -c '"type":"read"' "$TMP/ws-seeker.txt")" "1"
req "shop unread after read" GET /chat/unread-count 200 "$SHOP_TOKEN"
expect_eq "shop unread = 0" "$(body j.unread)" "0"
req "seeker sees read position" GET "/chat/conversations/$CONV" 200 "$SEEKER_TOKEN"
expect_eq "otherLastReadId" "$(body j.conversation.otherLastReadId)" "$LAST"
req "shop replies" POST "/chat/conversations/$CONV/messages" 201 "$SHOP_TOKEN" '{"body":"9 โมงครับ"}'
req "seeker catch-up (after)" GET "/chat/conversations/$CONV/messages?after=$LAST" 200 "$SEEKER_TOKEN"
expect_eq "after returns only new" "$(body 'j.items.length+"/"+j.items[0].body')" "1/9 โมงครับ"
req "older page (before)" GET "/chat/conversations/$CONV/messages?before=$LAST&limit=1" 200 "$SEEKER_TOKEN"
expect_eq "before page" "$(body 'j.items.length+"/"+j.items[0].id+"/"+j.hasMore')" "1/$M1/false"

echo "== read-only after cancel"
api POST "/seeker/applications/$APP/cancel" "$SEEKER_TOKEN"
req "cancelled: can still read" GET "/chat/conversations/$CONV/messages" 200 "$SEEKER_TOKEN"
req "cancelled: cannot send" POST "/chat/conversations/$CONV/messages" 409 "$SEEKER_TOKEN" '{"body":"ยังอยู่ไหม"}'
expect_eq "closed code" "$(err_code)" "CHAT_CLOSED"
req "cancelled: canSend false" GET "/chat/conversations/$CONV" 200 "$SHOP_TOKEN"
expect_eq "canSend" "$(body j.conversation.canSend)" "false"

wait
echo "== cleanup"
docker exec sidejob-nodered sh -c "rm -f /data/uploads/public/$IMG"
finish
