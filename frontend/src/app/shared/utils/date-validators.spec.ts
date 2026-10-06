import { FormControl } from '@angular/forms';

import { dateBetween } from './date-validators';

describe('dateBetween', () => {
  const validator = dateBetween(
    () => '2026-10-06',
    () => '2026-12-05',
    () => '2026-09-01',
  );
  const check = (value: string) => validator(new FormControl(value));

  it('accepts dates inside the range and empty values', () => {
    expect(check('2026-10-06')).toBeNull();
    expect(check('2026-12-05')).toBeNull();
    expect(check('')).toBeNull();
  });

  it('rejects past dates such as a typed 2023', () => {
    expect(check('2023-10-06')).toEqual({ dateMin: '2026-10-06' });
    expect(check('2026-10-05')).toEqual({ dateMin: '2026-10-06' });
  });

  it('rejects dates after the maximum and malformed values', () => {
    expect(check('2027-01-01')).toEqual({ dateMax: '2026-12-05' });
    expect(check('20261-01-01')).toEqual({ dateInvalid: true });
  });

  it('keeps an unchanged original value valid', () => {
    expect(check('2026-09-01')).toBeNull();
  });
});
