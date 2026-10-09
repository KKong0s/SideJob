import { baht, thaiDate } from '../utils/format';

export type WageUnit = 'hour' | 'day' | 'job';
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type JobStatus = 'open' | 'closed' | 'hidden';
export type ScheduleType = 'dates' | 'weekly';

export interface Category {
  id: number;
  name: string;
  icon: string | null;
}

export interface Job {
  id: number;
  title: string;
  description: string;
  category: Category;
  provinceId: number;
  districtId: number;
  provinceName: string;
  districtName: string;
  wage: number;
  wageUnit: WageUnit;
  scheduleType: ScheduleType;
  startDate: string | null;
  endDate: string | null;
  /** For 'dates' jobs these are derived from the date range */
  workDays: Weekday[];
  startTime: string;
  endTime: string;
  minAge: number | null;
  expiresOn: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  /** Sample photos; only on detail endpoints (not in lists) */
  images?: JobImage[];
}

export interface JobImage {
  id: number;
  /** Relative to environment.uploadsUrl */
  path: string;
}

/** Shop owner's view of its own job */
export interface OwnJob extends Job {
  applicantCount: number;
  pendingCount: number;
  /** Has applicants: wage and schedule can no longer change */
  locked: boolean;
}

export interface JobInput {
  title: string;
  description: string;
  categoryId: number;
  provinceId: number;
  districtId: number;
  wage: number;
  wageUnit: WageUnit;
  scheduleType: ScheduleType;
  startDate?: string | null;
  endDate?: string | null;
  workDays?: Weekday[];
  startTime: string;
  endTime: string;
  minAge?: number | null;
  /** Create only */
  expiresOn?: string;
}

export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  mon: 'จ.',
  tue: 'อ.',
  wed: 'พ.',
  thu: 'พฤ.',
  fri: 'ศ.',
  sat: 'ส.',
  sun: 'อา.',
};

export const WAGE_UNIT_LABEL: Record<WageUnit, string> = {
  hour: 'ชั่วโมง',
  day: 'วัน',
  job: 'งาน',
};

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  open: 'เปิดรับสมัคร',
  closed: 'ปิดรับแล้ว',
  hidden: 'ถูกซ่อนโดยแอดมิน',
};

export const JOB_STATUS_COLOR: Record<JobStatus, string> = {
  open: 'success',
  closed: 'medium',
  hidden: 'danger',
};

type WageFields = Pick<Job, 'wage' | 'wageUnit'>;
type ScheduleFields = Pick<Job, 'scheduleType' | 'startDate' | 'endDate' | 'workDays' | 'startTime' | 'endTime'>;

/** "60 บาท/ชั่วโมง" */
export function wageText(job: WageFields): string {
  return `${baht(job.wage)}/${WAGE_UNIT_LABEL[job.wageUnit]}`;
}

const WAGE_UNIT_SHORT: Record<WageUnit, string> = {
  hour: 'ชม.',
  day: 'วัน',
  job: 'งาน',
};
const wagePillFmt = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 });

/** Compact wage for pills: "฿55/ชม." */
export function wageShortText(job: WageFields): string {
  return `฿${wagePillFmt.format(job.wage)}/${WAGE_UNIT_SHORT[job.wageUnit]}`;
}

/** "ทุกวัน", "จ.–ศ.", "ส. อา." */
export function weekdaysText(days: Weekday[]): string {
  if (days.length === 7) return 'ทุกวัน';
  const weekdays = WEEKDAYS.slice(0, 5);
  if (days.length === 5 && weekdays.every((d) => days.includes(d))) return 'จ.–ศ.';
  if (days.length === 2 && days.includes('sat') && days.includes('sun')) return 'ส.–อา.';
  return WEEKDAYS.filter((d) => days.includes(d))
    .map((d) => WEEKDAY_SHORT[d])
    .join(' ');
}

/** Work days part of the schedule: dates or weekly days */
export function daysText(job: ScheduleFields): string {
  if (job.scheduleType === 'dates') {
    if (!job.startDate) return '';
    return job.startDate === job.endDate ? thaiDate(job.startDate) : `${thaiDate(job.startDate)} – ${thaiDate(job.endDate)}`;
  }
  return `ทุก ${weekdaysText(job.workDays)}`;
}

/** "09:00–17:00 น." (overnight shifts end the next day) */
export function timeText(job: Pick<Job, 'startTime' | 'endTime'>): string {
  const overnight = job.endTime < job.startTime ? ' (ข้ามคืน)' : '';
  return `${job.startTime}–${job.endTime} น.${overnight}`;
}

export function locationText(job: Pick<Job, 'provinceId' | 'provinceName' | 'districtName'>): string {
  return job.provinceId === 1 ? `เขต${job.districtName}, กรุงเทพฯ` : `${job.districtName}, ${job.provinceName}`;
}
