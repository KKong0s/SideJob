# SideJob

แอปหางานพาร์ทไทม์ในประเทศไทย: Ionic + Angular / Node-RED / MySQL
ข้อกำหนดของโปรเจกต์อยู่ใน `../CLAUDE.md` ส่วน API อยู่ใน `docs/api.md`

## เริ่มรันในเครื่อง

ต้องมี Docker Desktop และ Node.js 24

### แบบง่าย (Windows): ดับเบิลคลิก

- **`start.bat`** เปิดทุกอย่างให้เอง:
  1. เปิด Docker Desktop ถ้ายังไม่เปิด
  2. รัน `docker compose up -d` แล้วรอจน API พร้อม
  3. รัน `npm install` เฉพาะตอนที่ยังไม่เคยติดตั้ง หรือ `package-lock.json` เปลี่ยน
  4. เปิดหน้าต่าง "SideJob Frontend" (`npm start`) แล้วเปิด http://localhost:4200 ให้อัตโนมัติ
  - ถ้ามีส่วนไหนทำงานอยู่แล้วจะข้ามไป รันซ้ำได้
  - ต้องเปิดหน้าต่าง "SideJob Frontend" ทิ้งไว้ระหว่างใช้งาน
- **`stop.bat`** ปิดเว็บที่พอร์ต 4200 และหยุด container ของ SideJob (ข้อมูลใน MySQL ไม่หาย และไม่แตะ Docker stack อื่นในเครื่อง)
- ครั้งแรกต้องมีไฟล์ `.env` ก่อน (ดูข้อ 1 ด้านล่าง)
- container ตั้งค่า `restart: unless-stopped` ไว้ ถ้าไม่ได้สั่ง `stop.bat` แค่เปิด Docker Desktop container ก่อนหน้าก็ทำงานต่อเอง

### แบบสั่งเอง

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

- `npm start` / `npm run build` เรียก Angular CLI ผ่าน `frontend/scripts/ng.mjs` ซึ่งใช้ Sass แบบ JavaScript
  เพราะ Windows **Smart App Control** บล็อก `dart.exe` ของ Sass ตัวปกติ (error `spawn UNKNOWN`)
- **อัปเดตจากเวอร์ชันก่อน** (ฐานข้อมูลเดิม ข้อมูลไม่หาย): `bash database/migrate.sh` แล้ว `docker compose restart nodered`

| บริการ | URL |
|---|---|
| Node-RED editor | http://localhost:1881 (login ตาม `NODE_RED_ADMIN_USER` / รหัสที่ใช้สร้าง hash) |
| API | http://localhost:1881/api/health |
| แชท (WebSocket) | ws://localhost:1881/ws/chat |
| MySQL | `localhost:3307` (user ของแอป: `DB_USER`) |
| phpMyAdmin (dev เท่านั้น) | http://localhost:8081 — login ด้วย `DB_USER` (สิทธิ์เท่าแอป) หรือ `root` |

ตั้งพอร์ตเป็น 3307 / 1881 / 8081 เพื่อไม่ให้ชนกับ MySQL / Node-RED ตัวอื่นในเครื่อง ถ้าจะเปลี่ยนให้แก้ใน `.env` และ `frontend/src/environments/environment.ts` (ทั้ง `apiUrl`, `uploadsUrl` และ `wsUrl`)

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
| `seeker02@demo.sidejob.local` | มาลี สวยงาม | กรุงเทพฯ | ถูกรับเข้าทำงาน · มีแชทกับร้านที่ยังไม่อ่าน |
| `seeker03@demo.sidejob.local` | อนุชา คนขยัน | ขอนแก่น / โคราช | งานเสร็จ รีวิวร้านได้ |
| `seeker04@demo.sidejob.local` | ปิยะนุช ล้านนา | เชียงใหม่ | ถูกรับ + รอพิจารณา |
| `seeker05@demo.sidejob.local` | ธนากร ทะเลใส | ภูเก็ต / ชลบุรี | ถูกรับเข้าทำงาน |
| `seeker06@demo.sidejob.local` | กมลวรรณ เก่งคณิต | สงขลา | รอพิจารณา |

นอกจากนี้มีร้านค้าอีก **100 บัญชี** `store001`–`store100@demo.sidejob.local` (รหัส `Demo@1234` เหมือนกัน)
กระจาย**ครบทั้ง 77 จังหวัด** (สุ่มอำเภอและประเภทร้าน เช่น คาเฟ่ ร้านอาหาร มินิมาร์ท ขนส่ง อีเวนต์ คลีนนิ่ง กวดวิชา รีสอร์ท):
ยืนยันแล้ว 85 ร้าน (มีประกาศเปิดรับ 1–3 งาน และทุกจังหวัดมีอย่างน้อย 1 ร้าน), รอยืนยัน 8, ไม่ผ่าน 4, ยังไม่ส่งเอกสาร 3
ข้อมูลสุ่มแบบกำหนด seed จึงได้ชุดเดิมทุกครั้งที่รัน (แก้ได้ที่ `database/demo/bulk-shops.js`)

แอดมิน: `admin@sidejob.local` / `Admin@1234` (มีร้านรอยืนยัน 10 ร้าน และรายงานรอจัดการ 2 รายการ)

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

