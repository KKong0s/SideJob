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

## ฐานข้อมูล

- สคริปต์ใน `database/` รันอัตโนมัติ **ครั้งแรกที่สร้าง volume** เท่านั้น ตามลำดับ: `schema.sql` → `thai-geo/geo.sql` → `seed.sql` → `create-app-user.sh`
- สร้างฐานข้อมูลใหม่ทั้งหมด (ข้อมูลเดิมหาย): `docker compose down -v && docker compose up -d`
- ข้อมูลจังหวัด/อำเภอมาจาก [kongvut/thai-province-data](https://github.com/kongvut/thai-province-data) (MIT) จัดเป็น 4 ภาค ถ้าจะสร้าง `geo.sql` ใหม่ให้รัน `node database/thai-geo/build-geo-sql.js`
- user ของแอป (`DB_USER`) ได้สิทธิ์แยกเป็นรายตาราง: ตารางภูมิศาสตร์อ่านได้อย่างเดียว ส่วน `admin_logs` ได้แค่ SELECT/INSERT
  **ถ้าเพิ่มตารางใหม่ ต้อง GRANT ให้ user นี้ด้วย** (ใส่ใน migration ของตารางนั้น)

## Node-RED

- `backend/` ถูก mount เป็น user dir (`/data`) ของ Node-RED ดังนั้นการแก้ flow ใน editor จะบันทึกลง `backend/flows.json` โดยตรง
- `backend/flows_cred.json` ถูก commit เข้า Git และไม่เข้ารหัส **ให้ใส่ได้เฉพาะ `${ENV_VAR}` เท่านั้น** ห้ามพิมพ์รหัสผ่านจริงลงช่อง credential ใน editor
- ไลบรารีที่ใช้ใน function node ได้: `global.get('bcrypt')`, `global.get('jwt')`, `global.get('googleAuth')`, `global.get('crypto')`
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
bash tests/api/auth.sh          # API: auth / onboarding / upload / geo (ต้องเปิด docker ไว้)
cd frontend && npx ng test --watch=false && npx ng lint
```
