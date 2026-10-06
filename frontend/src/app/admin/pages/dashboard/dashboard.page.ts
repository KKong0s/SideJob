import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButtons,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonMenuButton,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { Loader } from '../../../shared/utils/loader';
import { AdminStats } from '../../admin.model';
import { AdminService } from '../../admin.service';

interface Tile {
  key: keyof AdminStats;
  label: string;
  link?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button></ion-menu-button></ion-buttons>
        <ion-title>แดชบอร์ด</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="stats.refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <app-page-state [state]="stats.state()" (retry)="stats.load()">
        @if (stats.value(); as s) {
          <ion-grid>
            <ion-row>
              @for (tile of tiles; track tile.key) {
                <ion-col size="6" size-md="4">
                  <ion-card [routerLink]="tile.link" [button]="!!tile.link" [class.highlight]="(tile.key === 'pendingShops' || tile.key === 'openReports') && s[tile.key] > 0">
                    <ion-card-content>
                      <div class="value">{{ s[tile.key].toLocaleString('th-TH') }}</div>
                      <div class="label">{{ tile.label }}</div>
                    </ion-card-content>
                  </ion-card>
                </ion-col>
              }
            </ion-row>
          </ion-grid>
        }
      </app-page-state>
    </ion-content>
  `,
  styles: `
    .value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--ion-text-color);
    }
    .label {
      color: var(--ion-color-medium);
    }
    ion-card.highlight {
      border: 2px solid var(--ion-color-warning);
    }
  `,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardContent,
    PageStateComponent,
  ],
})
export class AdminDashboardPage {
  private readonly admin = inject(AdminService);
  readonly stats = new Loader((ctx) => this.admin.stats(ctx));

  readonly tiles: Tile[] = [
    { key: 'pendingShops', label: 'ร้านรอยืนยัน', link: '/admin/shops' },
    { key: 'shops', label: 'ร้านค้าทั้งหมด' },
    { key: 'seekers', label: 'ผู้หางาน', link: '/admin/users' },
    { key: 'openJobs', label: 'ประกาศที่เปิดรับ', link: '/admin/jobs' },
    { key: 'applications', label: 'ใบสมัครทั้งหมด' },
    { key: 'openReports', label: 'รายงานที่รอจัดการ', link: '/admin/reports' },
  ];

  ionViewWillEnter(): void {
    void this.stats.load();
  }
}
