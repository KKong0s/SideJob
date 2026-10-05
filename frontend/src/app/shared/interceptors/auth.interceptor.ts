import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { SKIP_ERROR_TOAST, toApiError } from '../utils/api-error';

/**
 * - Attaches the JWT to every API request
 * - 401 on an authenticated request (or a suspended account) -> log out and go to /login
 * - Any other error -> toast, unless the request opted out with SKIP_ERROR_TOAST
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toasts = inject(ToastController);

  const isApi = req.url.startsWith(environment.apiUrl);
  const token = auth.token();
  const authed = isApi && !!token;
  if (authed) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  const toast = async (message: string) => {
    const t = await toasts.create({ message, duration: 3000, position: 'top', color: 'danger' });
    await t.present();
  };

  return next(req).pipe(
    catchError((err: unknown) => {
      if (isApi && err instanceof HttpErrorResponse) {
        const apiError = toApiError(err);
        if (authed && (err.status === 401 || apiError.code === 'ACCOUNT_SUSPENDED')) {
          void auth.logout();
          void toast(apiError.message);
        } else if (!req.context.get(SKIP_ERROR_TOAST)) {
          void toast(apiError.message);
        }
      }
      return throwError(() => err);
    }),
  );
};
