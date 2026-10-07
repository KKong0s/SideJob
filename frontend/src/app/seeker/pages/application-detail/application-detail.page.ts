import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { ApplicationReviewsComponent } from '../../../shared/components/application-reviews/application-reviews.component';
import { ContactButtonsComponent } from '../../../shared/components/contact-buttons/contact-buttons.component';
import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { APPLICATION_STATUS_COLOR, APPLICATION_STATUS_LABEL, MyApplication } from '../../../shared/models/application.model';
import { daysText, locationText, timeText, wageText } from '../../../shared/models/job.model';
import { ReviewInput } from '../../../shared/models/review.model';
import { ChatService } from '../../../shared/services/chat.service';
import { ReviewService } from '../../../shared/services/review.service';
import { SeekerService } from '../../../shared/services/seeker.service';
import { thaiDateTime } from '../../../shared/utils/format';
import { Loader } from '../../../shared/utils/loader';

@Component({
  selector: 'app-application-detail',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/seeker/applications" text="กลับ"></ion-back-button></ion-buttons>
        <ion-title>ใบสมัคร</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="app.refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <app-page-state [state]="app.state()" (retry)="app.load()">
        @if (app.value(); as a) {
          <div class="ion-padding head">
            <ion-badge [color]="statusColor[a.status]">{{ statusLabel[a.status] }}</ion-badge>
            <h1>{{ a.job.title }}</h1>
            <p>{{ a.job.shop.name }}</p>
          </div>

          @if (a.contact) {
            <ion-card color="light">
              <ion-card-header><ion-card-title>ติดต่อร้าน</ion-card-title></ion-card-header>
              <ion-card-content>
                <app-contact-buttons [contact]="a.contact" chatLabel="แชทกับร้าน" (chat)="openChat()"></app-contact-buttons>
              </ion-card-content>
            </ion-card>
          } @else if (a.status === 'pending') {
            <ion-note class="ion-padding-horizontal block">เบอร์โทรของร้านและปุ่มแชทจะแสดงที่นี่เมื่อร้านรับคุณเข้าทำงาน</ion-note>
          }

          <ion-list lines="full">
            <ion-item>
              <ion-label><p>ค่าจ้าง</p><h3>{{ wageText(a.job) }}</h3></ion-label>
            </ion-item>
            <ion-item>
              <ion-label><p>สถานที่</p><h3>{{ locationText(a.job) }}</h3></ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap"><p>วันเวลาทำงาน</p><h3>{{ daysText(a.job) }} · {{ timeText(a.job) }}</h3></ion-label>
            </ion-item>
            <ion-item [routerLink]="['/seeker/jobs', a.job.id]" [detail]="true">
              <ion-label>ดูประกาศงาน</ion-label>
            </ion-item>
          </ion-list>

          <ion-list lines="none" class="timeline">
            <ion-item><ion-label><p>สมัครเมื่อ</p><h3>{{ thaiDateTime(a.appliedAt) }}</h3></ion-label></ion-item>
            @if (a.decidedAt) {
              <ion-item>
                <ion-label><p>{{ a.status === 'rejected' ? 'ร้านปฏิเสธเมื่อ' : 'ร้านรับเมื่อ' }}</p><h3>{{ thaiDateTime(a.decidedAt) }}</h3></ion-label>
              </ion-item>
            }
            @if (a.cancelledAt && a.status === 'cancelled') {
              <ion-item><ion-label><p>ยกเลิกเมื่อ</p><h3>{{ thaiDateTime(a.cancelledAt) }}</h3></ion-label></ion-item>
            }
            @if (a.completedAt) {
              <ion-item><ion-label><p>งานเสร็จเมื่อ</p><h3>{{ thaiDateTime(a.completedAt) }}</h3></ion-label></ion-item>
            }
          </ion-list>

          <app-application-reviews [app]="a" otherName="ร้าน" [send]="sendReview" (done)="reviewed()"></app-application-reviews>

          @if (a.status === 'pending' || a.status === 'accepted') {
            <div class="ion-padding">
              <ion-button expand="block" fill="outline" color="danger" (click)="cancel(a)">ยกเลิกใบสมัคร</ion-button>
            </div>
          }
        }
      </app-page-state>
    </ion-content>
  `,
  styles: `
    .head h1 {
      margin: 8px 0 2px;
      font-size: 1.3rem;
      font-weight: 700;
    }
    .head p {
      margin: 0;
      color: var(--ion-color-medium);
    }
    .block {
      display: block;
      margin-bottom: 8px;
    }
    .timeline ion-item {
      --min-height: 40px;
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
    IonRefresher,
    IonRefresherContent,
    IonBadge,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonButton,
    ApplicationReviewsComponent,
    ContactButtonsComponent,
    PageStateComponent,
  ],
})
export class ApplicationDetailPage {
  private readonly seeker = inject(SeekerService);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);
  private readonly reviews = inject(ReviewService);
  private readonly chat = inject(ChatService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  readonly appId = computed(() => Number(this.id()));
  readonly app = new Loader((ctx) => this.seeker.application(this.appId(), ctx));

  readonly statusLabel = APPLICATION_STATUS_LABEL;
  readonly statusColor = APPLICATION_STATUS_COLOR;
  readonly wageText = wageText;
  readonly locationText = locationText;
  readonly daysText = daysText;
  readonly timeText = timeText;
  readonly thaiDateTime = thaiDateTime;

  async openChat(): Promise<void> {
    try {
      const conversation = await this.chat.byApplication(this.appId());
      await this.router.navigate(['/chat', conversation.id]);
    } catch {
      // the interceptor shows the error toast
    }
  }

  ionViewWillEnter(): void {
    void this.app.load();
  }

  readonly sendReview = (review: ReviewInput) => this.reviews.reviewShop(this.appId(), review);

  async reviewed(): Promise<void> {
    await this.app.load();
    const t = await this.toasts.create({ message: 'ส่งรีวิวแล้ว ขอบคุณครับ', color: 'success', duration: 2000, position: 'top' });
    await t.present();
  }

  async cancel(a: MyApplication): Promise<void> {
    const alert = await this.alerts.create({
      header: 'ยกเลิกใบสมัคร?',
      message: a.status === 'accepted' ? 'ร้านรับคุณแล้ว ร้านจะได้รับแจ้งว่าคุณยกเลิก' : 'สมัครงานนี้ใหม่ได้ภายหลังถ้าประกาศยังเปิดอยู่',
      buttons: [
        { text: 'ไม่ยกเลิก', role: 'cancel' },
        {
          text: 'ยกเลิกใบสมัคร',
          role: 'destructive',
          handler: () => void this.doCancel(),
        },
      ],
    });
    await alert.present();
  }

  private async doCancel(): Promise<void> {
    try {
      await this.seeker.cancel(this.appId());
      await this.app.load();
      const t = await this.toasts.create({ message: 'ยกเลิกใบสมัครแล้ว', color: 'medium', duration: 2000, position: 'top' });
      await t.present();
    } catch {
      // the interceptor shows the error toast
    }
  }
}
