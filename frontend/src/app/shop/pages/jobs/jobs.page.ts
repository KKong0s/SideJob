import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, briefcaseOutline } from 'ionicons/icons';

import { JobCardComponent } from '../../../shared/components/job-card/job-card.component';
import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { JOB_STATUS_COLOR, JOB_STATUS_LABEL, JobStatus, OwnJob } from '../../../shared/models/job.model';
import { AuthService } from '../../../shared/services/auth.service';
import { ShopService } from '../../../shared/services/shop.service';
import { thaiDate } from '../../../shared/utils/format';
import { PagedList } from '../../../shared/utils/paged-list';

type Filter = JobStatus | 'all';

@Component({
  selector: 'app-shop-jobs',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>ประกาศของฉัน</ion-title>
        @if (verified()) {
          <ion-buttons slot="end">
            <ion-button routerLink="/shop/jobs/new"><ion-icon slot="start" name="add"></ion-icon>โพสต์งาน</ion-button>
          </ion-buttons>
        }
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="filter()" (ionChange)="setFilter($any($event.detail.value))">
          <ion-segment-button value="open">เปิดรับ</ion-segment-button>
          <ion-segment-button value="closed">ปิดแล้ว</ion-segment-button>
          <ion-segment-button value="all">ทั้งหมด</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="list.refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (!verified()) {
        <ion-card color="light">
          <ion-card-content>
            <p>ร้านต้องผ่านการยืนยันก่อนจึงจะโพสต์ประกาศงานได้</p>
            <ion-button size="small" routerLink="/shop/profile">ไปยืนยันร้าน</ion-button>
          </ion-card-content>
        </ion-card>
      }

      <app-page-state
        [state]="list.state()"
        emptyIcon="briefcase-outline"
        [emptyText]="filter() === 'open' ? 'ยังไม่มีประกาศที่เปิดรับ' : 'ไม่มีประกาศ'"
        [actionText]="verified() ? 'โพสต์งานใหม่' : ''"
        (action)="router.navigateByUrl('/shop/jobs/new')"
        (retry)="list.reload()"
      >
        <ion-list>
          @for (job of list.items(); track job.id) {
            <app-job-card [job]="job" (click)="open(job)">
              <p meta>
                <ion-note>หมดอายุ {{ thaiDate(job.expiresOn) }}</ion-note>
              </p>
              <ng-container end>
                <ion-badge [color]="statusColor[job.status]">{{ statusLabel[job.status] }}</ion-badge>
                @if (job.pendingCount) {
                  <ion-badge color="warning">รอพิจารณา {{ job.pendingCount }}</ion-badge>
                }
                <ion-note>ผู้สมัคร {{ job.applicantCount }}</ion-note>
              </ng-container>
            </app-job-card>
          }
        </ion-list>
      </app-page-state>

      <ion-infinite-scroll [disabled]="!list.hasNext()" (ionInfinite)="list.loadMore($event)">
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>

      @if (verified()) {
        <ion-fab slot="fixed" vertical="bottom" horizontal="end">
          <ion-fab-button routerLink="/shop/jobs/new" aria-label="โพสต์งานใหม่"><ion-icon name="add"></ion-icon></ion-fab-button>
        </ion-fab>
      }
    </ion-content>
  `,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardContent,
    IonList,
    IonBadge,
    IonNote,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonFab,
    IonFabButton,
    JobCardComponent,
    PageStateComponent,
  ],
})
export class ShopJobsPage {
  private readonly shops = inject(ShopService);
  private readonly auth = inject(AuthService);
  readonly router = inject(Router);

  readonly filter = signal<Filter>('open');
  readonly list = new PagedList<OwnJob>((page, ctx) => this.shops.jobs(this.filter(), page, ctx));
  readonly verified = computed(() => this.auth.user()?.shop?.verifyStatus === 'verified');

  readonly statusLabel = JOB_STATUS_LABEL;
  readonly statusColor = JOB_STATUS_COLOR;
  readonly thaiDate = thaiDate;

  constructor() {
    addIcons({ add, briefcaseOutline });
  }

  // Tabs keep the page alive: reload whenever it is shown again (after posting / closing a job)
  ionViewWillEnter(): void {
    void this.list.reload();
  }

  setFilter(filter: Filter): void {
    this.filter.set(filter);
    void this.list.reload();
  }

  open(job: OwnJob): void {
    void this.router.navigate(['/shop/jobs', job.id]);
  }
}