## แชร์ลิงก์ให้คนอื่นดูเว็บ (ชั่วคราว)

ดับเบิลคลิก **`share.bat`** (ต้องติดตั้ง `cloudflared` ก่อน: `winget install --id Cloudflare.cloudflared -e`)

1. เช็กว่า API เปิดอยู่ (ถ้า Docker ยังไม่เปิด ให้รัน `start.bat` ก่อน)
2. เปิดเว็บโหมด share ที่พอร์ต 4300 ในหน้าต่าง "SideJob Share Web" (`npm run share`)
3. เปิด Cloudflare Quick Tunnel แล้วแสดงลิงก์ `https://….trycloudflare.com` ในกรอบ ให้ copy ไปส่ง

- ลิงก์ใช้ได้**เฉพาะตอนหน้าต่าง share.bat เปิดอยู่** กด Ctrl+C หรือปิดหน้าต่าง ลิงก์ก็ใช้ไม่ได้ทันที (และหน้าต่างเว็บโหมด share จะปิดตาม) เปิดใหม่ทุกครั้งจะได้ลิงก์ใหม่
- ผ่านลิงก์เข้าได้แค่ตัวเว็บ, `/api`, `/uploads` และแชท (`frontend/proxy.share.mjs`) หน้าแก้ไข flow ของ Node-RED และ phpMyAdmin เข้าไม่ได้
- คนดูล็อกอินด้วยอีเมล/รหัสผ่านได้ (รวมบัญชีตัวอย่าง) ปุ่ม Google ถูกซ่อน เพราะ Google ยอมเฉพาะ origin ที่ลงทะเบียนไว้ แต่ลิงก์เปลี่ยนทุกครั้ง
- ⚠️ ใครได้ลิงก์ก็เข้าได้ รวมถึงล็อกอินแอดมินด้วยรหัส dev ในไฟล์นี้ ส่งให้เฉพาะคนที่ไว้ใจ หรือเปลี่ยนรหัสแอดมินก่อน
- เว็บโหมด share ใช้ `environment.share.ts` (URL แบบ relative) ไม่ต้องแก้ backend หรือ `CORS_ORIGINS`: proxy แก้ Origin ของ WebSocket เป็น `http://localhost:4200` ให้ผ่านการตรวจ origin เดิม

## แอป Android (Capacitor)

App ID `th.sidejob.app` · ส่วนแอดมินไม่มีในแอป (แอดมินล็อกอินในแอปจะขึ้น "บัญชีแอดมินใช้งานผ่านเว็บเท่านั้น")

**ครั้งแรก**
1. ติดตั้ง Android Studio แล้วทำ Setup Wizard แบบ Standard (ได้ Android SDK) และสร้าง emulator ใน Device Manager แบบที่มี **Google Play** แล้วเพิ่มบัญชี Google ในเครื่อง emulator
2. Google Cloud Console → Clients → Create client → ประเภท **Android**: package `th.sidejob.app` + SHA-1 ของ debug key
   (`keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android`)
   ไม่ต้องเอา Client ID ของ Android มาใส่ที่ไหน แอปยังใช้ Web Client ID เดิม (`environment.android.ts`) ส่วน Android client มีไว้ให้ Google ยอมรับแอปนี้
3. เปิด backend ตามปกติ (`docker compose up -d`)

**build และรัน**
```bash
cd frontend
npm run android        # build (configuration android) + cap sync + เปิด Android Studio แล้วกด Run
npm run build:android  # build + sync อย่างเดียว (หลังแก้โค้ดเว็บ)
```
- `environment.android.ts` ชี้ไปที่ `http://10.0.2.2:1881` (= เครื่องนี้เมื่อมองจาก emulator) ถ้าใช้มือถือจริงให้เปลี่ยนเป็น IP ของเครื่องในวง LAN
- debug build: หน้าแอปเป็น `http://localhost` (`androidScheme`) และเปิด cleartext เฉพาะ debug (`android/app/src/debug/AndroidManifest.xml`) เพื่อเรียก API / รูป / WebSocket แบบ http ได้ ต้องมี `http://localhost` ใน `CORS_ORIGINS` ตอนทำ release ให้ใช้ API แบบ https แล้ว build ด้วย `CAP_RELEASE=1`
- build ด้วย Gradle จาก command line: ตั้ง `JAVA_HOME` (JDK 21 หรือ JBR ของ Android Studio) และ `ANDROID_HOME` แล้ว `cd frontend/android && gradlew assembleDebug`
- ไอคอน / splash: ต้นฉบับอยู่ใน `frontend/assets/` (สร้างไฟล์ทุกขนาดใน `android/app/src/main/res` แล้ว)
- ในแอป: Google Sign-In ใช้หน้าเลือกบัญชีของ Android (plugin `@capgo/capacitor-social-login`) และปุ่มเพิ่มรูปให้เลือก "ถ่ายรูป" หรือ "เลือกจากอัลบั้ม" (Capacitor Camera) เอกสารยืนยันร้าน (PDF) ยังใช้ตัวเลือกไฟล์

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
bash tests/api/chat.sh          # แชท: REST + WebSocket
cd frontend && npx ng test --watch=false && npx ng lint
```
