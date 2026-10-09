import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { notificationsOutline } from 'ionicons/icons';

import { NotificationService } from '../../services/notification.service';

/**
 * Round bell with the unread count; opens the notification list.
 * Page toolbars hide their bell on wide screens because the top nav shows one (`inNav`).
 */
@Component({
  selector: 'app-bell-button',
  host: { '[class.in-nav]': 'inNav()' },
  template: `
    <a class="bell" routerLink="/notifications" [attr.aria-label]="label()">
      <ion-icon name="notifications-outline" aria-hidden="true"></ion-icon>
      @if (notifications.unread() > 0) {
        <span class="count" aria-hidden="true">{{ notifications.unread() > 99 ? '99+' : notifications.unread() }}</span>
      }
    </a>
  `,
  styles: `
    :host {
      display: inline-flex;
      margin-inline-end: 8px;
    }
    .bell {
      position: relative;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--sj-chip);
      color: var(--sj-dark);
      font-size: 22px;
      text-decoration: none;
    }
    .bell:hover {
      background: var(--ion-color-light-shade);
    }
    .count {
      position: absolute;
      top: -2px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      box-sizing: border-box;
      border-radius: 9px;
      display: grid;
      place-items: center;
      background: var(--sj-lime);
      color: var(--sj-dark);
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
    }
  `,
  imports: [RouterLink, IonIcon],
})
export class BellButtonComponent {
  readonly notifications = inject(NotificationService);
  /** True for the bell in the wide-screen top nav */
  readonly inNav = input(false);
  readonly label = computed(() => {
    const n = this.notifications.unread();
    return n ? `การแจ้งเตือน ยังไม่อ่าน ${n} รายการ` : 'การแจ้งเตือน';
  });

  constructor() {
    addIcons({ notificationsOutline });
  }
}
