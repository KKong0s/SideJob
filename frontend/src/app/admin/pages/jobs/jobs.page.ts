import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
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
import { briefcaseOutline } from 'ionicons/icons';

import { JobCardComponent } from '../../../shared/components/job-card/job-card.component';
import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { JOB_STATUS_COLOR, JOB_STATUS_LABEL, JobStatus } from '../../../shared/models/job.model';
import { PagedList } from '../../../shared/utils/paged-list';
import { AdminJobRow } from '../../admin.model';
import { AdminService } from '../../admin.service';

@Component({
  selector: 'app-admin-jobs',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button></ion-menu-button></ion-buttons>
        <ion-title>ประกาศ</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="status()" (ionChange)="setStatus($any($event.detail.value))">
          <ion-segment-button value="all">ทั้งหมด</ion-segment-button>
          <ion-segment-button value="open">เปิดรับ</ion-segment-button>
          <ion-segment-button value="closed">ปิดแล้ว</ion-segment-button>
          <ion-segment-button value="hidden">ถูกซ่อน</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar placeholder="ค้นหาชื่องานหรือชื่อร้าน" [debounce]="400" (ionInput)="setQuery($event.detail.value ?? '')"></ion-searchbar>
        <ion-buttons slot="end">
          <ion-button [color]="reportedOnly() ? 'danger' : 'medium'" (click)="toggleReported()">
            {{ reportedOnly() ? 'เฉพาะที่ถูกรายงาน' : 'ทุกประกาศ' }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="list.refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <app-page-state [state]="list.state()" skeleton="job" emptyIcon="briefcase-outline" emptyText="ไม่พบประกาศ" (retry)="list.reload()">
        <ion-list>
          @for (job of list.items(); track job.id) {
            <app-job-card [job]="job" [shopName]="job.shop.name" [shopImage]="job.shop.imagePath" (click)="open(job)">
              <ng-container end>
                <ion-badge [color]="statusColor[job.status]">{{ statusLabel[job.status] }}</ion-badge>
                @if (job.openReports) {
                  <ion-badge color="danger">รายงาน {{ job.openReports }}</ion-badge>
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
    </ion-content>
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
    IonBadge,
    IonNote,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    JobCardComponent,
    PageStateComponent,
  ],
})
export class AdminJobsPage {
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);

  readonly status = signal<JobStatus | 'all'>('all');
  readonly query = signal('');
  readonly reportedOnly = signal(false);
  readonly list = new PagedList<AdminJobRow>((page, ctx) =>
    this.admin.jobs(
      { status: this.status() === 'all' ? null : this.status(), q: this.query(), reported: this.reportedOnly() ? 1 : null, page },
      ctx,
    ),
  );
  readonly statusLabel = JOB_STATUS_LABEL;
  readonly statusColor = JOB_STATUS_COLOR;

  constructor() {
    addIcons({ briefcaseOutline });
  }

  ionViewWillEnter(): void {
    void this.list.reload();
  }

  setStatus(status: JobStatus | 'all'): void {
    this.status.set(status);
    void this.list.reload();
  }

  setQuery(q: string): void {
    this.query.set(q.trim());
    void this.list.reload();
  }

  toggleReported(): void {
    this.reportedOnly.update((v) => !v);
    void this.list.reload();
  }

  open(job: AdminJobRow): void {
    void this.router.navigate(['/admin/jobs', job.id]);
  }
}
