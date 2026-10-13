import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Route, Router, UrlTree, provideRouter } from '@angular/router';
import { Capacitor } from '@capacitor/core';

import { OnboardingStep, Role, SessionUser } from '../models/session.model';
import { AuthService } from '../services/auth.service';
import { toApiError } from '../utils/api-error';
import { authGuard, guestGuard, onboardingGuard, profileCompleteGuard, roleGuard, webOnlyGuard } from './auth.guards';

function makeUser(role: Role | null, step: OnboardingStep): SessionUser {
  return {
    id: 1,
    email: 'a@example.com',
    role,
    status: 'active',
    hasPassword: true,
    hasGoogle: false,
    profileCompleted: step === 'done',
    onboardingStep: step,
    displayName: null,
    avatarPath: null,
    shop: null,
  };
}

describe('auth guards', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
  });

  // Sets the session directly instead of going through the API
  const signIn = (user: SessionUser | null) =>
    (TestBed.inject(AuthService) as unknown as { userState: WritableSignal<SessionUser | null> }).userState.set(user);

  const run = (guard: typeof authGuard, data: Route['data'] = {}) =>
    TestBed.runInInjectionContext(() => guard({ data } as Route, [], {} as never));
  const url = (result: unknown) => (result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result);

  it('homeUrl sends each user to the right place', () => {
    const auth = TestBed.inject(AuthService);
    expect(auth.homeUrl(null)).toBe('/login');
    expect(auth.homeUrl(makeUser(null, 'role'))).toBe('/onboarding');
    expect(auth.homeUrl(makeUser('seeker', 'terms'))).toBe('/onboarding');
    expect(auth.homeUrl(makeUser('seeker', 'done'))).toBe('/seeker/search');
    expect(auth.homeUrl(makeUser('shop', 'done'))).toBe('/shop/dashboard');
    expect(auth.homeUrl(makeUser('admin', 'done'))).toBe('/admin/dashboard');
  });

  it('authGuard redirects guests to /login', () => {
    expect(url(run(authGuard))).toBe('/login');
    signIn(makeUser('seeker', 'done'));
    expect(run(authGuard)).toBe(true);
  });

  it('guestGuard sends logged-in users home', () => {
    expect(run(guestGuard)).toBe(true);
    signIn(makeUser('shop', 'done'));
    expect(url(run(guestGuard))).toBe('/shop/dashboard');
  });

  it('profileCompleteGuard and onboardingGuard split by onboarding state', () => {
    signIn(makeUser('seeker', 'profile'));
    expect(url(run(profileCompleteGuard))).toBe('/onboarding');
    expect(run(onboardingGuard)).toBe(true);
    signIn(makeUser('seeker', 'done'));
    expect(run(profileCompleteGuard)).toBe(true);
    expect(url(run(onboardingGuard))).toBe('/seeker/search');
  });

  it('roleGuard only lets matching roles in', () => {
    signIn(makeUser('seeker', 'done'));
    expect(run(roleGuard, { roles: ['seeker'] })).toBe(true);
    expect(url(run(roleGuard, { roles: ['admin'] }))).toBe('/seeker/search');
  });

  describe('phone app (admin is web only)', () => {
    afterEach(() => vi.restoreAllMocks());

    it('webOnlyGuard allows the browser and sends the app to /login', () => {
      expect(run(webOnlyGuard)).toBe(true);
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      expect(url(run(webOnlyGuard))).toBe('/login');
    });

    it('the app refuses an admin login without saving the session', async () => {
      TestBed.configureTestingModule({ providers: [provideHttpClientTesting()] });
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      const auth = TestBed.inject(AuthService);
      const http = TestBed.inject(HttpTestingController);

      const login = auth.login('admin@example.com', 'secret');
      http.expectOne((r) => r.url.endsWith('/auth/login')).flush({ token: 't', user: makeUser('admin', 'done') });

      await expect(login).rejects.toSatisfy((err) => toApiError(err).code === 'ADMIN_WEB_ONLY');
      expect(auth.isLoggedIn()).toBe(false);
      expect(auth.token()).toBeNull();
    });
  });
});
