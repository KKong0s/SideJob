import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { Role } from '../models/session.model';
import { AuthService } from '../services/auth.service';

// Guards only shape the UX. Every rule is enforced again by the API.

/** Logged in, otherwise -> /login */
export const authGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() || inject(Router).parseUrl('/login');
};

/** Not logged in (login / register pages), otherwise -> the user's home */
export const guestGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  return !auth.isLoggedIn() || inject(Router).parseUrl(auth.homeUrl());
};

/** Onboarding finished, otherwise -> /onboarding */
export const profileCompleteGuard: CanMatchFn = () => {
  const user = inject(AuthService).user();
  return user?.onboardingStep === 'done' || inject(Router).parseUrl('/onboarding');
};

/** Onboarding page is only for users who have not finished it */
export const onboardingGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  return auth.user()?.onboardingStep !== 'done' || inject(Router).parseUrl(auth.homeUrl());
};

/** Route `data.roles` must include the user's role, otherwise -> the user's home */
export const roleGuard: CanMatchFn = (route) => {
  const auth = inject(AuthService);
  const roles = (route.data?.['roles'] ?? []) as Role[];
  const role = auth.user()?.role;
  return (!!role && roles.includes(role)) || inject(Router).parseUrl(auth.homeUrl());
};
