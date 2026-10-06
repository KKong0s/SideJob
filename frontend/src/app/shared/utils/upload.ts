// Client-side upload checks (the API checks the real file signature again)

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png'];
export const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/** Returns an error message, or '' when the file is acceptable */
export function checkUpload(file: File, types: string[]): string {
  if (!types.includes(file.type)) {
    return types.includes('application/pdf') ? 'รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG' : 'รองรับเฉพาะไฟล์ JPG หรือ PNG';
  }
  if (file.size > MAX_UPLOAD_BYTES) return 'ไฟล์ต้องมีขนาดไม่เกิน 5 MB';
  return '';
}

/** Reads the chosen file from an <input type="file"> change event and clears the input */
export function takeFile(event: Event): File | null {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  input.value = '';
  return file;
}
