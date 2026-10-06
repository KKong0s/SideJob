import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AlertController,
  IonAvatar,
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
import { checkmarkCircleOutline, closeCircleOutline, personCircleOutline } from 'ionicons/icons';

import { environment } from '../../../../environments/environment';
import { ContactButtonsComponent } from '../../../shared/components/contact-buttons/contact-buttons.component';
import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { APPLICATION_STATUS_COLOR, APPLICATION_STATUS_LABEL } from '../../../shared/models/application.model';
import { ShopService } from '../../../shared/services/shop.service';
import { thaiDateTime } from '../../../shared/utils/format';
import { Loader } from '../../../shared/utils/loader';

@Component({
  selector: 'app-applicant-detail',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/shop/applicants" text="กลับ"></ion-back-button></ion-buttons>
        <ion-title>ผู้สมัคร</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="app.refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <app-page-state [state]="app.state()" (retry)="app.load()">
        @if (app.value(); as a) {
          <div class="head">
            <ion-avatar>
              @if (a.seeker.avatarPath) {
                <img [src]="uploadsUrl + '/' + a.seeker.avatarPath" alt="รูปผู้สมัคร" />
              } @else {
                <ion-icon name="person-circle-outline" aria-hidden="true"></ion-icon>
              }
            </ion-avatar>
            <h2>{{ a.seeker.fullName }}</h2>
            @if (a.seeker.age) { <p>อายุ {{ a.seeker.age }} ปี</p> }
            <ion-badge [color]="statusColor[a.status]">{{ statusLabel[a.status] }}</ion-badge>
          </div>

          @if (a.contact) {
            <ion-card color="light">
              <ion-card-header><ion-card-title>ติดต่อผู้สมัคร</ion-card-title></ion-card-header>
              <ion-card-content><app-contact-buttons [contact]="a.contact"></app-contact-buttons></ion-card-content>
            </ion-card>
          }

          <ion-list lines="full">
            <ion-item [routerLink]="['/shop/jobs', a.job.id]" [detail]="true">
              <ion-label><p>สมัครงาน</p><h3>{{ a.job.title }}</h3></ion-label>
            </ion-item>
            <ion-item>
              <ion-label><p>สมัครเมื่อ</p><h3>{{ thaiDateTime(a.appliedAt) }}</h3></ion-label>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap"><p>ทักษะ / ประสบการณ์</p><h3>{{ a.seeker.skills || '-' }}</h3></ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>แนะนำตัว</p><h3 class="pre">{{ a.seeker.bio || '-' }}</h3></ion-label>
            </ion-item>
          </ion-list>

          @if (a.status === 'pending') {
            <ion-note class="ion-padding-horizontal note">เบอร์โทรและ LINE ของผู้สมัครจะแสดงหลังกดรับเข้าทำงาน</ion-note>
            <div class="actions">
              <ion-button color="success" [disabled]="busy()" (click)="decide('accept')">
                <ion-icon slot="start" name="checkmark-circle-outline"></ion-icon>รับเข้าทำงาน
              </ion-button>
              <ion-button color="danger" fill="outline" [disabled]="busy()" (click)="decide('reject')">
                <ion-icon slot="start" name="close-circle-outline"></ion-icon>ปฏิเสธ
              </ion-button>
            </div>
          }
        }
      </app-page-state>
    </ion-content>
  `,
  styles: `
    .head {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 16px 8px;
      text-align: center;
    }
    .head ion-avatar {
      width: 88px;
      height: 88px;
    }
    .head ion-avatar ion-icon {
      width: 100%;
      height: 100%;
      color: var(--ion-color-medium);
    }
    .head h2 {
      margin: 10px 0 2px;
      font-size: 1.2rem;
      font-weight: 700;
    }
    .head p {
      margin: 0 0 6px;
      color: var(--ion-color-medium);
    }
    .pre {
      white-space: pre-line;
    }
    .note {
      display: block;
      margin-top: 12px;
    }
    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 12px 16px 24px;
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
    IonAvatar,
    IonIcon,
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
    ContactButtonsComponent,
    PageStateComponent,
  ],
})
export class ApplicantDetailPage {
  private readonly shops = inject(ShopService);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);

  readonly id = input.required<string>();
  readonly appId = computed(() => Number(this.id()));
  readonly app = new Loader((ctx) => this.shops.application(this.appId(), ctx));
  readonly busy = signal(false);

  readonly uploadsUrl = environment.uploadsUrl;
  readonly statusLabel = APPLICATION_STATUS_LABEL;
  readonly statusColor = APPLICATION_STATUS_COLOR;
  readonly thaiDateTime = thaiDateTime;

  constructor() {
    addIcons({ checkmarkCircleOutline, closeCircleOutline, personCircleOutline });
  }

  ionViewWillEnter(): void {
    void this.app.load();
  }

  async decide(action: 'accept' | 'reject'): Promise<void> {
    const name = this.app.value()?.seeker.fullName ?? '';
    const accept = action === 'accept';
    const alert = await this.alerts.create({
      header: accept ? `รับ ${name} เข้าทำงาน?` : `ปฏิเสธ ${name}?`,
      message: accept
        ? 'ทั้งสองฝ่ายจะเห็นเบอร์โทรและ LINE ของกันและกัน และผู้สมัครจะได้รับแจ้งเตือน'
        : 'ผู้สมัครจะได้รับแจ้งเตือน และสมัครงานนี้ซ้ำไม่ได้',
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { text: accept ? 'รับเข้าทำงาน' : 'ปฏิเสธ', role: accept ? undefined : 'destructive', handler: () => void this.run(action) },
      ],
    });
    await alert.present();
  }

  private async run(action: 'accept' | 'reject'): Promise<void> {
    this.busy.set(true);
    try {
      if (action === 'accept') await this.shops.accept(this.appId());
      else await this.shops.reject(this.appId());
      await this.app.load();
      const t = await this.toasts.create({
        message: action === 'accept' ? 'รับเข้าทำงานแล้ว' : 'ปฏิเสธแล้ว',
        color: action === 'accept' ? 'success' : 'medium',
        duration: 2000,
        position: 'top',
      });
      await t.present();
    } catch {
      // the interceptor shows the error toast
    } finally {
      this.busy.set(false);
    }
  }
}
