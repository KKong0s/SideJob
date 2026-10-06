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
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeCircleOutline, createOutline, peopleOutline, refreshOutline } from 'ionicons/icons';

import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import {
  JOB_STATUS_COLOR,
  JOB_STATUS_LABEL,
  OwnJob,
  daysText,
  locationText,
  timeText,
  wageText,
} from '../../../shared/models/job.model';
import { ShopService } from '../../../shared/services/shop.service';
import { thaiDate, thaiDateTime, todayIso } from '../../../shared/utils/format';
import { Loader } from '../../../shared/utils/loader';

/** Shop owner's view of one of its jobs, with close / renew / edit actions */
@Component({
  selector: 'app-shop-job-detail',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/shop/jobs" text="กลับ"></ion-back-button></ion-buttons>
        <ion-title>รายละเอียดประกาศ</ion-title>
        @if (job.value()?.status !== 'hidden') {
          <ion-buttons slot="end">
            <ion-button [routerLink]="['/shop/jobs', jobId(), 'edit']" aria-label="แก้ไข"><ion-icon slot="icon-only" name="create-outline"></ion-icon></ion-button>
          </ion-buttons>
        }
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="job.refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <app-page-state [state]="job.state()" (retry)="job.load()">
        @if (job.value(); as j) {
          <div class="ion-padding">
            <ion-badge [color]="statusColor[j.status]">{{ statusLabel[j.status] }}</ion-badge>
            <h1>{{ j.title }}</h1>
            <p class="meta">{{ j.category.name }} · โพสต์เมื่อ {{ thaiDateTime(j.createdAt) }}</p>
          </div>

          <ion-card>
            <ion-card-content class="stats">
              <div><strong>{{ j.applicantCount }}</strong><span>ผู้สมัคร</span></div>
              <div><strong>{{ j.pendingCount }}</strong><span>รอพิจารณา</span></div>
              <div>
                <strong [class.warn]="expiringSoon()">{{ thaiDate(j.expiresOn) }}</strong>
                <span>{{ j.status === 'open' ? 'หมดอายุ' : 'วันหมดอายุเดิม' }}</span>
              </div>
            </ion-card-content>
          </ion-card>

          <div class="actions ion-padding-horizontal">
            <ion-button expand="block" [routerLink]="['/shop/applicants']" [queryParams]="{ jobId: j.id }">
              <ion-icon slot="start" name="people-outline"></ion-icon>ดูผู้สมัคร
            </ion-button>
            @if (j.status !== 'hidden') {
              <ion-button expand="block" fill="outline" (click)="renew(j)">
                <ion-icon slot="start" name="refresh-outline"></ion-icon>{{ j.status === 'open' ? 'ต่ออายุ 30 วัน' : 'เปิดรับอีกครั้ง (ต่ออายุ)' }}
              </ion-button>
            }
            @if (j.status === 'open') {
              <ion-button expand="block" fill="outline" color="danger" (click)="close(j)">
                <ion-icon slot="start" name="close-circle-outline"></ion-icon>ปิดรับสมัคร
              </ion-button>
            }
          </div>
          @if (j.status === 'hidden') {
            <ion-note class="ion-padding">ประกาศนี้ถูกแอดมินซ่อน แก้ไขหรือต่ออายุไม่ได้</ion-note>
          }

          <ion-list lines="full">
            <ion-item>
              <ion-label><p>ค่าจ้าง</p><h3 class="wage">{{ wageText(j) }}</h3></ion-label>
            </ion-item>
            <ion-item>
              <ion-label><p>สถานที่</p><h3>{{ locationText(j) }}</h3></ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap"><p>วันเวลาทำงาน</p><h3>{{ daysText(j) }} · {{ timeText(j) }}</h3></ion-label>
            </ion-item>
            @if (j.minAge) {
              <ion-item>
                <ion-label><p>อายุขั้นต่ำ</p><h3>{{ j.minAge }} ปี</h3></ion-label>
              </ion-item>
            }
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>รายละเอียด</p><h3 class="pre">{{ j.description }}</h3></ion-label>
            </ion-item>
          </ion-list>
        }
      </app-page-state>
    </ion-content>
  `,
  styles: `
    h1 {
      margin: 8px 0 4px;
      font-size: 1.35rem;
      font-weight: 700;
    }
    .meta {
      margin: 0;
      color: var(--ion-color-medium);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      text-align: center;
    }
    .stats div {
      display: flex;
      flex-direction: column;
    }
    .stats strong {
      font-size: 1.1rem;
      color: var(--ion-text-color);
    }
    .stats strong.warn {
      color: var(--ion-color-danger);
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 8px;
    }
    .wage {
      color: var(--ion-color-success-shade);
      font-weight: 600;
    }
    .pre {
      white-space: pre-line;
    }
  `,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonBadge,
    IonCard,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    PageStateComponent,
  ],
})
export class ShopJobDetailPage {
  private readonly shops = inject(ShopService);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);

  readonly id = input.required<string>();
  readonly jobId = computed(() => Number(this.id()));
  readonly job = new Loader((ctx) => this.shops.job(this.jobId(), ctx));
  readonly expiringSoon = computed(() => {
    const j = this.job.value();
    return !!j && j.status === 'open' && j.expiresOn <= todayIso(3);
  });

  readonly statusLabel = JOB_STATUS_LABEL;
  readonly statusColor = JOB_STATUS_COLOR;
  readonly thaiDate = thaiDate;
  readonly thaiDateTime = thaiDateTime;
  readonly wageText = wageText;
  readonly locationText = locationText;
  readonly daysText = daysText;
  readonly timeText = timeText;

  constructor() {
    addIcons({ closeCircleOutline, createOutline, peopleOutline, refreshOutline });
  }

  ionViewWillEnter(): void {
    void this.job.load();
  }

  async close(job: OwnJob): Promise<void> {
    const pending = job.pendingCount ? ` ใบสมัครที่รอพิจารณา ${job.pendingCount} ใบจะถูกปฏิเสธอัตโนมัติ` : '';
    const alert = await this.alerts.create({
      header: 'ปิดรับสมัคร?',
      message: `ประกาศจะไม่แสดงในหน้าค้นหาอีก${pending} (เปิดอีกครั้งได้ด้วยการต่ออายุ)`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ปิดรับสมัคร',
          role: 'destructive',
          handler: () => void this.run(() => this.shops.closeJob(job.id), 'ปิดรับสมัครแล้ว'),
        },
      ],
    });
    await alert.present();
  }

  async renew(job: OwnJob): Promise<void> {
    await this.run(async () => {
      const expiresOn = await this.shops.renewJob(job.id);
      return `ต่ออายุถึง ${thaiDate(expiresOn)}`;
    });
  }

  private async run(action: () => Promise<unknown>, message?: string): Promise<void> {
    try {
      const result = await action();
      const text = message ?? String(result);
      const t = await this.toasts.create({ message: text, color: 'success', duration: 2500, position: 'top' });
      await t.present();
      await this.job.load();
    } catch {
      // the interceptor shows the error toast
    }
  }
}
