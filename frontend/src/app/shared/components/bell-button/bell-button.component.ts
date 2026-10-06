import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBadge, IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { notificationsOutline } from 'ionicons/icons';

import { NotificationService } from '../../services/notification.service';

/** Toolbar bell with the unread count; opens the notification list */
@Component({
  selector: 'app-bell-button',
  template: `
    <ion-button routerLink="/notifications" [attr.aria-label]="label()">
      <ion-icon slot="icon-only" name="notifications-outline"></ion-icon>
      @if (notifications.unread() > 0) {
        <ion-badge color="danger" class="count">{{ notifications.unread() > 99 ? '99+' : notifications.unread() }}</ion-badge>
      }
    </ion-button>
  `,
  styles: `
    ion-button {
      position: relative;
    }
    .count {
      position: absolute;
      top: 2px;
      right: 0;
      font-size: 0.65rem;
      min-width: 18px;
      --padding-start: 4px;
      --padding-end: 4px;
      border-radius: 9px;
    }
  `,
  imports: [RouterLink, IonButton, IonIcon, IonBadge],
})
export class BellButtonComponent {
  readonly notifications = inject(NotificationService);
  readonly label = computed(() => {
    const n = this.notifications.unread();
    return n ? `การแจ้งเตือน ยังไม่อ่าน ${n} รายการ` : 'การแจ้งเตือน';
  });

  constructor() {
    addIcons({ notificationsOutline });
  }
}
