# SideJob

แอปหางานพาร์ทไทม์ในประเทศไทย: Ionic + Angular / Node-RED / MySQL
ข้อกำหนดของโปรเจกต์อยู่ใน `../CLAUDE.md` ส่วน API อยู่ใน `docs/api.md`

## เริ่มรันในเครื่อง

ต้องมี Docker Desktop และ Node.js 24

```bash
# 1) ตั้งค่า secret (ครั้งแรก)
cp .env.example .env        # แล้วแก้ค่าใน .env

# 2) เปิด MySQL + Node-RED
docker compose up -d --build

# 3) เปิด frontend
cd frontend
npm install
npm start                   # http://localhost:4200  (หรือ `ionic serve` -> :8100)
```

| บริการ | URL |
|---|---|
| Node-RED editor | http://localhost:1881 (login ตาม `NODE_RED_ADMIN_USER` / รหัสที่ใช้สร้าง hash) |
| API | http://localhost:1881/api/health |
| MySQL | `localhost:3307` (user ของแอป: `DB_USER`) |
| phpMyAdmin (dev เท่านั้น) | http://localhost:8081 — login ด้วย `DB_USER` (สิทธิ์เท่าแอป) หรือ `root` |

ตั้งพอร์ตเป็น 3307 / 1881 / 8081 เพื่อไม่ให้ชนกับ MySQL / Node-RED ตัวอื่นในเครื่อง ถ้าจะเปลี่ยนให้แก้ใน `.env` และ `frontend/src/environments/environment.ts`

บัญชีแอดมินตั้งต้น (สำหรับ dev): `admin@sidejob.local` / `Admin@1234` (ต้องเปลี่ยนก่อนใช้งานจริง)

## ข้อมูลตัวอย่างสำหรับสาธิต

```bash
bash database/demo/seed-demo.sh   # รันซ้ำได้ ข้อมูลตัวอย่างเดิมจะถูกลบแล้วสร้างใหม่ (วันที่อิงจากวันนี้)
```

ทุกบัญชีใช้รหัสผ่าน **`Demo@1234`** (อีเมลลงท้ายด้วย `@demo.sidejob.local` ไม่ยุ่งกับข้อมูลอื่นในฐานข้อมูล)

