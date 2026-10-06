import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  RefresherCustomEvent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  briefcaseOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  notificationsOffOutline,
  notificationsOutline,
  personAddOutline,
  starOutline,
  storefrontOutline,
  timeOutline,
} from 'ionicons/icons';

import { PageStateComponent } from '../../components/page-state/page-state.component';
import { AuthService } from '../../services/auth.service';
import { AppNotification, NotificationService } from '../../services/notification.service';
import { timeAgo } from '../../utils/format';
import { PagedList } from '../../utils/paged-list';

const TYPE_ICON: Record<string, { icon: string; color: string }> = {
  'application.new': { icon: 'person-add-outline', color: 'primary' },
  'application.accepted': { icon: 'checkmark-circle-outline', color: 'success' },
  'application.rejected': { icon: 'close-circle-outline', color: 'danger' },
  'application.cancelled': { icon: 'close-circle-outline', color: 'medium' },
  'application.completed': { icon: 'checkmark-circle-outline', color: 'primary' },
  'shop.verified': { icon: 'storefront-outline', color: 'success' },
  'shop.rejected': { icon: 'storefront-outline', color: 'danger' },
  'job.expired': { icon: 'time-outline', color: 'warning' },
  'job.hidden': { icon: 'alert-circle-outline', color: 'danger' },
  'review.received': { icon: 'star-outline', color: 'warning' },
};

/** Notification list (seeker and shop). Tapping one marks it read and opens its link. */
@Component({
  selector: 'app-notifications',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button [defaultHref]="home" text="กลับ"></ion-back-button></ion-buttons>
        <ion-title>การแจ้งเตือน</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="readAll()" [disabled]="notifications.unread() === 0">อ่านทั้งหมด</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <app-page-state
        [state]="list.state()"
        emptyIcon="notifications-off-outline"
        emptyText="ยังไม่มีการแจ้งเตือน"
        emptyHint="เมื่อมีความเคลื่อนไหว เช่น ใบสมัครถูกรับ จะแสดงที่นี่"
        (retry)="list.reload()"
      >
        <ion-list>
          @for (n of list.items(); track n.id) {
            <ion-item [button]="true" [detail]="false" [class.unread]="!n.isRead" (click)="open(n)">
              <ion-icon slot="start" [name]="icon(n).icon" [color]="icon(n).color" aria-hidden="true"></ion-icon>
              <ion-label class="ion-text-wrap">
                <h3>{{ n.message }}</h3>
                <p>{{ timeAgo(n.createdAt) }}</p>
              </ion-label>
              @if (!n.isRead) {
                <ion-note slot="end" class="dot" aria-label="ยังไม่อ่าน"></ion-note>
              }
            </ion-item>
          }
        </ion-list>
      </app-page-state>
      <ion-infinite-scroll [disabled]="!list.hasNext()" (ionInfinite)="list.loadMore($event)">
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  `,
  styles: `
    ion-item.unread {
      --background: rgba(var(--ion-color-primary-rgb), 0.07);
    }
    ion-item.unread h3 {
      font-weight: 600;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--ion-color-primary);
    }
  `,
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonButton,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonNote,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    PageStateComponent,
  ],
})
export class NotificationsPage {
  readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  readonly home = inject(AuthService).homeUrl();

  readonly list = new PagedList<AppNotification>((page, ctx) => this.notifications.list(page, ctx));
  readonly timeAgo = timeAgo;

  constructor() {
    addIcons({
      alertCircleOutline,
      briefcaseOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      notificationsOffOutline,
      notificationsOutline,
      personAddOutline,
      starOutline,
      storefrontOutline,
      timeOutline,
    });
  }

  ionViewWillEnter(): void {
    void this.list.reload();
  }

  icon(n: AppNotification): { icon: string; color: string } {
    return TYPE_ICON[n.type] ?? { icon: 'notifications-outline', color: 'medium' };
  }

  async refresh(event: RefresherCustomEvent): Promise<void> {
    void this.notifications.refreshCount();
    await this.list.refresh(event);
  }

  async open(n: AppNotification): Promise<void> {
    if (!n.isRead) {
      this.list.update((items) => items.map((i) => (i.id === n.id ? { ...i, isRead: true } : i)));
      void this.notifications.markRead(n.id).catch(() => undefined);
    }
    if (n.link) await this.router.navigateByUrl(n.link);
  }

  async readAll(): Promise<void> {
    try {
      await this.notifications.readAll();
      this.list.update((items) => items.map((i) => ({ ...i, isRead: true })));
    } catch {
      // the interceptor shows the error toast
    }
  }
}
