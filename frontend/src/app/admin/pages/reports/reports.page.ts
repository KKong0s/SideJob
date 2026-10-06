import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AlertController,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonMenuButton,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { flagOutline } from 'ionicons/icons';

import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { StarsComponent } from '../../../shared/components/stars/stars.component';
import { JOB_STATUS_LABEL } from '../../../shared/models/job.model';
import { thaiDateTime } from '../../../shared/utils/format';
import { PagedList } from '../../../shared/utils/paged-list';
import { AdminReport } from '../../admin.model';
import { AdminService } from '../../admin.service';
import { askReason } from '../../ask-reason';

type Status = 'open' | 'resolved' | 'dismissed';

const STATUS_LABEL: Record<Status, string> = { open: 'รอจัดการ', resolved: 'จัดการแล้ว', dismissed: 'ยกเลิก' };

@Component({
  selector: 'app-admin-reports',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button></ion-menu-button></ion-buttons>
        <ion-title>รายงาน</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="status()" (ionChange)="setStatus($any($event.detail.value))">
          <ion-segment-button value="open">รอจัดการ</ion-segment-button>
          <ion-segment-button value="resolved">จัดการแล้ว</ion-segment-button>
          <ion-segment-button value="dismissed">ยกเลิก</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="list.refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <app-page-state
        [state]="list.state()"
        emptyIcon="flag-outline"
        [emptyText]="status() === 'open' ? 'ไม่มีรายงานที่รอจัดการ' : 'ไม่มีรายการ'"
        (retry)="list.reload()"
      >
        <div class="wrap">
          @for (r of list.items(); track r.id) {
            <ion-card>
              <ion-card-header>
                <ion-card-subtitle>
                  {{ r.targetType === 'job' ? 'ประกาศงาน' : 'รีวิว' }} #{{ r.targetId }} · {{ thaiDateTime(r.createdAt) }}
                  <ion-badge [color]="r.status === 'open' ? 'warning' : 'medium'">{{ statusLabel[r.status] }}</ion-badge>
                </ion-card-subtitle>
                <ion-card-title class="reason">"{{ r.reason }}"</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p class="who">รายงานโดย {{ r.reporterEmail }}</p>
                @if (r.target; as t) {
                  <div class="target">
                    @if (isJob(r)) {
                      <strong>{{ jobTarget(r).title }}</strong> · {{ jobTarget(r).shopName }}
                      <ion-badge color="light">{{ jobStatusLabel[jobTarget(r).status] ?? jobTarget(r).status }}</ion-badge>
                      <div><ion-button size="small" fill="clear" [routerLink]="['/admin/jobs', r.targetId]">ดูประกาศ</ion-button></div>
                    } @else {
                      <app-stars [value]="reviewTarget(r).rating"></app-stars> โดย {{ reviewTarget(r).author }}
                      @if (reviewTarget(r).isHidden) { <ion-badge color="medium">ซ่อนแล้ว</ion-badge> }
                      <p class="comment">{{ reviewTarget(r).comment || '(ไม่มีข้อความ)' }}</p>
                    }
                  </div>
                } @else {
                  <ion-note>ไม่พบเป้าหมาย (อาจถูกลบไปแล้ว)</ion-note>
                }
                @if (r.status === 'open') {
                  <div class="actions">
                    <ion-button size="small" color="danger" (click)="resolve(r, true)">
                      {{ r.targetType === 'job' ? 'ซ่อนประกาศ' : 'ซ่อนรีวิว' }} + ปิดรายงาน
                    </ion-button>
                    <ion-button size="small" fill="outline" (click)="resolve(r, false)">ปิดรายงาน (ไม่ซ่อน)</ion-button>
                    <ion-button size="small" fill="clear" color="medium" (click)="dismiss(r)">ไม่ผิดกฎ / ยกเลิก</ion-button>
                  </div>
                } @else if (r.resolverEmail) {
                  <ion-note>โดย {{ r.resolverEmail }} · {{ thaiDateTime(r.resolvedAt) }}</ion-note>
                }
              </ion-card-content>
            </ion-card>
          }
        </div>
      </app-page-state>
      <ion-infinite-scroll [disabled]="!list.hasNext()" (ionInfinite)="list.loadMore($event)">
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  `,
  styles: `
    .wrap {
      max-width: 960px;
    }
    .reason {
      font-size: 1.05rem;
    }
    .who {
      margin: 0 0 8px;
    }
    .target {
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--ion-color-light);
      color: var(--ion-text-color);
    }
    .comment {
      margin: 4px 0 0;
      white-space: pre-line;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 8px;
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
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonButton,
    IonNote,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    PageStateComponent,
    StarsComponent,
  ],
})
export class AdminReportsPage {
  private readonly admin = inject(AdminService);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);

  readonly status = signal<Status>('open');
  readonly list = new PagedList<AdminReport>((page, ctx) => this.admin.reports({ status: this.status(), page }, ctx));
  readonly statusLabel = STATUS_LABEL;
  readonly jobStatusLabel: Record<string, string> = JOB_STATUS_LABEL;
  readonly thaiDateTime = thaiDateTime;

  constructor() {
    addIcons({ flagOutline });
  }

  ionViewWillEnter(): void {
    void this.list.reload();
  }

  setStatus(status: Status): void {
    this.status.set(status);
    void this.list.reload();
  }

  isJob(r: AdminReport): boolean {
    return r.targetType === 'job';
  }

  jobTarget(r: AdminReport): { title: string; status: string; shopName: string } {
    return r.target as { title: string; status: string; shopName: string };
  }

  reviewTarget(r: AdminReport): { rating: number; comment: string | null; isHidden: boolean; author: string } {
    return r.target as { rating: number; comment: string | null; isHidden: boolean; author: string };
  }

  async resolve(r: AdminReport, hideTarget: boolean): Promise<void> {
    const what = r.targetType === 'job' ? 'ประกาศ' : 'รีวิว';
    const reason = await askReason(this.alerts, this.toasts, {
      header: hideTarget ? `ซ่อน${what}และปิดรายงาน?` : 'ปิดรายงานโดยไม่ซ่อน?',
      message: hideTarget ? `รายงานอื่นของ${what}นี้จะถูกปิดไปด้วย` : undefined,
      confirmText: 'ยืนยัน',
      required: false,
      destructive: hideTarget,
    });
    if (reason === null) return;
    await this.run(() => this.admin.resolveReport(r.id, hideTarget, reason));
  }

  async dismiss(r: AdminReport): Promise<void> {
    const reason = await askReason(this.alerts, this.toasts, { header: 'ยกเลิกรายงานนี้?', confirmText: 'ยกเลิกรายงาน', required: false });
    if (reason === null) return;
    await this.run(() => this.admin.dismissReport(r.id, reason));
  }

  private async run(action: () => Promise<void>): Promise<void> {
    try {
      await action();
      await this.list.reload();
      const t = await this.toasts.create({ message: 'บันทึกแล้ว', color: 'success', duration: 2000, position: 'top' });
      await t.present();
    } catch {
      // the interceptor shows the error toast
    }
  }
}