| บัญชี | ร้าน / ชื่อ | จังหวัด | สถานะ |
|---|---|---|---|
| `shop01@demo.sidejob.local` | คาเฟ่ใบชา สยาม | กรุงเทพฯ (ปทุมวัน) | ยืนยันแล้ว · มีผู้สมัครรอพิจารณา · มีรีวิว |
| `shop02@demo.sidejob.local` | ข้าวมันไก่เฮียเล้ง | กรุงเทพฯ (บางรัก) | ยืนยันแล้ว · มีรีวิว |
| `shop03@demo.sidejob.local` | มินิมาร์ทสุขใจ | กรุงเทพฯ (บางกะปิ) | ยืนยันแล้ว · มีคนที่รับแล้ว |
| `shop04@demo.sidejob.local` | บ้านกาแฟดอยช้าง นิมมาน | เชียงใหม่ | ยืนยันแล้ว |
| `shop05@demo.sidejob.local` | ล้านนา อีเวนต์ แอนด์ ออแกไนซ์ | เชียงใหม่ | ยืนยันแล้ว |
| `shop06@demo.sidejob.local` | กะตะ บีช รีสอร์ท | ภูเก็ต | ยืนยันแล้ว |
| `shop07@demo.sidejob.local` | ขอนแก่น เอ็กซ์เพรส โลจิสติกส์ | ขอนแก่น | ยืนยันแล้ว |
| `shop08@demo.sidejob.local` | บางละมุง ซีฟู้ด | ชลบุรี | ยืนยันแล้ว |
| `shop09@demo.sidejob.local` | หาดใหญ่ สมาร์ท ติวเตอร์ | สงขลา | ยืนยันแล้ว |
| `shop10@demo.sidejob.local` | โคราช คลีน แอนด์ แคร์ | นครราชสีมา | ยืนยันแล้ว · มีงานเสร็จที่รอผู้หางานรีวิว |
| `shop11@demo.sidejob.local` | เบเกอรี่บ้านนนท์ | นนทบุรี | **รอแอดมินยืนยัน** (มีเอกสาร) |
| `shop12@demo.sidejob.local` | สมุย ไดฟ์ ช็อป | สุราษฎร์ธานี | **รอแอดมินยืนยัน** (มีเอกสาร) |
| `shop13@demo.sidejob.local` | อุดร แฟชั่นมอลล์ | อุดรธานี | ไม่ผ่านการยืนยัน (มีเหตุผล) |
| `shop14@demo.sidejob.local` | ร้านน้ำปั่นแม่ริม | เชียงใหม่ | ยังไม่ส่งเอกสาร |
| `seeker01@demo.sidejob.local` | สมชาย ใจดี | กรุงเทพฯ | มีใบสมัครรอพิจารณา · งานบันทึกไว้ |
| `seeker02@demo.sidejob.local` | มาลี สวยงาม | กรุงเทพฯ | ถูกรับเข้าทำงาน (เห็นเบอร์/LINE ร้าน) |
| `seeker03@demo.sidejob.local` | อนุชา คนขยัน | ขอนแก่น / โคราช | งานเสร็จ รีวิวร้านได้ |
| `seeker04@demo.sidejob.local` | ปิยะนุช ล้านนา | เชียงใหม่ | ถูกรับ + รอพิจารณา |
| `seeker05@demo.sidejob.local` | ธนากร ทะเลใส | ภูเก็ต / ชลบุรี | ถูกรับเข้าทำงาน |
| `seeker06@demo.sidejob.local` | กมลวรรณ เก่งคณิต | สงขลา | รอพิจารณา |

แอดมิน: `admin@sidejob.local` / `Admin@1234` (มีร้านรอยืนยัน 2 ร้าน และรายงานรอจัดการ 2 รายการ)

## ฐานข้อมูล

