import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonAvatar,
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { storefrontOutline } from 'ionicons/icons';

import { environment } from '../../../../environments/environment';
import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { VERIFY_STATUS_COLOR, VERIFY_STATUS_LABEL, VerifyStatus } from '../../../shared/models/shop.model';
import { thaiDateTime } from '../../../shared/utils/format';
import { PagedList } from '../../../shared/utils/paged-list';
import { AdminShopRow } from '../../admin.model';
import { AdminService } from '../../admin.service';

type StatusFilter = VerifyStatus | 'all';

@Component({
  selector: 'app-admin-shops',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button></ion-menu-button></ion-buttons>
        <ion-title>ร้านค้า</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="status()" (ionChange)="setStatus($any($event.detail.value))" [scrollable]="true">
          <ion-segment-button value="pending">รอยืนยัน</ion-segment-button>
          <ion-segment-button value="verified">ยืนยันแล้ว</ion-segment-button>
          <ion-segment-button value="rejected">ไม่ผ่าน</ion-segment-button>
          <ion-segment-button value="unsubmitted">ยังไม่ส่งเอกสาร</ion-segment-button>
          <ion-segment-button value="all">ทั้งหมด</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar placeholder="ค้นหาชื่อร้านหรืออีเมลเจ้าของ" [debounce]="400" (ionInput)="setQuery($event.detail.value ?? '')"></ion-searchbar>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="list.refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <app-page-state
        [state]="list.state()"
        [thumbnail]="true"
        emptyIcon="storefront-outline"
        [emptyText]="status() === 'pending' ? 'ไม่มีร้านรอยืนยัน' : 'ไม่พบร้านค้า'"
        (retry)="list.reload()"
      >
        <ion-list>
          @for (shop of list.items(); track shop.id) {
            <ion-item [routerLink]="['/admin/shops', shop.id]" [detail]="true">
              <ion-avatar slot="start">
                @if (shop.imagePath) {
                  <img [src]="uploadsUrl + '/' + shop.imagePath" alt="" />
                } @else {
                  <ion-icon name="storefront-outline" class="placeholder" aria-hidden="true"></ion-icon>
                }
              </ion-avatar>
              <ion-label>
                <h3>{{ shop.name }}</h3>
                <p>{{ shop.ownerEmail }} · {{ shop.districtName }}, {{ shop.provinceName }}</p>
                <p>
                  @if (shop.verifySubmittedAt) { ส่งเอกสาร {{ thaiDateTime(shop.verifySubmittedAt) }} } @else { สมัคร {{ thaiDateTime(shop.createdAt) }} }
                </p>
              </ion-label>
              <div slot="end" class="end">
                <ion-badge [color]="statusColor[shop.verifyStatus]">{{ statusLabel[shop.verifyStatus] }}</ion-badge>
                @if (shop.ownerStatus === 'suspended') {
                  <ion-note color="danger">ถูกระงับ</ion-note>
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
    .placeholder {
      width: 100%;
      height: 100%;
      padding: 6px;
      color: var(--ion-color-medium);
      background: var(--ion-color-light);
      border-radius: 50%;
    }
    .end {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
  `,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonSegment,
    IonSegmentButton,
    IonSearchbar,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonList,
    IonItem,
    IonAvatar,
    IonIcon,
    IonLabel,
    IonBadge,
    IonNote,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    PageStateComponent,
  ],
})
export class AdminShopsPage {
  private readonly admin = inject(AdminService);

  readonly status = signal<StatusFilter>('pending');
  readonly query = signal('');
  readonly list = new PagedList<AdminShopRow>((page, ctx) =>
    this.admin.shops({ status: this.status(), q: this.query(), page }, ctx),
  );

  readonly uploadsUrl = environment.uploadsUrl;
  readonly statusLabel = VERIFY_STATUS_LABEL;
  readonly statusColor = VERIFY_STATUS_COLOR;
  readonly thaiDateTime = thaiDateTime;

  constructor() {
    addIcons({ storefrontOutline });
  }

  // Reload when coming back from a shop detail (it may have been verified / rejected)
  ionViewWillEnter(): void {
    void this.list.reload();
  }

  setStatus(status: StatusFilter): void {
    this.status.set(status);
    void this.list.reload();
  }

  setQuery(query: string): void {
    this.query.set(query.trim());
    void this.list.reload();
  }
}
