// Thai display formats. API dates are 'YYYY-MM-DD', times 'YYYY-MM-DD HH:mm:ss', both Asia/Bangkok.

const TZ = 'Asia/Bangkok';

const dateFmt = new Intl.DateTimeFormat('th-TH', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('th-TH', {
  timeZone: TZ,
  day: 'numeric',
  month: 'short',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
const bahtFmt = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 });

function parse(value: string): Date {
  // Date-only values are midday so the day never shifts across time zones
  return value.length === 10 ? new Date(`${value}T12:00:00+07:00`) : new Date(`${value.replace(' ', 'T')}+07:00`);
}

/** 6 ต.ค. 2569 */
export function thaiDate(value: string | null | undefined): string {
  return value ? dateFmt.format(parse(value)) : '';
}

/** 6 ต.ค. 69 14:30 */
export function thaiDateTime(value: string | null | undefined): string {
  return value ? dateTimeFmt.format(parse(value)) : '';
}

/** "เมื่อสักครู่", "5 นาทีที่แล้ว", ... then the Thai date */
export function timeAgo(value: string | null | undefined, now = Date.now()): string {
  if (!value) return '';
  const minutes = Math.floor((now - parse(value).getTime()) / 60000);
  if (minutes < 1) return 'เมื่อสักครู่';
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} วันที่แล้ว`;
  return thaiDate(value);
}

/** 1,250 บาท */
export function baht(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : `${bahtFmt.format(value)} บาท`;
}

/** Today in Bangkok as YYYY-MM-DD, optionally shifted by N days */
export function todayIso(addDays = 0): string {
  const d = new Date(Date.now() + 7 * 3600 * 1000 + addDays * 86400000);
  return d.toISOString().slice(0, 10);
}

/** Full years between birthDate (YYYY-MM-DD) and today */
export function ageFrom(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split('-').map(Number);
  const [ty, tm, td] = todayIso().split('-').map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}
