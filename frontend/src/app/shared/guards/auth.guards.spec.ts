import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Route, Router, UrlTree, provideRouter } from '@angular/router';

import { OnboardingStep, Role, SessionUser } from '../models/session.model';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard, onboardingGuard, profileCompleteGuard, roleGuard } from './auth.guards';

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
});
