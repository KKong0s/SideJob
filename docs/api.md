# SideJob API

Base URL (local dev): `http://localhost:1881/api`

## Conventions

- Request/response bodies are JSON (`Content-Type: application/json`), except file uploads (`multipart/form-data`).
- Authenticated endpoints need `Authorization: Bearer <JWT>`. The token is valid for `JWT_EXPIRES_IN` (default 7 days).
  Every authenticated request re-reads the user from the database, so a role change or suspension applies immediately.
- Times are `+07:00` (Asia/Bangkok), formatted `YYYY-MM-DD HH:mm:ss`; dates are `YYYY-MM-DD`.
- List endpoints take `?page=1&pageSize=20` (default 20) and return:

  ```json
  { "items": [], "page": 1, "pageSize": 20, "hasNext": false }
  ```

- Uploaded public files are served from `http://localhost:1881/uploads/<path>`; the API returns `<path>` (e.g. `avatars/abc.jpg`).

### Error format

Every error uses the same body:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "ข้อความภาษาไทยสำหรับแสดงผู้ใช้", "details": {} } }
```

`details` is only present for some codes (see `GOOGLE_LINK_REQUIRED`).

| HTTP | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid input |
| 400 | `UNDERAGE` | Seeker is younger than 18 |
| 401 | `UNAUTHORIZED` | Missing / invalid / expired token |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 401 | `GOOGLE_TOKEN_INVALID`, `LINK_TOKEN_INVALID` | Google token or link token rejected |
| 403 | `FORBIDDEN` | Role not allowed for this endpoint |
| 403 | `ACCOUNT_SUSPENDED` | Account suspended by an admin |
| 403 | `PROFILE_INCOMPLETE` | Endpoint requires finished onboarding |
| 403 | `ADMIN_PASSWORD_ONLY` | Admin tried Google Sign-In |
| 404 | `NOT_FOUND` | Resource does not exist (or caller may not see it) |
| 409 | `EMAIL_TAKEN`, `ROLE_ALREADY_SET`, `PROFILE_REQUIRED`, `GOOGLE_LINK_REQUIRED`, `GOOGLE_ACCOUNT_CONFLICT`, `CONFLICT` | State conflict / duplicate |
| 409 | `ALREADY_VERIFIED` | Shop tried to upload a verification document after being verified |
| 409 | `INVALID_STATE` | Action not allowed in the current status (e.g. verifying a shop that is not pending) |
| 413 | `FILE_TOO_LARGE` | Upload over 5 MB |
| 415 | `UNSUPPORTED_FILE_TYPE` | Upload type not allowed (images: JPG / PNG, verification documents: PDF / JPG / PNG; checked by file signature) |
| 503 | `GOOGLE_NOT_CONFIGURED` | `GOOGLE_CLIENT_ID` is not set on the server |
| 500 | `INTERNAL_ERROR` | Unexpected server error (details only in the Node-RED log) |

### Session user object

Returned as `user` by the auth endpoints. Never contains the password hash.

```json
{
  "id": 12,
  "email": "somchai@example.com",
  "role": "seeker",
  "status": "active",
  "hasPassword": true,
  "hasGoogle": false,
  "profileCompleted": false,
  "onboardingStep": "terms",
  "displayName": "สมชาย ใจดี",
  "avatarPath": "avatars/3f1c...e9.jpg",
  "shop": null
}
```

- `role`: `seeker` | `shop` | `admin` | `null` (not chosen yet)
- `onboardingStep`: `role` → `profile` → `terms` → `done` (admin is always `done`)
- `displayName`: seeker full name or shop name
- `shop` (shop owners): `{ "id": 3, "name": "ร้านกาแฟ", "verifyStatus": "unsubmitted" | "pending" | "verified" | "rejected" }`

## System

### `GET /api/health`

- **Role:** public
- **Response 200:** `{ "status": "ok", "database": "connected", "provinces": 77, "time": "2026-10-05 18:45:49" }`
- **Response 500:** database unreachable

## Geo

### `GET /api/geo`

- **Role:** public. Sent with `Cache-Control: public, max-age=86400`; the app caches it on the device.
- **Response 200**

  ```json
  {
    "regions":   [{ "id": 1, "nameTh": "ภาคเหนือ", "nameEn": "Northern" }],
    "provinces": [{ "id": 1, "regionId": 2, "nameTh": "กรุงเทพมหานคร", "nameEn": "Bangkok" }],
    "districts": [{ "id": 1001, "provinceId": 1, "nameTh": "พระนคร", "nameEn": "Phra Nakhon" }]
  }
  ```

  4 regions, 77 provinces, 930 districts. Bangkok (`provinceId` 1) districts are "เขต", all others "อำเภอ".

## Auth

### `POST /api/auth/register`

- **Role:** public
- **Request:** `{ "email": "somchai@example.com", "password": "Passw0rd" }`
  - email: valid format, max 255, stored lower-case
  - password: 8–72 characters with at least one letter and one digit (bcrypt)
- **Response 201:** `{ "token": "<JWT>", "user": <session user> }` (`onboardingStep: "role"`)
- **Errors:** 400 `VALIDATION_ERROR`, 409 `EMAIL_TAKEN`

### `POST /api/auth/login`

- **Role:** public (works for all roles, including admin)
- **Request:** `{ "email": "...", "password": "..." }`
- **Response 200:** `{ "token": "<JWT>", "user": <session user> }`
- **Errors:** 400 `VALIDATION_ERROR`, 401 `INVALID_CREDENTIALS` (also for Google-only accounts), 403 `ACCOUNT_SUSPENDED`

### `POST /api/auth/google`

- **Role:** public (not for admin)
- **Request:** `{ "idToken": "<Google ID token from Google Identity Services>" }`
- The server verifies the token with `google-auth-library` (audience = `GOOGLE_CLIENT_ID`, `email_verified` must be true) and uses only the verified `sub` / `email`.
- **Response 200** (existing Google account) or **201** (new account): `{ "token": "<JWT>", "user": <session user> }`
- **Response 409 `GOOGLE_LINK_REQUIRED`:** the email already belongs to an email/password account. No account is created.

  ```json
  { "error": { "code": "GOOGLE_LINK_REQUIRED", "message": "...", "details": { "linkToken": "<10-minute token>", "email": "somchai@example.com" } } }
  ```

  Ask the user for that account's password and call `/api/auth/google/link`.
- **Errors:** 400 `VALIDATION_ERROR`, 401 `GOOGLE_TOKEN_INVALID`, 403 `ADMIN_PASSWORD_ONLY` / `ACCOUNT_SUSPENDED`, 409 `GOOGLE_ACCOUNT_CONFLICT`, 503 `GOOGLE_NOT_CONFIGURED`

### `POST /api/auth/google/link`

- **Role:** public
- **Request:** `{ "linkToken": "<from GOOGLE_LINK_REQUIRED>", "password": "<existing account password>" }`
- Links the Google account to the existing account, then logs in.
- **Response 200:** `{ "token": "<JWT>", "user": <session user> }` (`hasGoogle: true`)
- **Errors:** 400 `VALIDATION_ERROR`, 401 `LINK_TOKEN_INVALID` / `INVALID_CREDENTIALS`, 403 `ACCOUNT_SUSPENDED`, 409 `GOOGLE_ACCOUNT_CONFLICT`

### `GET /api/auth/me`

- **Role:** any logged-in user
- **Response 200:** `{ "user": <session user> }`
- **Errors:** 401 `UNAUTHORIZED`, 403 `ACCOUNT_SUSPENDED`

### `POST /api/auth/onboarding/role`

- **Role:** logged-in user whose role is still `null`
- **Request:** `{ "role": "seeker" | "shop" }` (cannot be changed afterwards)
- **Response 200:** `{ "user": <session user> }` (`onboardingStep: "profile"`)
- **Errors:** 400 `VALIDATION_ERROR`, 409 `ROLE_ALREADY_SET`

### `PUT /api/auth/onboarding/profile`

- **Role:** seeker, shop. Creates or replaces the caller's own profile.
- **Request (seeker)**

  ```json
  {
    "fullName": "สมชาย ใจดี",
    "birthDate": "2000-02-29",
    "phone": "081-234-5678",
    "lineId": "somchai.j",
    "skills": "ชงกาแฟ",
    "bio": "...",
    "areas": [
      { "provinceId": 1, "districtId": 1001 },
      { "provinceId": 50, "districtId": null }
    ]
  }
  ```

  - fullName required (max 150); birthDate required, age 18+
  - phone required, Thai format `0` + 8–9 digits (spaces / dashes are removed)
  - lineId optional (`@?[A-Za-z0-9._-]{1,50}`); skills max 500; bio max 1000
  - areas: 1–30 items; `districtId: null` = whole province (and replaces that province's districts); districts must belong to the province; the saved list replaces the previous one
- **Request (shop)**

  ```json
  {
    "shopName": "ร้านกาแฟ",
    "address": "1 ถนนนิมมานเหมินท์",
    "provinceId": 38,
    "districtId": 5001,
    "phone": "053123456",
    "lineId": "@cafe",
    "description": "..."
  }
  ```

  - shopName (max 150), address (max 500), provinceId, districtId, phone required; district must belong to the province
  - Creates the shop with `verifyStatus: "unsubmitted"`
- **Response 200:** `{ "user": <session user> }` (`onboardingStep: "terms"` on first save)
- **Errors:** 400 `VALIDATION_ERROR` / `UNDERAGE`, 403 `FORBIDDEN`

### `POST /api/auth/onboarding/accept-terms`

- **Role:** seeker, shop
- **Request:** `{ "acceptTerms": true, "acceptPdpa": true }`
- Saves the PDPA consent time and completes onboarding (requires the profile to exist).
- **Response 200:** `{ "user": <session user> }` (`onboardingStep: "done"`, `profileCompleted: true`)
- **Errors:** 400 `VALIDATION_ERROR`, 409 `PROFILE_INCOMPLETE`

## Seeker

### `POST /api/seeker/profile/avatar`

- **Role:** seeker (profile must exist)
- **Request:** `multipart/form-data` with one file in field `file`; JPG or PNG (checked by file signature), max 5 MB
- Saved under a random name in `uploads/public/avatars/`; the previous avatar file is deleted.
- **Response 200:** `{ "avatarPath": "avatars/3f1c...e9.jpg" }`
- **Errors:** 400 `VALIDATION_ERROR`, 403 `FORBIDDEN`, 409 `PROFILE_REQUIRED`, 413 `FILE_TOO_LARGE`, 415 `UNSUPPORTED_FILE_TYPE`

## Shop

All `/api/shop/*` endpoints require role **shop** with onboarding completed (`403 PROFILE_INCOMPLETE` otherwise).
Every query is scoped to the caller's own shop (`shops.owner_user_id = <JWT user>`).

### Shop object (owner / admin view)

```json
{
  "id": 3,
  "name": "ร้านกาแฟ",
  "description": "...",
  "address": "1 ถนนนิมมานเหมินท์",
  "provinceId": 38, "districtId": 5001,
  "provinceName": "เชียงใหม่", "districtName": "เมืองเชียงใหม่",
  "phone": "053123456", "lineId": "@cafe",
  "imagePath": "shops/9b2e...41.jpg",
  "verifyStatus": "pending",
  "rejectReason": null,
  "hasVerifyDoc": true,
  "verifySubmittedAt": "2026-10-06 10:15:00",
  "verifiedAt": null,
  "createdAt": "2026-10-05 18:00:00"
}
```

`verifyStatus`: `unsubmitted` (no document yet) → `pending` → `verified` | `rejected` (can re-submit → `pending`).
Only `verified` shops can post jobs.

### `GET /api/shop/profile`

- **Role:** shop
- **Response 200:** `{ "shop": <shop object> }`
- **Errors:** 409 `PROFILE_REQUIRED` (no shop yet)

### `PUT /api/shop/profile`

- **Role:** shop
- **Request:** same body and rules as the shop variant of `PUT /api/auth/onboarding/profile`
  (`shopName`, `address`, `provinceId`, `districtId`, `phone`, `lineId?`, `description?`)
- Updates general details only. The verification status is **not** reset.
- **Response 200:** `{ "shop": <shop object> }`
- **Errors:** 400 `VALIDATION_ERROR`, 409 `PROFILE_REQUIRED`

### `POST /api/shop/profile/image`

- **Role:** shop
- **Request:** `multipart/form-data`, one file in field `file`: JPG / PNG, max 5 MB
- Saved under a random name in `uploads/public/shops/` (publicly readable); the previous image is deleted.
- **Response 200:** `{ "imagePath": "shops/9b2e...41.jpg" }`
- **Errors:** 400, 409 `PROFILE_REQUIRED`, 413 `FILE_TOO_LARGE`, 415 `UNSUPPORTED_FILE_TYPE`

### `POST /api/shop/verification`

- **Role:** shop whose status is `unsubmitted`, `pending` or `rejected`
- **Request:** `multipart/form-data`, one file in field `file`: PDF / JPG / PNG, max 5 MB
- Saved under a random name in `uploads/private/verify/` (**never** served statically). Sets the status to `pending`,
  clears the reject reason and replaces (deletes) any previous document.
- **Response 200:** `{ "verifyStatus": "pending" }`
- **Errors:** 400, 409 `PROFILE_REQUIRED` / `ALREADY_VERIFIED`, 413, 415

## Admin

All `/api/admin/*` endpoints require role **admin**. Admin actions that change data write an `admin_logs` row in the
same database transaction: if the log cannot be written the action is rolled back.

### `GET /api/admin/stats`

- **Response 200:** `{ "seekers": 120, "shops": 30, "pendingShops": 4, "openJobs": 85, "applications": 410, "openReports": 2 }`

### `GET /api/admin/shops`

- **Query:** `status` = `pending` (default) | `verified` | `rejected` | `unsubmitted` | `all`; `q` (shop name or owner email, contains); `page`, `pageSize`
- Order: `pending` → oldest submission first (review queue); other statuses → newest shop first.
- **Response 200:** page of

  ```json
  { "id": 3, "name": "ร้านกาแฟ", "imagePath": null, "verifyStatus": "pending", "provinceName": "เชียงใหม่",
    "districtName": "เมืองเชียงใหม่", "ownerEmail": "owner@example.com", "ownerStatus": "active",
    "verifySubmittedAt": "2026-10-06 10:15:00", "createdAt": "2026-10-05 18:00:00" }
  ```

- **Errors:** 400 `VALIDATION_ERROR` (unknown status)

### `GET /api/admin/shops/:id`

- **Response 200:** `{ "shop": <shop object> + { "verifyDocType": "pdf" | "jpg" | "png" | null, "owner": { "id", "email", "status", "createdAt" }, "jobCount": 5, "openJobCount": 2 } }`
- **Errors:** 404 `NOT_FOUND`

### `GET /api/admin/shops/:id/document`

- Streams the private verification document with its `Content-Type` (`application/pdf`, `image/jpeg`, `image/png`),
  `Cache-Control: private, no-store`. The frontend fetches it as a blob with the admin JWT.
- **Errors:** 404 `NOT_FOUND` (no document)

### `POST /api/admin/shops/:id/verify`

- **Request:** none
- Shop must be `pending`. Sets `verified`, writes log `shop.verify`, notifies the owner (`shop.verified`, link `/shop/profile`). One transaction.
- **Response 200:** `{ "id": 3, "verifyStatus": "verified" }`
- **Errors:** 404 `NOT_FOUND`, 409 `INVALID_STATE`

### `POST /api/admin/shops/:id/reject`

- **Request:** `{ "reason": "เอกสารไม่ชัด" }` (required, 1–500 characters; shown to the shop)
- Shop must be `pending`. Sets `rejected` + reason, writes log `shop.reject` (with the reason), notifies the owner (`shop.rejected`). One transaction.
- **Response 200:** `{ "id": 3, "verifyStatus": "rejected", "rejectReason": "เอกสารไม่ชัด" }`
- **Errors:** 400 `VALIDATION_ERROR`, 404 `NOT_FOUND`, 409 `INVALID_STATE`

### `GET /api/admin/logs`

- Read-only. There is no API to change or delete log entries (the DB user only has SELECT / INSERT on `admin_logs`).
- **Query:** `adminId`, `action` (e.g. `shop.verify`), `targetType` (e.g. `shop`), `from`, `to` (`YYYY-MM-DD`, inclusive), `page`, `pageSize`
- **Response 200:** page of, newest first:

  ```json
  { "id": 9, "admin": { "id": 1, "email": "admin@sidejob.local" }, "action": "shop.reject",
    "targetType": "shop", "targetId": 3, "reason": "เอกสารไม่ชัด", "createdAt": "2026-10-06 10:20:00" }
  ```

- **Errors:** 400 `VALIDATION_ERROR` (bad id / date)

### `GET /api/admin/logs/filters`

- **Response 200:** `{ "admins": [{ "id": 1, "email": "admin@sidejob.local" }], "actions": ["shop.reject", "shop.verify"], "targetTypes": ["shop"] }`

Log actions: `shop.verify`, `shop.reject` (Phase 2); `user.suspend`, `user.unsuspend`, `job.hide`, `report.resolve`, `report.dismiss`, `review.hide` (Phase 7).
