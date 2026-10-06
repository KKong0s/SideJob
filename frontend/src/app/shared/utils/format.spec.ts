import { ageFrom, baht, thaiDate, thaiDateTime, timeAgo } from './format';

describe('format', () => {
  it('formats dates in the Thai Buddhist calendar', () => {
    expect(thaiDate('2026-10-06')).toBe('6 ต.ค. 2569');
    expect(thaiDate(null)).toBe('');
  });

  it('formats date-times in Bangkok time', () => {
    expect(thaiDateTime('2026-10-06 14:30:00')).toContain('14:30');
  });

  it('formats baht', () => {
    expect(baht(1250)).toBe('1,250 บาท');
    expect(baht(45.5)).toBe('45.5 บาท');
  });

  it('describes recent times', () => {
    const now = new Date('2026-10-06T12:00:00+07:00').getTime();
    expect(timeAgo('2026-10-06 11:59:40', now)).toBe('เมื่อสักครู่');
    expect(timeAgo('2026-10-06 11:30:00', now)).toBe('30 นาทีที่แล้ว');
    expect(timeAgo('2026-10-04 12:00:00', now)).toBe('2 วันที่แล้ว');
  });

  it('computes age', () => {
    expect(ageFrom('2000-01-01')).toBeGreaterThanOrEqual(26);
    expect(ageFrom(null)).toBeNull();
  });
});
