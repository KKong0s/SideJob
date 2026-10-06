import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * YYYY-MM-DD must be between min and max (inclusive). The native date input's min / max only limit the
 * calendar popup; a typed year (e.g. 2023) still gets through, so the form checks it too.
 * `keep` is a value that stays valid even when out of range (an unchanged date of a job being edited).
 */
export function dateBetween(min: () => string | null, max: () => string | null, keep: () => string | null = () => null): ValidatorFn {
  return (control: AbstractControl<string | null>): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) return { dateInvalid: true };
    if (value === keep()) return null;
    const lo = min();
    const hi = max();
    if (lo && value < lo) return { dateMin: lo };
    if (hi && value > hi) return { dateMax: hi };
    return null;
  };
}
