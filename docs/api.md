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
| 403 | `AGE_REQUIREMENT` | Seeker is younger than the job's minimum age |
| 403 | `SHOP_NOT_VERIFIED` | Shop must be verified to post / renew jobs |
| 403 | `ADMIN_PASSWORD_ONLY` | Admin tried Google Sign-In |
| 404 | `NOT_FOUND` | Resource does not exist (or caller may not see it) |
| 409 | `EMAIL_TAKEN`, `ROLE_ALREADY_SET`, `PROFILE_REQUIRED`, `GOOGLE_LINK_REQUIRED`, `GOOGLE_ACCOUNT_CONFLICT`, `CONFLICT` | State conflict / duplicate |
| 409 | `ALREADY_VERIFIED` | Shop tried to upload a verification document after being verified |
| 409 | `JOB_CLOSED`, `ALREADY_APPLIED` | Applying to a job that is not accepting applications / applying twice |
| 409 | `JOB_LOCKED` | Job has applications, so wage / schedule cannot change |
| 409 | `IMAGE_LIMIT` | Job already has 5 sample photos |
| 409 | `JOB_HIDDEN` | Job was hidden by an admin and cannot be edited / renewed |
| 409 | `RENEW_LIMIT` | Job already expires 60 days ahead |
| 409 | `REVIEW_NOT_ALLOWED`, `REVIEW_WINDOW_CLOSED`, `ALREADY_REVIEWED` | Review rules (completed, 14 days, once per side) |
| 409 | `CHAT_CLOSED` | Chat is read-only (application cancelled or an account suspended) |
| 409 | `ALREADY_REPORTED` | Same user reported the same target before |
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
  - skills max 500; bio max 1000
  - areas: 1–30 items; `districtId: null` = whole province (and replaces that province's districts); districts must belong to the province; the saved list replaces the previous one
- **Request (shop)**

  ```json
  {
    "shopName": "ร้านกาแฟ",
    "address": "1 ถนนนิมมานเหมินท์",
    "provinceId": 38,
    "districtId": 5001,
    "phone": "053123456",
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

### `GET /api/seeker/profile`

- **Role:** seeker
- **Response 200**

  ```json
  {
    "profile": {
      "fullName": "สมชาย ใจดี", "birthDate": "2000-02-29", "phone": "0812345678",
      "skills": "ชงกาแฟ", "bio": "...", "avatarPath": "avatars/3f1c...e9.jpg",
      "areas": [
        { "provinceId": 38, "districtId": null, "provinceName": "เชียงใหม่", "districtName": null },
        { "provinceId": 1, "districtId": 1001, "provinceName": "กรุงเทพมหานคร", "districtName": "พระนคร" }
      ]
    }
  }
  ```

- To change the profile (including areas of interest) call `PUT /api/auth/onboarding/profile` again; it replaces the profile and the area list.
- **Errors:** 409 `PROFILE_REQUIRED`

### `GET /api/seeker/saved-jobs`

- **Query:** `page`, `pageSize`
- **Response 200:** page of public job objects + `"savedAt": "2026-10-06 12:00:00"`, most recently saved first.
  Closed / expired jobs stay in the list with `acceptingApplications: false`; hidden jobs are left out.

### `PUT /api/seeker/saved-jobs/:jobId`

- Saves a job (saving again does nothing). The job must exist and not be hidden.
- **Response 200:** `{ "saved": true }`
- **Errors:** 404 `NOT_FOUND`

### `DELETE /api/seeker/saved-jobs/:jobId`

- **Response 200:** `{ "saved": false }` (also when it was not saved)

### `GET /api/seeker/jobs/:id/status`

- The caller's relation to a job, for the job detail page.
- **Response 200:** `{ "saved": true, "application": { "id": 7, "status": "pending" } }` (`application: null` when not applied)

### Application (seeker view)

```json
{
  "id": 7,
  "status": "accepted",
  "appliedAt": "2026-10-06 12:00:00",
  "decidedAt": "2026-10-06 15:00:00",
  "cancelledAt": null,
  "completedAt": null,
  "job": <public job object>,
  "contact": { "phone": "053123456" }
}
```

- `status`: `pending` → `accepted` → `completed`, or `rejected` / `cancelled`
- **`contact` (the shop's phone) is only filled when the status is `accepted` or `completed`**, and only the
  application's own seeker can read it (checked in the SQL `WHERE a.seeker_user_id = <JWT user>`). Otherwise `null`.

### `POST /api/seeker/jobs/:id/apply`

- **Role:** seeker with completed onboarding
- The job must accept applications (open, not expired, shop verified). The seeker must meet `minAge`.
- A `cancelled` application to the same job is reused (back to `pending`); any other existing application → 409.
- Notifies the shop owner (`application.new`, link `/shop/applicants/:applicationId`). One transaction.
- **Response 201:** `{ "application": { "id": 7, "status": "pending" } }`
- **Errors:** 403 `AGE_REQUIREMENT`, 404 `NOT_FOUND`, 409 `JOB_CLOSED` / `ALREADY_APPLIED`

### `POST /api/seeker/applications/:id/cancel`

- Own application in `pending` or `accepted`. Cancelling an accepted one notifies the shop (`application.cancelled`).
- **Response 200:** `{ "id": 7, "status": "cancelled" }`
- **Errors:** 404, 409 `INVALID_STATE`

### `GET /api/seeker/applications`

- **Query:** `status` (comma-separated, e.g. `pending,accepted`; empty / `all` = all), `page`, `pageSize`
- **Response 200:** page of applications (job without `description`), most recently updated first
- **Errors:** 400 `VALIDATION_ERROR`

### `GET /api/seeker/applications/:id`

- **Response 200:** `{ "application": <application, job with description> }`
- **Errors:** 404

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
  "phone": "053123456",
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
  (`shopName`, `address`, `provinceId`, `districtId`, `phone`, `description?`)
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

### Job object (owner view)

```json
{
  "id": 15,
  "title": "พนักงานเสิร์ฟ",
  "description": "...",
  "category": { "id": 1, "name": "ร้านอาหาร / คาเฟ่", "icon": "restaurant-outline" },
  "provinceId": 38, "districtId": 5001, "provinceName": "เชียงใหม่", "districtName": "เมืองเชียงใหม่",
  "wage": 60, "wageUnit": "hour",
  "scheduleType": "weekly",
  "startDate": null, "endDate": null,
  "workDays": ["sat", "sun"],
  "startTime": "09:00", "endTime": "17:00",
  "minAge": 20,
  "expiresOn": "2026-11-05",
  "status": "open",
  "createdAt": "2026-10-06 10:00:00", "updatedAt": "2026-10-06 10:00:00",
  "applicantCount": 3, "pendingCount": 1, "locked": true
}
```

- `wageUnit`: `hour` | `day` | `job`; `status`: `open` | `closed` | `hidden` (hidden = by an admin)
- `scheduleType: "dates"` uses `startDate` / `endDate`; `"weekly"` uses `workDays` (`mon` … `sun`).
  For `dates` jobs the server also stores the weekdays covered by the range in `workDays`, so the work-day search filter works for both shapes.
- `endTime` earlier than `startTime` = overnight shift.
- `applicantCount` excludes cancelled applications; `locked` = has pending / accepted / completed applications.
- A job stays open until the end of `expiresOn`; the Scheduled flow closes it at the next midnight.
- `images` (`[{ "id": 4, "path": "jobs/7c1d...a2.jpg" }]`, max 5, in upload order) is included by the single-job endpoints
  (`GET/POST/PUT /api/shop/jobs[/:id]` and `GET /api/jobs/:id`), not by list endpoints.

### Job input (create / update)

```json
{
  "title": "พนักงานเสิร์ฟ", "description": "...", "categoryId": 1,
  "provinceId": 38, "districtId": 5001,
  "wage": 60, "wageUnit": "hour",
  "scheduleType": "weekly", "workDays": ["sat", "sun"],
  "startDate": null, "endDate": null,
  "startTime": "09:00", "endTime": "17:00",
  "minAge": null,
  "expiresOn": "2026-11-05"
}
```

- title 1–150, description 1–5000, active category, district inside the province
- wage > 0 and ≤ 100,000 (2 decimals); times `HH:mm` and not equal
- `dates`: valid dates, `endDate ≥ startDate`, start not in the past (on update: only checked when the schedule changes), end within 1 year
- `weekly`: at least one weekday
- `minAge`: null or 18–60
- `expiresOn` (create only): tomorrow … today + 60 days, default today + 30

### `GET /api/shop/jobs`

- **Query:** `status` = `all` (default) | `open` | `closed` | `hidden`; `page`, `pageSize`
- **Response 200:** page of job objects (owner view), newest first

### `POST /api/shop/jobs`

- **Role:** shop, **verified**
- **Request:** job input
- **Response 201:** `{ "job": <job object> }`
- **Errors:** 400 `VALIDATION_ERROR`, 403 `SHOP_NOT_VERIFIED`

### `GET /api/shop/jobs/:id`

- Own job only (another shop's job → 404).
- **Response 200:** `{ "job": <job object> }`

### `PUT /api/shop/jobs/:id`

- **Request:** job input (`expiresOn` is ignored; use renew)
- If the job has applications, `wage`, `wageUnit`, `scheduleType`, dates, `workDays` and times must stay the same.
- **Response 200:** `{ "job": <job object> }`
- **Errors:** 400, 404, 409 `JOB_LOCKED` / `JOB_HIDDEN`

### `POST /api/shop/jobs/:id/images`

- **Role:** shop (own job, not hidden)
- **Request:** `multipart/form-data`, one file in field `file`: JPG / PNG, max 5 MB
- Optional sample photos, **max 5 per job**. Saved under a random name in `uploads/public/jobs/` (publicly readable).
- **Response 201:** `{ "image": { "id": 4, "path": "jobs/7c1d...a2.jpg" } }`
- **Errors:** 400, 404, 409 `IMAGE_LIMIT` / `JOB_HIDDEN`, 413 `FILE_TOO_LARGE`, 415 `UNSUPPORTED_FILE_TYPE`

### `DELETE /api/shop/jobs/:id/images/:imageId`

- Removes the photo row and its file.
- **Response 200:** `{ "deleted": true }`
- **Errors:** 404, 409 `JOB_HIDDEN`

### `POST /api/shop/jobs/:id/close`

- Job must be `open`. Sets `closed`; **pending applications are rejected** and each seeker gets an `application.rejected` notification. One transaction.
- **Response 200:** `{ "id": 15, "status": "closed", "rejectedApplications": 2 }`
- **Errors:** 404, 409 `INVALID_STATE`

### `POST /api/shop/jobs/:id/renew`

- New expiry = max(today, current expiry) + 30 days, capped at today + 60. Also reopens a `closed` job.
- **Response 200:** `{ "id": 15, "status": "open", "expiresOn": "2026-12-05" }`
- **Errors:** 403 `SHOP_NOT_VERIFIED`, 404, 409 `JOB_HIDDEN` / `RENEW_LIMIT`

### Applicant (shop view)

```json
{
  "id": 7,
  "status": "pending",
  "appliedAt": "2026-10-06 12:00:00", "decidedAt": null, "cancelledAt": null, "completedAt": null,
  "job": { "id": 15, "title": "พนักงานเสิร์ฟ", "status": "open" },
  "seeker": { "id": 12, "fullName": "สมชาย ใจดี", "age": 26, "avatarPath": "avatars/3f1c...e9.jpg", "skills": "ชงกาแฟ" },
  "contact": null
}
```

- The detail endpoint adds `seeker.bio`.
- **`contact` (the seeker's phone) is only filled when the status is `accepted` or `completed`**, and only for
  the shop that owns the job (`WHERE s.owner_user_id = <JWT user>`). The seeker's birth date is never sent, only the age.

### `GET /api/shop/applications`

- **Query:** `jobId` (one of the shop's jobs), `status` (comma-separated; default: all except `cancelled`), `page`, `pageSize`
- Order: pending first, then newest application.
- **Response 200:** page of applicants
- **Errors:** 400 `VALIDATION_ERROR`

### `GET /api/shop/applications/:id`

- **Response 200:** `{ "application": <applicant with seeker.bio> }`
- **Errors:** 404 (not the shop's job)

### `POST /api/shop/applications/:id/accept`

- `pending` → `accepted`; notifies the seeker (`application.accepted`, link `/seeker/applications/:id`). One transaction.
- **Response 200:** `{ "id": 7, "status": "accepted" }`
- **Errors:** 404, 409 `INVALID_STATE`

### `POST /api/shop/applications/:id/reject`

- `pending` → `rejected`; notifies the seeker (`application.rejected`). A rejected seeker cannot apply to the same job again.
- **Response 200:** `{ "id": 7, "status": "rejected" }`
- **Errors:** 404, 409 `INVALID_STATE`

### `GET /api/shop/dashboard`

- **Response 200**

  ```json
  {
    "verifyStatus": "verified",
    "openJobs": 2, "expiringJobs": 1, "pendingApplicants": 3, "acceptedApplicants": 1,
    "recentApplicants": [<applicant>]
  }
  ```

  `expiringJobs` = open jobs expiring within 3 days; `recentApplicants` = up to 5 latest pending applicants.

## Jobs (public)

### `GET /api/jobs/categories`

- **Role:** public (`Cache-Control: public, max-age=300`)
- **Response 200:** `{ "items": [{ "id": 1, "name": "ร้านอาหาร / คาเฟ่", "icon": "restaurant-outline" }] }` (active only, in display order)

### Public job object

Search results, saved jobs and the detail endpoint return the job fields above (without the owner-only counts) plus:

```json
{
  "acceptingApplications": true,
  "shop": { "id": 3, "name": "ร้านกาแฟ", "imagePath": "shops/9b2e...41.jpg" }
}
```

- The shop phone is **never** included here (they come only with an accepted application, Phase 5).
- List endpoints leave out `description`; the detail endpoint adds it and extends `shop` with
  `description`, `address`, `provinceId`, `provinceName`, `districtName`.
- A job is shown in search only when: `status = open`, `expiresOn ≥ today`, the work dates are not over (`dates` jobs),
  the shop is verified and its owner is not suspended.

### `GET /api/jobs`

- **Role:** public
- **Query** (all optional):

  | Param | Example | Meaning |
  |---|---|---|
  | `provinceId` | `38` | Province |
  | `districtIds` | `5001,5002` | Any of these districts (max 50) |
  | `categoryId` | `1` | Category |
  | `wageUnit` | `hour` | `hour` / `day` / `job` |
  | `wageMin`, `wageMax` | `50`, `100` | Wage range in baht (inclusive) |
  | `workDays` | `sat,sun` | Works on at least one of these days (`dates` jobs match the weekdays in their range) |
  | `q` | `กาแฟ` | Text in the job title or shop name |
  | `page`, `pageSize` | `1`, `20` | Pagination (default 20, max 50) |

- Order: newest first.
- **Response 200:** page of public job objects (no `description`)
- **Errors:** 400 `VALIDATION_ERROR` (bad id list / weekday / wage)

### `GET /api/jobs/:id`

- **Role:** public
- Closed / expired jobs are still returned with `acceptingApplications: false` (for saved jobs and applications).
  Hidden jobs and jobs of unverified or suspended shops → 404.
- **Response 200:** `{ "job": <public job object with description and shop details> }`
- **Errors:** 404 `NOT_FOUND`

### `GET /api/jobs/area-counts`

- **Role:** public (`Cache-Control: public, max-age=60`)
- Number of jobs visible in search, per province and per district (for the area picker).
- **Response 200:** `{ "total": 85, "provinces": { "1": 40, "38": 12 }, "districts": { "1001": 5, "5001": 7 } }` (areas without jobs are left out)


## Reviews and reports (Phase 7)

### Rules

- A review belongs to one application. Each side reviews **once**, only when the application is `completed`
  and within **14 days** of `completedAt`. Seekers review the shop (stored against the shop owner's user id),
  shops review the seeker.
- `rating` 1–5 (integer), `comment` optional, max 1000 characters.
- Hidden reviews (by an admin) are left out of every list and of the averages.
- `rating` objects everywhere: `{ "average": 4.3, "count": 12 }` (`average: null` when there are no visible reviews).
  Shown on the shop object (`GET /api/shop/profile`, admin shop detail), the public job detail (`job.shop.rating`),
  the seeker profile (`GET /api/seeker/profile`) and every applicant (`seeker.rating`).
- Application objects also carry `reviewDeadline` (completedAt + 14 days) and `reviewOpen`; the detail endpoints
  (`GET /api/seeker/applications/:id`, `GET /api/shop/applications/:id`) add `myReview` and `theirReview`
  (`{ rating, comment, createdAt }` or `null`).

### Review list item

```json
{ "id": 5, "rating": 4, "comment": "ร้านใจดี", "createdAt": "2026-10-06 18:00:00", "reviewerName": "สมชาย ใจดี", "jobTitle": "พนักงานเสิร์ฟ" }
```

### `POST /api/shop/applications/:id/complete`

- **Role:** shop (own job). `accepted` → `completed`, starts the 14-day review window, notifies the seeker (`application.completed`). One transaction.
- **Response 200:** `{ "id": 7, "status": "completed" }`
- **Errors:** 404, 409 `INVALID_STATE`

### `POST /api/seeker/applications/:id/review` · `POST /api/shop/applications/:id/review`

- **Role:** seeker (own application) / shop (own job)
- **Request:** `{ "rating": 4, "comment": "..." }`
- Notifies the other side (`review.received`). One transaction.
- **Response 201:** `{ "review": { "rating": 4, "comment": "..." } }`
- **Errors:** 400 `VALIDATION_ERROR`, 404, 409 `REVIEW_NOT_ALLOWED` (not completed) / `REVIEW_WINDOW_CLOSED` (after 14 days) / `ALREADY_REVIEWED`

### `GET /api/jobs/shops/:shopId/reviews`

- **Role:** public. Reviews received by a verified shop. **Query:** `page`, `pageSize`. **Response 200:** page of review items.

### `GET /api/seeker/reviews` · `GET /api/shop/reviews`

- Reviews the caller received. **Response 200:** page of review items.

### `GET /api/shop/seekers/:userId/reviews`

- **Role:** shop. Reviews a seeker received; only for seekers who applied to one of the shop's jobs (otherwise 404).

### `POST /api/reports`

- **Role:** seeker, shop
- **Request:** `{ "targetType": "job" | "review", "targetId": 15, "reason": "ประกาศหลอกลวง" }` (reason 1–500)
- The target must exist and not be hidden. One report per user per target.
- **Response 201:** `{ "report": { "id": 3, "status": "open" } }`
- **Errors:** 400, 404, 409 `ALREADY_REPORTED`

## Chat

One conversation per application, opened **when the shop accepts** the application (the accept transaction creates it).
Members are the seeker and the shop owner; every query checks `c.seeker_user_id = <JWT user> OR c.shop_user_id = <JWT user>`
(anyone else gets 404). All endpoints: role **seeker** or **shop** with onboarding completed.

- Sending is allowed while the application is `accepted` or `completed` and both accounts are active (`canSend`).
  After a cancellation (or a suspension) the history stays readable but sending returns 409 `CHAT_CLOSED`.
- Messages are text (1–2000 characters) or one JPG / PNG image (max 5 MB, saved under a random 128-bit name in
  `uploads/public/chat/`, so only the two members ever get the URL).
- Unread = messages from the other side newer than your read position.

### Conversation object

```json
{
  "id": 15,
  "applicationId": 99,
  "applicationStatus": "accepted",
  "job": { "id": 40, "title": "พนักงานแคชเชียร์ กะดึก" },
  "myRole": "seeker",
  "other": { "userId": 242, "name": "มินิมาร์ทสุขใจ", "imagePath": "shops/9b2e...41.jpg" },
  "canSend": true,
  "otherLastReadId": 17,
  "lastActivityAt": "2026-10-07 18:39:00"
}
```

`other` is the shop for a seeker and the seeker for a shop. `otherLastReadId` drives the "อ่านแล้ว" receipt.

### Message object

```json
{ "id": 18, "conversationId": 15, "senderId": 250, "body": "รับทราบค่ะ", "imagePath": null, "createdAt": "2026-10-07 18:40:12" }
```

`body` is `null` for an image message; `imagePath` is relative to `/uploads/`.

### `GET /api/chat/conversations`

- **Query:** `page`, `pageSize`. Newest activity first.
- **Response 200:** page of conversation objects + `"lastMessage": { "body", "hasImage", "senderId", "mine" } | null` and `"unread": 2`

### `GET /api/chat/unread-count`

- **Response 200:** `{ "unread": 3 }` (all conversations; badge on the chat tab)

### `GET /api/chat/conversations/:id`

- **Response 200:** `{ "conversation": <conversation object> }` · **Errors:** 404

### `GET /api/chat/by-application/:appId`

- The conversation of an application (for the "แชท" button on application pages).
- **Response 200:** `{ "conversation": <conversation object> }` · **Errors:** 404 (not accepted yet, or not a member)

### `GET /api/chat/conversations/:id/messages`

- **Query:** `limit` (default 30, max 100) and one of
  - none — newest page
  - `before=<message id>` — older page (scrolling up)
  - `after=<message id>` — everything newer (catch-up after a reconnect)
- **Response 200:** `{ "items": [<message>, ...], "hasMore": true }` (items always oldest first)
- **Errors:** 400 (bad cursor), 404

### `POST /api/chat/conversations/:id/messages`

- **Request:** `{ "body": "สวัสดีครับ" }` (1–2000 characters)
- Saves the message and moves the sender's read position in one transaction, then pushes it over the WebSocket to both members.
- **Response 201:** `{ "message": <message> }`
- **Errors:** 400, 404, 409 `CHAT_CLOSED`

### `POST /api/chat/conversations/:id/images`

- **Request:** `multipart/form-data`, one JPG / PNG in field `file` (max 5 MB, checked by file signature)
- **Response 201:** `{ "message": <message with imagePath> }`
- **Errors:** 400, 404, 409 `CHAT_CLOSED`, 413, 415

### `POST /api/chat/conversations/:id/read`

- **Request:** `{ "lastMessageId": 18 }` — never moves backwards, never past the newest message
- Pushes a read receipt to the other member.
- **Response 200:** `{ "lastReadId": 18 }` · **Errors:** 400, 404

### WebSocket `ws://<host>:1881/ws/chat`

Real-time push for chat (Node-RED `websocket in` / `websocket out` in the **Chat** tab).

- Only the app's origins may connect (`webSocketNodeVerifyClient` in `settings.js` uses the `CORS_ORIGINS` list).
- After connecting, the client must authenticate: `→ {"type":"auth","token":"<JWT>"}`
  `← {"type":"auth.ok","userId":12}` or `← {"type":"auth.error","code":"UNAUTHORIZED" | "FORBIDDEN"}`
  (same checks as auth-check: valid access token, active seeker / shop, onboarding done). Unauthenticated sockets receive nothing.
- Keep-alive: `→ {"type":"ping"}` `← {"type":"pong"}` (the app pings every 25 s)
- Server pushes:
  - `{"type":"message","conversationId":15,"message":<message>}` — to both members (all their open sockets)
  - `{"type":"read","conversationId":15,"userId":242,"lastReadId":18}` — to the other member
- Sending always goes through the REST endpoints above; the socket is receive-only apart from auth / ping.
- The app reconnects with backoff (1 s → 30 s) and then calls `messages?after=` to fill any gap.

## Notifications

All endpoints need a logged-in user (any role) and only touch the caller's own rows (`WHERE user_id = <JWT user>`).
Rows are created by the Node-RED flow of each event (in the same transaction) through `sj.notify()`; a future
FCM push sender can hook into that one function.

| type | Receiver | When | link |
|---|---|---|---|
| `application.new` | shop | New application | `/shop/applicants/:id` |
| `application.accepted` / `application.rejected` | seeker | Shop decided, or job closed / expired / hidden (auto-reject) | `/seeker/applications/:id` (auto-reject: `/seeker/applications`) |
| `application.cancelled` | shop | Seeker cancelled an accepted application | `/shop/applicants/:id` |
| `application.completed` | seeker | Shop confirmed the work is done | `/seeker/applications/:id` |
| `shop.verified` / `shop.rejected` | shop | Admin decision | `/shop/profile` |
| `job.expired` | shop | Daily expiry | `/shop/jobs/:id` |
| `job.hidden` | shop | Admin hid the job | `/shop/jobs/:id` |
| `review.received` | both | The other side left a review | `/seeker/profile` or `/shop/profile` |

### `GET /api/notifications/unread-count`

- **Response 200:** `{ "unread": 3 }` (`Cache-Control: no-store`). The app calls it on every page change and every 60 seconds.

### `GET /api/notifications`

- **Query:** `unread=1` (only unread), `page`, `pageSize`
- **Response 200:** page of `{ "id": 41, "type": "application.accepted", "message": "...", "link": "/seeker/applications/7", "isRead": false, "createdAt": "2026-10-06 15:00:00" }`, newest first

### `POST /api/notifications/:id/read`

- **Response 200:** `{ "read": true }`
- **Errors:** 404 (not the caller's notification)

### `POST /api/notifications/read-all`

- **Response 200:** `{ "updated": 4 }`

## Scheduled

### Daily expiry (inject, every day 00:00 Asia/Bangkok)

Closes `open` jobs whose `expiresOn` is before today, rejects their pending applications (seekers notified)
and notifies the shop (`job.expired`, link `/shop/jobs/:id`). One transaction.

### `POST /api/admin/jobs/close-expired`

- **Role:** admin. Runs the same flow immediately (for testing / demos).
- **Response 200:** `{ "closedJobs": 1, "rejectedApplications": 1 }`

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

Log actions: `shop.verify`, `shop.reject`, `user.suspend`, `user.unsuspend`, `job.hide`, `job.unhide`, `report.resolve`, `report.dismiss`, `review.hide`, `category.create`, `category.update`.

### `GET /api/admin/users`

- **Query:** `role` (`seeker` | `shop` | `admin` | `none`), `status` (`active` | `suspended`), `q` (email, name or shop name), `page`, `pageSize`
- **Response 200:** page of `{ "id", "email", "role", "status", "profileCompleted", "hasGoogle", "displayName", "shopId", "createdAt", "lastLoginAt" }` (no password hash)

### `POST /api/admin/users/:id/suspend` · `POST /api/admin/users/:id/unsuspend`

- **Request:** `{ "reason": "..." }` — **required for suspend**, optional for unsuspend
- Admin accounts cannot be suspended (403). A suspended user's token stops working immediately (auth-check reads
  the status on every request) and their shop's jobs drop out of search. Logs `user.suspend` / `user.unsuspend`.
- **Response 200:** `{ "id": 12, "status": "suspended" }`
- **Errors:** 400, 403 `FORBIDDEN`, 404, 409 `INVALID_STATE`

### `GET /api/admin/jobs`

- **Query:** `status` (`open` | `closed` | `hidden`), `reported=1` (has open reports), `q`, `page`, `pageSize`
- **Response 200:** page of public job objects (no description) + `applicantCount`, `openReports`

### `GET /api/admin/jobs/:id`

- **Response 200:** `{ "job": <job + shop + images + "openReports": 0, "applicationCounts": { "pending": 1, "completed": 2 }> }` (any status, including hidden)

### `GET /api/admin/jobs/:id/applications`

- Read-only list of applicants: `{ "id", "status", "appliedAt", "seeker": { "id", "fullName", "email" } }` (no phone)

### `POST /api/admin/jobs/:id/hide`

- **Request:** `{ "reason": "..." }` (optional, shown to the shop in the notification)
- Sets `hidden`, rejects pending applications (seekers notified), resolves the job's open reports, notifies the shop
  (`job.hidden`), logs `job.hide`. One transaction.
- **Response 200:** `{ "id": 15, "status": "hidden", "rejectedApplications": 1 }`
- **Errors:** 404, 409 `INVALID_STATE` (already hidden)

### `POST /api/admin/jobs/:id/unhide`

- `hidden` → `closed` (the shop can renew it). Logs `job.unhide`.

### `GET /api/admin/reports`

- **Query:** `status` (`open` default | `resolved` | `dismissed` | `all`), `targetType` (`job` | `review`), `page`, `pageSize`. Open reports: oldest first.
- **Response 200:** page of

  ```json
  {
    "id": 3, "targetType": "job", "targetId": 15, "reason": "...", "status": "open",
    "createdAt": "...", "resolvedAt": null, "reporterEmail": "...", "resolverEmail": null,
    "target": { "title": "...", "status": "open", "shopName": "..." }
  }
  ```

  For reviews `target` is `{ "rating", "comment", "isHidden", "author" }`; `null` if the target no longer exists.

### `POST /api/admin/reports/:id/resolve`

- **Request:** `{ "hideTarget": true, "reason": "..." }`
- With `hideTarget` the job is hidden (same as `/hide`) or the review is hidden (`review.hide`), and all open reports
  of that target are resolved. Logs `report.resolve`. One transaction.
- **Errors:** 404, 409 `INVALID_STATE` (not open)

### `POST /api/admin/reports/:id/dismiss`

- **Request:** `{ "reason": "..." }` (optional). Logs `report.dismiss`.

### `POST /api/admin/reviews/:id/hide`

- **Request:** `{ "reason": "..." }` (optional). Hides the review, resolves its open reports, logs `review.hide`.

### `GET /api/admin/categories`

- **Response 200:** `{ "items": [{ "id": 1, "name": "...", "icon": "restaurant-outline", "sortOrder": 10, "isActive": true, "jobCount": 12 }] }` (including inactive)

### `POST /api/admin/categories` · `PUT /api/admin/categories/:id`

- **Request:** `{ "name": "...", "icon": "cafe-outline", "sortOrder": 10, "isActive": true }` (name 1–100, unique; icon = ionicons name)
- There is no delete (jobs reference categories): deactivate instead. Inactive categories disappear from
  `GET /api/jobs/categories` and cannot be chosen for new jobs. Logs `category.create` / `category.update`.
- **Response:** 201 / 200 `{ "category": { ... } }`
- **Errors:** 400, 404, 409 `CONFLICT` (duplicate name)
