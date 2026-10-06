import { Component, inject, signal } from '@angular/core';
import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
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
import { createOutline, locationOutline, personCircleOutline } from 'ionicons/icons';

import { environment } from '../../../../environments/environment';
import { LogoutButtonComponent } from '../../../shared/components/logout-button/logout-button.component';
import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { SeekerArea } from '../../../shared/models/search.model';
import { SeekerProfileFormComponent } from '../../../shared/pages/onboarding/seeker-profile-form.component';
import { AuthService } from '../../../shared/services/auth.service';
import { GeoService } from '../../../shared/services/geo.service';
import { SeekerService } from '../../../shared/services/seeker.service';
import { ageFrom, thaiDate } from '../../../shared/utils/format';
import { Loader } from '../../../shared/utils/loader';

@Component({
  selector: 'app-seeker-profile',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>โปรไฟล์</ion-title>
        <ion-buttons slot="end"><app-logout-button></app-logout-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="profile.refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <app-page-state [state]="profile.state()" (retry)="profile.load()">
        @if (profile.value(); as p) {
          @if (editing()) {
            <div class="ion-padding">
              <app-seeker-profile-form mode="edit" [initial]="p" (saved)="onSaved()"></app-seeker-profile-form>
              <ion-button expand="block" fill="clear" color="medium" (click)="editing.set(false)">ยกเลิก</ion-button>
            </div>
          } @else {
            <div class="head">
              <ion-avatar>
                @if (p.avatarPath) {
                  <img [src]="uploadsUrl + '/' + p.avatarPath" alt="รูปโปรไฟล์" />
                } @else {
                  <ion-icon name="person-circle-outline" aria-hidden="true"></ion-icon>
                }
              </ion-avatar>
              <h2>{{ p.fullName }}</h2>
              <p>{{ auth.user()?.email }}</p>
              <ion-button size="small" fill="outline" (click)="startEdit()">
                <ion-icon slot="start" name="create-outline"></ion-icon>แก้ไขโปรไฟล์
              </ion-button>
            </div>

            <ion-card>
              <ion-card-header><ion-card-title>พื้นที่ที่สนใจ</ion-card-title></ion-card-header>
              <ion-card-content>
                <div class="chips">
                  @for (a of p.areas; track $index) {
                    <ion-chip color="primary" outline="true">
                      <ion-icon name="location-outline"></ion-icon>
                      <ion-label>{{ areaText(a) }}</ion-label>
                    </ion-chip>
                  }
                </div>
              </ion-card-content>
            </ion-card>

            <ion-card>
              <ion-card-header><ion-card-title>ข้อมูลส่วนตัว</ion-card-title></ion-card-header>
              <ion-card-content>
                <ion-list lines="full" class="details">
                  <ion-item>
                    <ion-label><p>วันเกิด</p><h3>{{ thaiDate(p.birthDate) }} (อายุ {{ ageFrom(p.birthDate) }} ปี)</h3></ion-label>
                  </ion-item>
                  <ion-item>
                    <ion-label><p>เบอร์โทร</p><h3>{{ p.phone || '-' }}</h3></ion-label>
                  </ion-item>
                  <ion-item>
                    <ion-label><p>LINE ID</p><h3>{{ p.lineId || '-' }}</h3></ion-label>
                  </ion-item>
                  <ion-item>
                    <ion-label class="ion-text-wrap"><p>ทักษะ / ประสบการณ์</p><h3>{{ p.skills || '-' }}</h3></ion-label>
                  </ion-item>
                  <ion-item lines="none">
                    <ion-label class="ion-text-wrap"><p>แนะนำตัว</p><h3 class="pre">{{ p.bio || '-' }}</h3></ion-label>
                  </ion-item>
                </ion-list>
                <ion-note>ร้านจะเห็นเบอร์โทรและ LINE ID หลังรับคุณเข้าทำงานเท่านั้น</ion-note>
              </ion-card-content>
            </ion-card>
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
      padding: 20px 16px 4px;
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
      margin: 0 0 8px;
      color: var(--ion-color-medium);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
    }
    .details ion-item {
      --padding-start: 0;
    }
    .pre {
      white-space: pre-line;
    }
  `,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonAvatar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonChip,
    IonLabel,
    IonList,
    IonItem,
    IonNote,
    LogoutButtonComponent,
    PageStateComponent,
    SeekerProfileFormComponent,
  ],
})
export class SeekerProfilePage {
  private readonly seeker = inject(SeekerService);
  private readonly geo = inject(GeoService);
  private readonly toasts = inject(ToastController);
  readonly auth = inject(AuthService);

  readonly profile = new Loader((ctx) => this.seeker.profile(ctx));
  readonly editing = signal(false);

  readonly uploadsUrl = environment.uploadsUrl;
  readonly thaiDate = thaiDate;
  readonly ageFrom = ageFrom;

  constructor() {
    addIcons({ createOutline, locationOutline, personCircleOutline });
    void this.profile.load();
  }

  async startEdit(): Promise<void> {
    await this.geo.load();
    this.editing.set(true);
  }

  async onSaved(): Promise<void> {
    this.editing.set(false);
    await this.profile.load();
    const t = await this.toasts.create({ message: 'บันทึกโปรไฟล์แล้ว', color: 'success', duration: 2000, position: 'top' });
    await t.present();
  }

  areaText(a: SeekerArea): string {
    if (a.districtId === null) return `${a.provinceName} (ทั้งจังหวัด)`;
    return `${a.provinceId === 1 ? 'เขต' : 'อ.'}${a.districtName}, ${a.provinceName}`;
  }
}
