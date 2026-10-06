import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonList,
  IonListHeader,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, alertCircleOutline, hourglassOutline } from 'ionicons/icons';

import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { Applicant } from '../../../shared/models/application.model';
import { AuthService } from '../../../shared/services/auth.service';
import { ShopService } from '../../../shared/services/shop.service';
import { Loader } from '../../../shared/utils/loader';
import { ApplicantItemComponent } from '../../components/applicant-item.component';

@Component({
  selector: 'app-shop-dashboard',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>แดชบอร์ดร้าน</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="data.refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <h2 class="greeting ion-padding-horizontal">สวัสดี {{ auth.user()?.displayName }}</h2>

      <app-page-state [state]="data.state()" (retry)="data.load()">
        @if (data.value(); as d) {
          @if (d.verifyStatus !== 'verified') {
            <ion-card color="light" class="verify-banner">
              <ion-card-content>
                @switch (d.verifyStatus) {
                  @case ('pending') {
                    <p><ion-icon name="hourglass-outline" color="warning"></ion-icon> เอกสารของร้านกำลังรอแอดมินตรวจสอบ</p>
                  }
                  @case ('rejected') {
                    <p><ion-icon name="alert-circle-outline" color="danger"></ion-icon> ร้านไม่ผ่านการยืนยัน กรุณาดูเหตุผลและส่งเอกสารใหม่</p>
                  }
                  @default {
                    <p><ion-icon name="alert-circle-outline" color="warning"></ion-icon> ยืนยันร้านก่อนเพื่อเริ่มโพสต์ประกาศงาน</p>
                  }
                }
                <ion-button size="small" routerLink="/shop/profile">ไปที่โปรไฟล์ร้าน</ion-button>
              </ion-card-content>
            </ion-card>
          }

          <ion-grid>
            <ion-row>
              <ion-col size="6">
                <ion-card button routerLink="/shop/applicants" class="stat" [class.highlight]="d.pendingApplicants > 0">
                  <ion-card-content><strong>{{ d.pendingApplicants }}</strong><span>ผู้สมัครรอพิจารณา</span></ion-card-content>
                </ion-card>
              </ion-col>
              <ion-col size="6">
                <ion-card button routerLink="/shop/jobs" class="stat">
                  <ion-card-content><strong>{{ d.openJobs }}</strong><span>ประกาศที่เปิดรับ</span></ion-card-content>
                </ion-card>
              </ion-col>
              <ion-col size="6">
                <ion-card class="stat">
                  <ion-card-content><strong>{{ d.acceptedApplicants }}</strong><span>รับเข้าทำงานแล้ว</span></ion-card-content>
                </ion-card>
              </ion-col>
              <ion-col size="6">
                <ion-card button routerLink="/shop/jobs" class="stat" [class.warn]="d.expiringJobs > 0">
                  <ion-card-content><strong>{{ d.expiringJobs }}</strong><span>ใกล้หมดอายุ (3 วัน)</span></ion-card-content>
                </ion-card>
              </ion-col>
            </ion-row>
          </ion-grid>

          @if (d.verifyStatus === 'verified') {
            <div class="ion-padding-horizontal">
              <ion-button expand="block" routerLink="/shop/jobs/new"><ion-icon slot="start" name="add"></ion-icon>โพสต์งานใหม่</ion-button>
            </div>
          }

          @if (d.recentApplicants.length) {
            <ion-list>
              <ion-list-header>ผู้สมัครล่าสุดที่รอพิจารณา</ion-list-header>
              @for (a of d.recentApplicants; track a.id) {
                <app-applicant-item [applicant]="a" (click)="open(a)"></app-applicant-item>
              }
            </ion-list>
          }
        }
      </app-page-state>
    </ion-content>
  `,
  styles: `
    .greeting {
      margin: 16px 0 4px;
      font-size: 1.2rem;
      font-weight: 700;
    }
    .verify-banner p {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: 0 0 8px;
      color: var(--ion-text-color);
    }
    .stat ion-card-content {
      display: flex;
      flex-direction: column;
    }
    .stat strong {
      font-size: 1.8rem;
      color: var(--ion-text-color);
    }
    .stat.highlight {
      border: 2px solid var(--ion-color-warning);
    }
    .stat.warn strong {
      color: var(--ion-color-danger);
    }
  `,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonList,
    IonListHeader,
    ApplicantItemComponent,
    PageStateComponent,
  ],
})
export class ShopDashboardPage {
  private readonly shops = inject(ShopService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly data = new Loader((ctx) => this.shops.dashboard(ctx));

  constructor() {
    addIcons({ add, alertCircleOutline, hourglassOutline });
  }

  ionViewWillEnter(): void {
    void this.data.load();
    // Verification may have changed since login
    void this.auth.refresh().catch(() => undefined);
  }

  open(a: Applicant): void {
    void this.router.navigate(['/shop/applicants', a.id]);
  }
}
