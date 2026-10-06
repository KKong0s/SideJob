import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, hourglassOutline } from 'ionicons/icons';

import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-shop-dashboard',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>แดชบอร์ดร้าน</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <h2 class="greeting">สวัสดี {{ auth.user()?.displayName }}</h2>

      @if (verifyStatus() !== 'verified') {
        <ion-card color="light" class="verify-banner">
          <ion-card-content>
            @switch (verifyStatus()) {
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
    </ion-content>
  `,
  styles: `
    .greeting {
      margin: 0 0 12px;
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
  `,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonButton, IonIcon],
})
export class ShopDashboardPage {
  readonly auth = inject(AuthService);
  readonly verifyStatus = computed(() => this.auth.user()?.shop?.verifyStatus ?? 'unsubmitted');

  constructor() {
    addIcons({ alertCircleOutline, hourglassOutline });
  }
}
