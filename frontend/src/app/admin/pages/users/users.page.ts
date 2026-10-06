import { Component, inject, signal } from '@angular/core';
import {
  AlertController,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { peopleOutline } from 'ionicons/icons';

import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { thaiDateTime } from '../../../shared/utils/format';
import { PagedList } from '../../../shared/utils/paged-list';
import { AdminUserRow, ROLE_LABEL } from '../../admin.model';
import { AdminService } from '../../admin.service';
import { askReason } from '../../ask-reason';

type RoleFilter = 'all' | 'seeker' | 'shop' | 'admin';

@Component({
  selector: 'app-admin-users',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button></ion-menu-button></ion-buttons>
        <ion-title>ผู้ใช้</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="role()" (ionChange)="setRole($any($event.detail.value))">
          <ion-segment-button value="all">ทั้งหมด</ion-segment-button>
          <ion-segment-button value="seeker">ผู้หางาน</ion-segment-button>
          <ion-segment-button value="shop">ร้านค้า</ion-segment-button>
          <ion-segment-button value="admin">แอดมิน</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar placeholder="ค้นหาอีเมล ชื่อ หรือชื่อร้าน" [debounce]="400" (ionInput)="setQuery($event.detail.value ?? '')"></ion-searchbar>
        <ion-buttons slot="end">
          <ion-button [color]="suspendedOnly() ? 'danger' : 'medium'" (click)="toggleSuspended()">
            {{ suspendedOnly() ? 'เฉพาะที่ถูกระงับ' : 'ทุกสถานะ' }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="list.refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <app-page-state [state]="list.state()" emptyIcon="people-outline" emptyText="ไม่พบผู้ใช้" (retry)="list.reload()">
        <ion-list>
          @for (u of list.items(); track u.id) {
            <ion-item>
              <ion-label>
                <h3>{{ u.displayName || '(ยังไม่กรอกโปรไฟล์)' }}</h3>
                <p>{{ u.email }} @if (u.hasGoogle) { · Google }</p>
                <p>สมัคร {{ thaiDateTime(u.createdAt) }} · เข้าใช้ล่าสุด {{ u.lastLoginAt ? thaiDateTime(u.lastLoginAt) : '-' }}</p>
              </ion-label>
              <div slot="end" class="end">
                <ion-badge color="light">{{ u.role ? roleLabel[u.role] : 'ยังไม่เลือกบทบาท' }}</ion-badge>
                @if (u.status === 'suspended') {
                  <ion-badge color="danger">ถูกระงับ</ion-badge>
                }
                @if (u.role !== 'admin') {
                  <ion-button size="small" fill="outline" [color]="u.status === 'active' ? 'danger' : 'success'" (click)="toggle(u)">
                    {{ u.status === 'active' ? 'ระงับบัญชี' : 'ปลดระงับ' }}
                  </ion-button>
                }
              </div>
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
    .end {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
  `,
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonSegment,
    IonSegmentButton,
    IonSearchbar,
    IonButton,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    PageStateComponent,
  ],
})
export class AdminUsersPage {
  private readonly admin = inject(AdminService);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);

  readonly role = signal<RoleFilter>('all');
  readonly query = signal('');
  readonly suspendedOnly = signal(false);
  readonly list = new PagedList<AdminUserRow>((page, ctx) =>
    this.admin.users(
      { role: this.role() === 'all' ? null : this.role(), status: this.suspendedOnly() ? 'suspended' : null, q: this.query(), page },
      ctx,
    ),
  );

  readonly roleLabel = ROLE_LABEL;
  readonly thaiDateTime = thaiDateTime;

  constructor() {
    addIcons({ peopleOutline });
    void this.list.reload();
  }

  setRole(role: RoleFilter): void {
    this.role.set(role);
    void this.list.reload();
  }

  setQuery(q: string): void {
    this.query.set(q.trim());
    void this.list.reload();
  }

  toggleSuspended(): void {
    this.suspendedOnly.update((v) => !v);
    void this.list.reload();
  }

  async toggle(u: AdminUserRow): Promise<void> {
    const suspend = u.status === 'active';
    const reason = await askReason(this.alerts, this.toasts, {
      header: suspend ? `ระงับบัญชี ${u.email}?` : `ปลดระงับ ${u.email}?`,
      message: suspend ? 'ผู้ใช้จะใช้งานไม่ได้ทันที และประกาศของร้าน (ถ้ามี) จะไม่แสดงในหน้าค้นหา' : undefined,
      confirmText: suspend ? 'ระงับบัญชี' : 'ปลดระงับ',
      required: suspend,
      destructive: suspend,
    });
    if (reason === null) return;
    try {
      await this.admin.setUserSuspended(u.id, suspend, reason);
      this.list.update((items) => items.map((i) => (i.id === u.id ? { ...i, status: suspend ? 'suspended' : 'active' } : i)));
      const t = await this.toasts.create({ message: suspend ? 'ระงับบัญชีแล้ว' : 'ปลดระงับแล้ว', color: 'success', duration: 2000, position: 'top' });
      await t.present();
    } catch {
      // the interceptor shows the error toast
    }
  }
}
