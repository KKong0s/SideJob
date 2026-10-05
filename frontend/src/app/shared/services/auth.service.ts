import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { Observable, firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthResponse, Role, SeekerProfileInput, SessionUser, ShopProfileInput } from '../models/session.model';
import { silentErrors, toApiError } from '../utils/api-error';

const TOKEN_KEY = 'sidejob.token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = environment.apiUrl;

  private readonly tokenState = signal<string | null>(null);
  private readonly userState = signal<SessionUser | null>(null);

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly isLoggedIn = computed(() => this.userState() !== null);

  /** Called once at app start: restores the saved token and loads the current user. */
  async restore(): Promise<void> {
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    if (!value) return;
    this.tokenState.set(value);
    try {
      await this.refresh();
    } catch (err) {
      const { status } = toApiError(err);
      if (status === 401 || status === 403) await this.clearSession();
    }
  }

  async refresh(): Promise<SessionUser> {
    const res = await firstValueFrom(
      this.http.get<{ user: SessionUser }>(`${this.api}/auth/me`, { context: silentErrors() }),
    );
    this.userState.set(res.user);
    return res.user;
  }

  async login(email: string, password: string): Promise<SessionUser> {
    return this.startSession(
      this.http.post<AuthResponse>(`${this.api}/auth/login`, { email, password }, { context: silentErrors() }),
    );
  }

  async register(email: string, password: string): Promise<SessionUser> {
    return this.startSession(
      this.http.post<AuthResponse>(`${this.api}/auth/register`, { email, password }, { context: silentErrors() }),
    );
  }

  async loginWithGoogle(idToken: string): Promise<SessionUser> {
    return this.startSession(
      this.http.post<AuthResponse>(`${this.api}/auth/google`, { idToken }, { context: silentErrors() }),
    );
  }

  async linkGoogle(linkToken: string, password: string): Promise<SessionUser> {
    return this.startSession(
      this.http.post<AuthResponse>(`${this.api}/auth/google/link`, { linkToken, password }, { context: silentErrors() }),
    );
  }

  async chooseRole(role: Exclude<Role, 'admin'>): Promise<SessionUser> {
    return this.updateUser(this.http.post<{ user: SessionUser }>(`${this.api}/auth/onboarding/role`, { role }));
  }

  async saveProfile(profile: SeekerProfileInput | ShopProfileInput): Promise<SessionUser> {
    return this.updateUser(
      this.http.put<{ user: SessionUser }>(`${this.api}/auth/onboarding/profile`, profile, { context: silentErrors() }),
    );
  }

  async acceptTerms(): Promise<SessionUser> {
    return this.updateUser(
      this.http.post<{ user: SessionUser }>(`${this.api}/auth/onboarding/accept-terms`, {
        acceptTerms: true,
        acceptPdpa: true,
      }),
    );
  }

  async uploadAvatar(file: File): Promise<SessionUser> {
    const form = new FormData();
    form.append('file', file, file.name);
    await firstValueFrom(this.http.post<{ avatarPath: string }>(`${this.api}/seeker/profile/avatar`, form));
    return this.refresh();
  }

  async logout(): Promise<void> {
    await this.clearSession();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  /** First page for the user: onboarding until complete, then the role's home. */
  homeUrl(user: SessionUser | null = this.userState()): string {
    if (!user) return '/login';
    if (user.onboardingStep !== 'done') return '/onboarding';
    switch (user.role) {
      case 'seeker':
        return '/seeker/search';
      case 'shop':
        return '/shop/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/onboarding';
    }
  }

  private async startSession(request: Observable<AuthResponse>): Promise<SessionUser> {
    const res = await firstValueFrom(request);
    this.tokenState.set(res.token);
    this.userState.set(res.user);
    await Preferences.set({ key: TOKEN_KEY, value: res.token });
    return res.user;
  }

  private async updateUser(request: Observable<{ user: SessionUser }>): Promise<SessionUser> {
    const res = await firstValueFrom(request);
    this.userState.set(res.user);
    return res.user;
  }

  private async clearSession(): Promise<void> {
    this.tokenState.set(null);
    this.userState.set(null);
    await Preferences.remove({ key: TOKEN_KEY });
  }
}
