import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { BellButtonComponent } from '../bell-button/bell-button.component';
import { BrandLogoComponent } from '../brand-logo/brand-logo.component';

export interface NavItem {
  path: string;
  label: string;
  /** Unread counter shown next to the label (e.g. chat) */
  count?: number;
}

/**
 * Wide-screen header (>= 992px): logo | pill menu | bell | avatar.
 * Phones keep the bottom ion-tab-bar instead; the tab shells switch between the two with CSS.
 */
@Component({
  selector: 'app-top-nav',
  template: `
    <header class="bar">
      <div class="inner">
        <a [routerLink]="homePath()" class="logo-link" aria-label="SideJob หน้าแรก"><app-brand-logo></app-brand-logo></a>
        <nav class="menu" aria-label="เมนูหลัก">
          @for (item of items(); track item.path) {
            <a class="pill" [routerLink]="item.path" routerLinkActive="active" ariaCurrentWhenActive="page">
              {{ item.label }}
              @if (item.count) {
                <span class="count" [attr.aria-label]="'ยังไม่อ่าน ' + item.count">{{ item.count > 99 ? '99+' : item.count }}</span>
              }
            </a>
          }
        </nav>
        <div class="end">
          <app-bell-button [inNav]="true"></app-bell-button>
          <a class="sj-avatar avatar-link" [routerLink]="profilePath()" routerLinkActive="active" [attr.aria-label]="'โปรไฟล์ ' + name()">
            @if (avatarUrl(); as url) {
              <img [src]="url" alt="" />
            } @else {
              {{ initial() }}
            }
          </a>
        </div>
      </div>
    </header>
  `,
  styles: `
    .bar {
      background: #ffffff;
      border-bottom: 1px solid var(--sj-divider);
    }
    .inner {
      max-width: 1280px;
      margin: 0 auto;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .logo-link {
      display: inline-flex;
      text-decoration: none;
      border-radius: 8px;
    }
    .menu {
      flex: 1;
      display: flex;
      justify-content: center;
      gap: 4px;
      min-width: 0;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 44px;
      padding: 0 18px;
      border-radius: 999px;
      color: var(--sj-text-secondary);
      font-family: var(--sj-font-heading);
      font-weight: 500;
      font-size: 15px;
      text-decoration: none;
      white-space: nowrap;
      transition:
        background-color var(--sj-dur-state) var(--sj-ease-out),
        color var(--sj-dur-state) var(--sj-ease-out),
        transform var(--sj-dur-press) var(--sj-ease-out);
    }
    .pill:active {
      transform: scale(0.97);
    }
    @media (prefers-reduced-motion: reduce) {
      .pill:active {
        transform: none;
      }
    }
    .pill:hover {
      color: var(--sj-dark);
      background: var(--sj-selected);
    }
    .pill.active {
      background: var(--sj-chip);
      color: var(--sj-dark);
      font-weight: 600;
    }
    .count {
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      box-sizing: border-box;
      border-radius: 10px;
      display: inline-grid;
      place-items: center;
      background: var(--sj-lime);
      color: var(--sj-dark);
      font-size: 12px;
      font-weight: 700;
    }
    .end {
      display: flex;
      align-items: center;
    }
    .end app-bell-button {
      margin-inline-end: 12px;
    }
    .avatar-link {
      text-decoration: none;
    }
    .avatar-link.active {
      box-shadow: 0 0 0 3px var(--sj-lime);
    }
  `,
  imports: [RouterLink, RouterLinkActive, BrandLogoComponent, BellButtonComponent],
})
export class TopNavComponent {
  private readonly auth = inject(AuthService);

  readonly items = input.required<NavItem[]>();
  readonly homePath = input.required<string>();
  readonly profilePath = input.required<string>();

  readonly name = computed(() => {
    const u = this.auth.user();
    return u?.shop?.name || u?.displayName || u?.email || '';
  });
  readonly initial = computed(() => this.name().trim().charAt(0).toUpperCase() || '?');
  readonly avatarUrl = computed(() => {
    const path = this.auth.user()?.avatarPath;
    return path ? `${environment.uploadsUrl}/${path}` : null;
  });
}
