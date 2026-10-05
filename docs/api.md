# SideJob API

Base URL (local dev): `http://localhost:1881/api`

## Conventions

- Request/response bodies are JSON (`Content-Type: application/json`), except file uploads (`multipart/form-data`).
- Authenticated endpoints need `Authorization: Bearer <JWT>` (added in Phase 1).
- Times are `+07:00` (Asia/Bangkok), formatted `YYYY-MM-DD HH:mm:ss`; dates are `YYYY-MM-DD`.
- List endpoints take `?page=1&pageSize=20` (default 20) and return:

  ```json
  { "items": [], "page": 1, "pageSize": 20, "hasNext": false }
  ```

### Error format

Every error uses the same body:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "ข้อความภาษาไทยสำหรับแสดงผู้ใช้" } }
```

| HTTP | code (examples) | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid input |
| 401 | `UNAUTHORIZED` | Missing / invalid / expired token |
| 403 | `FORBIDDEN`, `ACCOUNT_SUSPENDED` | Wrong role, not the owner, suspended account |
| 404 | `NOT_FOUND` | Resource does not exist (or caller may not see it) |
| 409 | `CONFLICT` | Duplicate (e.g. email already registered, already applied) |
| 500 | `INTERNAL_ERROR` | Unexpected server error (details only in Node-RED logs) |

## Endpoints

### System

#### `GET /api/health`

- **Role:** public
- **Purpose:** check that Node-RED is up and can reach MySQL.
- **Response 200**

  ```json
  { "status": "ok", "database": "connected", "provinces": 77, "time": "2026-10-05 18:45:49" }
  ```

- **Response 500:** standard error body when the database is unreachable.
