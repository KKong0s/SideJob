import { AbstractControl, ValidationErrors } from '@angular/forms';

// Mirrors the API rules so users see problems before submitting

export const normalisePhone = (value: string) => value.replace(/[\s-]/g, '');

export function thaiPhone(control: AbstractControl<string>): ValidationErrors | null {
  return !control.value || /^0\d{8,9}$/.test(normalisePhone(control.value)) ? null : { phone: true };
}

/** YYYY-MM-DD for "today minus N years" (local time), used as the date input max */
export function yearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function minAge(years: number) {
  return (control: AbstractControl<string>): ValidationErrors | null =>
    !control.value || control.value <= yearsAgo(years) ? null : { minAge: true };
}