- สคริปต์ใน `database/` รันอัตโนมัติ **ครั้งแรกที่สร้าง volume** เท่านั้น ตามลำดับ: `schema.sql` → `thai-geo/geo.sql` → `seed.sql` → `create-app-user.sh`
- สร้างฐานข้อมูลใหม่ทั้งหมด (ข้อมูลเดิมหาย): `docker compose down -v && docker compose up -d`
- ฐานข้อมูลที่มีอยู่แล้ว (ไม่ลบข้อมูล): `bash database/migrate.sh` รัน `database/migrations/*.sql` ตามลำดับชื่อ แล้ว GRANT สิทธิ์ตารางใหม่ให้ user ของแอป (migration เขียนให้รันซ้ำได้) ตารางใหม่ต้องใส่ทั้งใน `schema.sql` และไฟล์ migration
- ข้อมูลจังหวัด/อำเภอมาจาก [kongvut/thai-province-data](https://github.com/kongvut/thai-province-data) (MIT) จัดเป็น 4 ภาค ถ้าจะสร้าง `geo.sql` ใหม่ให้รัน `node database/thai-geo/build-geo-sql.js`
- user ของแอป (`DB_USER`) ได้สิทธิ์แยกเป็นรายตาราง: ตารางภูมิศาสตร์อ่านได้อย่างเดียว ส่วน `admin_logs` ได้แค่ SELECT/INSERT
  **ถ้าเพิ่มตารางใหม่ ต้อง GRANT ให้ user นี้ด้วย** (`database/migrate.sh` ทำให้อัตโนมัติ)

## Node-RED

- `backend/` ถูก mount เป็น user dir (`/data`) ของ Node-RED ดังนั้นการแก้ flow ใน editor จะบันทึกลง `backend/flows.json` โดยตรง
- `backend/flows_cred.json` ถูก commit เข้า Git และไม่เข้ารหัส **ให้ใส่ได้เฉพาะ `${ENV_VAR}` เท่านั้น** ห้ามพิมพ์รหัสผ่านจริงลงช่อง credential ใน editor
- ไลบรารีที่ใช้ใน function node ได้: `global.get('bcrypt')`, `global.get('jwt')`, `global.get('googleAuth')`, `global.get('crypto')`
- `global.get('sj')` = `backend/helpers/sidejob.js` (แก้แล้วต้อง restart Node-RED): `tx()` transaction ผ่าน mysql2 pool, `paging()` / `pageResult()`, `notify()`, `adminLog()`, `uploadedFile()` (ตรวจขนาด + signature ไฟล์), ฟังก์ชันวันที่ (Asia/Bangkok)
- งานที่ต้องสำเร็จพร้อมกันหลายคำสั่ง (เช่น การกระทำของแอดมิน + `admin_logs`, เปลี่ยนสถานะ + แจ้งเตือน) ให้ทำใน function node ด้วย `await sj.tx(async (db) => { ... })` แล้ว `throw sj.httpError(status, code, message)` เมื่อผิดเงื่อนไข (rollback อัตโนมัติ) ส่วน query ธรรมดาใช้ mysql node ตามเดิม
- subflow กลาง: `auth-check` (ตรวจ JWT + role), `session-user` (ข้อมูลผู้ใช้ที่ส่งให้ frontend), `error-response` (รูปแบบ error เดียวทั้งระบบ)
- รูปแบบใน function node: อ่าน input จาก `msg.req.body` / `msg.req.query`, เก็บค่าระหว่างทางใน `msg.ctx`, ถ้าผิดให้เรียก `fail(status, code, message)` แล้ว catch node ของแท็บจะตอบ error ให้
- ทุก query ใช้ `?` เสมอ และใส่เงื่อนไขความเป็นเจ้าของ (เช่น `WHERE user_id = ?` จาก `msg.user.id`) ใน query
- `backend/uploads/public` เปิดสาธารณะที่ `/uploads/...` ส่วน `backend/uploads/private` ไม่เปิดเลย (เอกสารยืนยันร้าน)

## Google Sign-In (เว็บ)

1. สร้าง OAuth Client ID ประเภท **Web application** ใน Google Cloud Console
2. Authorized JavaScript origins: `http://localhost:4200` และ `http://localhost:8100`
3. ใส่ Client ID ทั้งสองที่: `GOOGLE_CLIENT_ID` ใน `.env` (แล้ว `docker compose up -d`) และ `googleClientId` ใน `frontend/src/environments/environment.ts`

ถ้ายังไม่ได้ตั้งค่า ปุ่ม Google จะไม่แสดง และ API ตอบ 503 `GOOGLE_NOT_CONFIGURED`

## ทดสอบ

```bash
bash tests/api/run-all.sh       # รันทุกชุดด้านล่าง
bash tests/api/auth.sh          # Phase 1: auth / onboarding / upload / geo (ต้องเปิด docker ไว้)
bash tests/api/shop.sh          # Phase 2: โปรไฟล์ร้าน / เอกสารยืนยัน / แอดมินยืนยัน-ปฏิเสธ / audit log
bash tests/api/jobs.sh          # Phase 3: โพสต์ / แก้ไข / ปิด / ต่ออายุประกาศ / ปิดอัตโนมัติ
bash tests/api/search.sh        # Phase 4: ค้นหา / ตัวกรอง / pagination / บันทึกงาน
bash tests/api/applications.sh  # Phase 5: สมัคร / ยกเลิก / รับ / ปฏิเสธ / ช่องทางติดต่อ
bash tests/api/notifications.sh # Phase 6: แจ้งเตือน
bash tests/api/phase7.sh        # Phase 7: งานเสร็จ / รีวิว / รายงาน / แอดมิน (ผู้ใช้ ประกาศ รายงาน หมวดหมู่)
cd frontend && npx ng test --watch=false && npx ng lint
```
