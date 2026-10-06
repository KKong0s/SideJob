/**
 * Shared helpers for function nodes, exposed as global.get('sj') (see settings.js).
 *
 * - Transactional writes use the mysql2 pool here (tx). Plain reads / single writes use the mysql node.
 * - Every query still uses `?` placeholders.
 * - Restart Node-RED after editing this file.
 */
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const env = process.env;

let pool = null;
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env.DB_HOST,
      port: Number(env.DB_PORT) || 3306,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      timezone: '+07:00',
      charset: 'utf8mb4_unicode_ci',
      dateStrings: true,
      connectionLimit: 5,
    });
  }
  return pool;
}

/** Error carrying an HTTP status and API error code; function nodes turn it into fail(...). */
class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const httpError = (status, code, message, details) => new HttpError(status, code, message, details);

/**
 * Runs `work(conn)` inside a transaction. Commits when it resolves, rolls back when it throws.
 * `conn.query(sql, params)` resolves to [rows | result, fields].
 */
async function tx(work) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {
      // connection already broken; the original error matters more
    }
    throw err;
  } finally {
    conn.release();
  }
}

/** page / pageSize from the query string (pageSize default 20, max 50). Fetch `limit` rows to detect a next page. */
function paging(query, defaultSize = 20) {
  const q = query || {};
  const page = Math.max(1, Math.min(10000, parseInt(q.page, 10) || 1));
  const pageSize = Math.max(1, Math.min(50, parseInt(q.pageSize, 10) || defaultSize));
  return { page, pageSize, limit: pageSize + 1, offset: (page - 1) * pageSize };
}

function pageResult(rows, p, map = (r) => r) {
  return {
    items: rows.slice(0, p.pageSize).map(map),
    page: p.page,
    pageSize: p.pageSize,
    hasNext: rows.length > p.pageSize,
  };
}

/** In-app notification(s), written on the same connection as the event that caused them. */
async function notify(conn, userIds, type, message, link) {
  const ids = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean);
  if (!ids.length) return;
  await conn.query('INSERT INTO notifications (user_id, type, message, link) VALUES ?', [
    ids.map((id) => [id, type, message.slice(0, 500), link || null]),
  ]);
}

/** Admin audit log entry. Call inside tx() so the action fails if the log cannot be written. */
async function adminLog(conn, adminUserId, action, targetType, targetId, reason) {
  await conn.query(
    'INSERT INTO admin_logs (admin_user_id, action, target_type, target_id, reason) VALUES (?, ?, ?, ?, ?)',
    [adminUserId, action, targetType, targetId, reason || null],
  );
}

/** File type from its signature (never trust the client name / mimetype). */
function detectFileType(buf) {
  if (!buf || buf.length < 8) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  return null;
}

const randomFileName = (ext) => crypto.randomBytes(16).toString('hex') + '.' + ext;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Picks the single uploaded file in field `file` and checks size / type.
 * Returns { buffer, ext } or throws HttpError.
 */
function uploadedFile(req, allowed) {
  const files = ((req && req.files) || []).filter((f) => f.fieldname === 'file');
  if (files.length !== 1) throw httpError(400, 'VALIDATION_ERROR', 'กรุณาเลือกไฟล์ 1 ไฟล์ (ชื่อฟิลด์ file)');
  const f = files[0];
  if (f.size > MAX_UPLOAD_BYTES) throw httpError(413, 'FILE_TOO_LARGE', 'ไฟล์ต้องมีขนาดไม่เกิน 5 MB');
  const ext = detectFileType(f.buffer);
  if (!ext || !allowed.includes(ext)) {
    const names = allowed.map((e) => e.toUpperCase()).join(' / ');
    throw httpError(415, 'UNSUPPORTED_FILE_TYPE', `รองรับเฉพาะไฟล์ ${names}`);
  }
  return { buffer: f.buffer, ext };
}

// --- Dates (Asia/Bangkok) ----------------------------------------------------

const pad = (n) => String(n).padStart(2, '0');

/** Today in Bangkok as YYYY-MM-DD */
function today() {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Parses a strict YYYY-MM-DD date; returns a UTC Date or null */
function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof s === 'string' ? s : '');
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
}

function addDays(dateStr, days) {
  const d = parseDate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Whole days from a to b (YYYY-MM-DD) */
const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);

/** Age in full years on `onDate` (both YYYY-MM-DD) */
function ageOn(birthDate, onDate) {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = onDate.split('-').map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

// Same order as the jobs.work_days SET (bit values 1, 2, 4, ...)
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** Weekdays covered by a date range (used for 'dates' jobs so the work-day filter works for both shapes) */
function weekdaysInRange(start, end) {
  const days = new Set();
  const d = parseDate(start);
  const last = parseDate(end);
  for (let i = 0; i < 7 && d <= last; i++) {
    days.add(WEEKDAYS[(d.getUTCDay() + 6) % 7]);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return WEEKDAYS.filter((w) => days.has(w));
}

/** Bit mask for a list of weekdays, matching MySQL SET arithmetic */
const weekdayMask = (days) => days.reduce((m, w) => m | (1 << WEEKDAYS.indexOf(w)), 0);

module.exports = {
  getPool,
  tx,
  HttpError,
  httpError,
  paging,
  pageResult,
  notify,
  adminLog,
  detectFileType,
  randomFileName,
  uploadedFile,
  MAX_UPLOAD_BYTES,
  today,
  parseDate,
  addDays,
  daysBetween,
  ageOn,
  WEEKDAYS,
  weekdaysInRange,
  weekdayMask,
};
