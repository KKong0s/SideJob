import { daysText, locationText, timeText, wageText, weekdaysText } from './job.model';

describe('job display text', () => {
  it('summarises weekdays', () => {
    expect(weekdaysText(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).toBe('ทุกวัน');
    expect(weekdaysText(['fri', 'mon', 'tue', 'wed', 'thu'])).toBe('จ.–ศ.');
    expect(weekdaysText(['sat', 'sun'])).toBe('ส.–อา.');
    expect(weekdaysText(['wed', 'mon'])).toBe('จ. พ.');
  });

  it('formats the schedule', () => {
    const base = { startTime: '09:00', endTime: '17:00', workDays: [] as never[] };
    expect(daysText({ ...base, scheduleType: 'dates', startDate: '2026-10-10', endDate: '2026-10-10' })).toBe('10 ต.ค. 2569');
    expect(daysText({ ...base, scheduleType: 'weekly', startDate: null, endDate: null, workDays: ['sat'] as never[] })).toBe('ทุก ส.');
    expect(timeText({ startTime: '22:00', endTime: '06:00' })).toBe('22:00–06:00 น. (ข้ามคืน)');
  });

  it('formats wage and Bangkok locations', () => {
    expect(wageText({ wage: 60, wageUnit: 'hour' })).toBe('60 บาท/ชั่วโมง');
    expect(locationText({ provinceId: 1, provinceName: 'กรุงเทพมหานคร', districtName: 'บางรัก' })).toBe('เขตบางรัก, กรุงเทพฯ');
    expect(locationText({ provinceId: 38, provinceName: 'เชียงใหม่', districtName: 'เมืองเชียงใหม่' })).toBe('เมืองเชียงใหม่, เชียงใหม่');
  });
});
