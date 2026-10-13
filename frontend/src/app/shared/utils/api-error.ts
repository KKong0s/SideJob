import { HttpContext, HttpContextToken, HttpErrorResponse } from '@angular/common/http';

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Set on a request when the page shows the error itself, so the interceptor skips its toast. */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export const silentErrors = () => new HttpContext().set(SKIP_ERROR_TOAST, true);

/** An error raised by the app itself (not the API) that pages show like an API error */
export class AppError extends Error {
  constructor(readonly apiError: ApiError) {
    super(apiError.message);
  }
}

/** Normalises any HTTP failure into the API's `{ error: { code, message } }` shape. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof AppError) return err.apiError;
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return { status: 0, code: 'NETWORK_ERROR', message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต' };
    }
    const body = err.error?.error;
    if (body?.code) {
      return { status: err.status, code: body.code, message: body.message, details: body.details };
    }
    return { status: err.status, code: `HTTP_${err.status}`, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' };
  }
  return { status: -1, code: 'UNKNOWN', message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' };
}
