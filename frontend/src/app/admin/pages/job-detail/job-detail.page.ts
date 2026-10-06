import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { JobGalleryComponent } from '../../../shared/components/job-gallery/job-gallery.component';
import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { APPLICATION_STATUS_COLOR, APPLICATION_STATUS_LABEL, ApplicationStatus } from '../../../shared/models/application.model';
import { JOB_STATUS_COLOR, JOB_STATUS_LABEL, daysText, locationText, timeText, wageText } from '../../../shared/models/job.model';
import { thaiDate, thaiDateTime } from '../../../shared/utils/format';
import { Loader } from '../../../shared/utils/loader';
import { PagedList } from '../../../shared/utils/paged-list';
import { AdminJobApplicant } from '../../admin.model';
import { AdminService } from '../../admin.service';
import { askReason } from '../../ask-reason';

/** Admin view of any job: details, applicants (read-only), hide / unhide */
@Component({
  selector: 'app-admin-job-detail',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/admin/jobs" text="กลับ"></ion-back-button></ion-buttons>
        <ion-title>รายละเอียดประกาศ</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <app-page-state [state]="job.state()" (retry)="job.load()">
        @if (job.value(); as j) {
          <div class="wrap">
            <div class="ion-padding">
              <ion-badge [color]="jobStatusColor[j.status]">{{ jobStatusLabel[j.status] }}</ion-badge>
              @if (j.openReports) { <ion-badge color="danger">รายงานที่ยังไม่จัดการ {{ j.openReports }}</ion-badge> }
              <h1>{{ j.title }}</h1>
              <p class="meta">{{ j.shop.name }} · {{ j.category.name }} · โพสต์ {{ thaiDateTime(j.createdAt) }} · หมดอายุ {{ thaiDate(j.expiresOn) }}</p>
              <div class="actions">
                @if (j.status === 'hidden') {
                  <ion-button color="success" fill="outline" (click)="setHidden(false)">เลิกซ่อน (กลับเป็นปิดรับ)</ion-button>
                } @else {
                  <ion-button color="danger" (click)="setHidden(true)">ซ่อนประกาศ</ion-button>
                }
                <ion-button fill="clear" [routerLink]="['/admin/shops', j.shop.id]">ดูร้าน</ion-button>
              </div>
            </div>

            <app-job-gallery [images]="j.images ?? []"></app-job-gallery>

            <ion-list lines="full">
              <ion-item><ion-label><p>ค่าจ้าง</p><h3>{{ wageText(j) }}</h3></ion-label></ion-item>
              <ion-item><ion-label><p>สถานที่</p><h3>{{ locationText(j) }}</h3></ion-label></ion-item>
              <ion-item><ion-label class="ion-text-wrap"><p>วันเวลา</p><h3>{{ daysText(j) }} · {{ timeText(j) }}</h3></ion-label></ion-item>
              <ion-item><ion-label class="ion-text-wrap"><p>รายละเอียด</p><h3 class="pre">{{ j.description }}</h3></ion-label></ion-item>
            </ion-list>

            <ion-card>
              <ion-card-header>
                <ion-card-title>ผู้สมัคร</ion-card-title>
                <div class="counts">
                  @for (s of statuses; track s) {
                    @if (j.applicationCounts[s]) {
                      <ion-badge [color]="appStatusColor[s]">{{ appStatusLabel[s] }} {{ j.applicationCounts[s] }}</ion-badge>
                    }
                  }
                </div>
              </ion-card-header>
              <ion-card-content class="no-pad">
                <app-page-state [state]="applicants.state()" emptyText="ยังไม่มีผู้สมัคร" (retry)="applicants.reload()">
                  <ion-list>
                    @for (a of applicants.items(); track a.id) {
                      <ion-item>
                        <ion-label>
                          <h3>{{ a.seeker.fullName }}</h3>
                          <p>{{ a.seeker.email }} · สมัคร {{ thaiDateTime(a.appliedAt) }}</p>
                        </ion-label>
                        <ion-badge slot="end" [color]="appStatusColor[a.status]">{{ appStatusLabel[a.status] }}</ion-badge>
                      </ion-item>
                    }
                  </ion-list>
                  @if (applicants.hasNext()) {
                    <ion-button expand="block" fill="clear" (click)="applicants.loadMore()">ดูเพิ่ม</ion-button>
                  }
                </app-page-state>
                <ion-note class="ion-padding block">แอดมินดูรายชื่อและสถานะได้อย่างเดียว ไม่เห็นช่องทางติดต่อ</ion-note>
              </ion-card-content>
            </ion-card>
          </div>
        }
      </app-page-state>
    </ion-content>
  `,
  styles: `
    .wrap {
      max-width: 960px;
      margin: 0 auto;
    }
    h1 {
      margin: 8px 0 2px;
      font-size: 1.3rem;
      font-weight: 700;
    }
    .meta {
      margin: 0;
      color: var(--ion-color-medium);
    }
    .actions {
      margin-top: 8px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .counts {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-top: 4px;
    }
    .pre {
      white-space: pre-line;
    }
    .no-pad {
      padding: 0;
    }
    .block {
      display: block;
    }
  `,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonBadge,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    JobGalleryComponent,
    PageStateComponent,
  ],
})
export class AdminJobDetailPage {
  private readonly admin = inject(AdminService);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);

  readonly id = input.required<string>();
  readonly jobId = computed(() => Number(this.id()));
  readonly job = new Loader((ctx) => this.admin.job(this.jobId(), ctx));
  readonly applicants = new PagedList<AdminJobApplicant>((page, ctx) => this.admin.jobApplicants(this.jobId(), page, ctx));

  readonly statuses: ApplicationStatus[] = ['pending', 'accepted', 'completed', 'rejected', 'cancelled'];
  readonly jobStatusLabel = JOB_STATUS_LABEL;
  readonly jobStatusColor = JOB_STATUS_COLOR;
  readonly appStatusLabel = APPLICATION_STATUS_LABEL;
  readonly appStatusColor = APPLICATION_STATUS_COLOR;
  readonly wageText = wageText;
  readonly locationText = locationText;
  readonly daysText = daysText;
  readonly timeText = timeText;
  readonly thaiDate = thaiDate;
  readonly thaiDateTime = thaiDateTime;

  ionViewWillEnter(): void {
    void this.job.load();
    void this.applicants.reload();
  }

  async setHidden(hidden: boolean): Promise<void> {
    const reason = await askReason(this.alerts, this.toasts, {
      header: hidden ? 'ซ่อนประกาศนี้?' : 'เลิกซ่อนประกาศนี้?',
      message: hidden
        ? 'ประกาศจะหายจากหน้าค้นหา ใบสมัครที่รอพิจารณาจะถูกปฏิเสธ รายงานของประกาศนี้จะถูกปิด และร้านจะได้รับแจ้ง'
        : 'ประกาศจะกลับมาเป็นสถานะ "ปิดรับแล้ว" ร้านต่ออายุเพื่อเปิดรับใหม่ได้เอง',
      confirmText: hidden ? 'ซ่อนประกาศ' : 'เลิกซ่อน',
      required: false,
      destructive: hidden,
    });
    if (reason === null) return;
    try {
      await this.admin.setJobHidden(this.jobId(), hidden, reason);
      await Promise.all([this.job.load(), this.applicants.reload()]);
      const t = await this.toasts.create({ message: hidden ? 'ซ่อนประกาศแล้ว' : 'เลิกซ่อนแล้ว', color: 'success', duration: 2000, position: 'top' });
      await t.present();
    } catch {
      // the interceptor shows the error toast
    }
  }
}
