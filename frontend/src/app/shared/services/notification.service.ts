import { HttpClient, HttpContext } from '@angular/common/http';
import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page, toHttpParams } from '../models/page.model';
import { silentErrors } from '../utils/api-error';
import { AuthService } from './auth.service';

export interface AppNotification {
  id: number;
  type: string;
  message: string;
  /** In-app route to open, e.g. /shop/applicants/12 */
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const POLL_MS = 60_000;

/**
 * Unread count for the bell: refreshed on every navigation and every 60 seconds while logged in.
 * (Push notifications via FCM can later call refreshCount() when a message arrives.)
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = `${environment.apiUrl}/notifications`;

  readonly unread = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const router = inject(Router);
    const sub = router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => void this.refreshCount());
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      this.stop();
    });

    // Poll only while someone who can receive notifications is logged in
    effect(() => {
      const user = this.auth.user();
      if (user && user.role !== 'admin' && user.onboardingStep === 'done') this.start();
      else this.stop();
    });
  }

  async refreshCount(): Promise<void> {
    const user = this.auth.user();
    if (!user || user.role === 'admin' || user.onboardingStep !== 'done') {
      this.unread.set(0);
      return;
    }
    try {
      const res = await firstValueFrom(this.http.get<{ unread: number }>(`${this.api}/unread-count`, { context: silentErrors() }));
      this.unread.set(res.unread);
    } catch {
      // keep the last value; the next poll tries again
    }
  }

  list(page: number, context?: HttpContext): Promise<Page<AppNotification>> {
    return firstValueFrom(this.http.get<Page<AppNotification>>(this.api, { params: toHttpParams({ page }), context }));
  }

  async markRead(id: number): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/${id}/read`, {}, { context: silentErrors() }));
    this.unread.update((n) => Math.max(0, n - 1));
  }

  async readAll(): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/read-all`, {}));
    this.unread.set(0);
  }

  private start(): void {
    if (this.timer) return;
    void this.refreshCount();
    this.timer = setInterval(() => void this.refreshCount(), POLL_MS);
  }

  private stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.unread.set(0);
  }
}
