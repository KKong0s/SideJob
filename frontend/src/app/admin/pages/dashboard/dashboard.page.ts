import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonLabel,
  IonMenuButton,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  RefresherCustomEvent,
} from '@ionic/angular';

import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { silentErrors } from '../../../shared/utils/api-error';
import { Loader } from '../../../shared/utils/loader';
import { AdminStats, DashboardCharts } from '../../admin.model';
import { AdminService } from '../../admin.service';
import { BarItem, BarListComponent } from '../../components/bar-list.component';
import { LineChartComponent, LinePoint, LineSeries } from '../../components/line-chart.component';

interface Tile {
  key: keyof AdminStats;
  label: string;
  link?: string;
}

type Period = 7 | 30 | 90;

const STATUS_LABEL: Record<keyof DashboardCharts['shopStatus'], string> = {
  verified: 'ยืนยันแล้ว',
  pending: 'รอยืนยัน',
  rejected: 'ไม่ผ่าน',
  unsubmitted: 'ยังไม่ส่งเอกสาร',
};

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
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="wrap">
        <h2 class="section">ภาพรวมตอนนี้</h2>
        <app-page-state [state]="stats.state()" (retry)="stats.load()">
          @if (stats.value(); as s) {
            <ion-grid class="tiles">
              <ion-row>
                @for (tile of tiles; track tile.key) {
                  <ion-col size="6" size-md="4" size-lg="2">
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

        <app-page-state [state]="snapshot.state()" (retry)="snapshot.load()">
          @if (snapshot.value(); as c) {
            <ion-grid>
              <ion-row>
                <ion-col size="12" size-md="6">
                  <ion-card class="chart-card">
                    <ion-card-header>
                      <ion-card-title>ประกาศที่เปิดรับ แยกตามภาค</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                      <app-bar-list [items]="bars(c.openJobsByRegion)" nameHeader="ภาค" valueHeader="ประกาศ" ariaLabel="ประกาศที่เปิดรับ แยกตามภาค"></app-bar-list>
                    </ion-card-content>
                  </ion-card>
                </ion-col>
                <ion-col size="12" size-md="6">
                  <ion-card class="chart-card">
                    <ion-card-header>
                      <ion-card-title>สถานะการยืนยันร้าน</ion-card-title>
                      <ion-card-subtitle>ร้านทั้งหมด {{ totalShops(c).toLocaleString('th-TH') }} ร้าน</ion-card-subtitle>
                    </ion-card-header>
                    <ion-card-content>
                      <app-bar-list [items]="statusBars(c)" nameHeader="สถานะ" valueHeader="ร้าน" ariaLabel="สถานะการยืนยันร้าน"></app-bar-list>
                    </ion-card-content>
                  </ion-card>
                </ion-col>
                <ion-col size="12" size-md="6">
                  <ion-card class="chart-card">
                    <ion-card-header>
                      <ion-card-title>10 จังหวัดที่มีประกาศเปิดรับมากที่สุด</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                      <app-bar-list [items]="bars(c.openJobsTopProvinces)" nameHeader="จังหวัด" valueHeader="ประกาศ" ariaLabel="10 จังหวัดที่มีประกาศเปิดรับมากที่สุด"></app-bar-list>
                    </ion-card-content>
                  </ion-card>
                </ion-col>
                <ion-col size="12" size-md="6">
                  <ion-card class="chart-card">
                    <ion-card-header>
                      <ion-card-title>ประกาศที่เปิดรับ แยกตามหมวด</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                      <app-bar-list [items]="bars(c.openJobsByCategory)" nameHeader="หมวด" valueHeader="ประกาศ" ariaLabel="ประกาศที่เปิดรับ แยกตามหมวด"></app-bar-list>
                    </ion-card-content>
                  </ion-card>
                </ion-col>
              </ion-row>
            </ion-grid>
          }
        </app-page-state>

        <h2 class="section">กิจกรรมย้อนหลัง</h2>
        <!-- The period filter scopes the chart below it -->
        <div class="filters">
          <ion-segment [value]="period()" (ionChange)="setPeriod($any($event.detail.value))">
            <ion-segment-button [value]="7"><ion-label>7 วัน</ion-label></ion-segment-button>
            <ion-segment-button [value]="30"><ion-label>30 วัน</ion-label></ion-segment-button>
            <ion-segment-button [value]="90"><ion-label>90 วัน</ion-label></ion-segment-button>
          </ion-segment>
        </div>
        <app-page-state [state]="activity.state()" (retry)="activity.load()">
          @if (activity.value(); as a) {
            <ion-grid><ion-row><ion-col size="12">
            <ion-card class="chart-card" [class.reloading]="reloading()">
              <ion-card-header>
                <ion-card-title>ผู้ใช้ใหม่ ประกาศใหม่ และใบสมัครใหม่ ต่อวัน</ion-card-title>
                <ion-card-subtitle>{{ a.days }} วันล่าสุด · รวม ผู้ใช้ {{ sum(a, 'users') }} · ประกาศ {{ sum(a, 'jobs') }} · ใบสมัคร {{ sum(a, 'applications') }}</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <app-line-chart [series]="lineSeries" [points]="points(a)" ariaLabel="กราฟผู้ใช้ใหม่ ประกาศใหม่ และใบสมัครใหม่ต่อวัน ใช้ลูกศรซ้ายขวาเพื่อดูแต่ละวัน"></app-line-chart>
              </ion-card-content>
            </ion-card>
            </ion-col></ion-row></ion-grid>
          }
        </app-page-state>
      </div>
    </ion-content>
  `,
  styles: `
    .wrap {
      max-width: 1200px;
      margin: 0 auto;
      padding-bottom: 24px;
    }
    .section {
      margin: 16px 16px 0;
      font-size: 1.05rem;
      font-weight: 700;
    }
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
    .chart-card {
      height: calc(100% - 16px);
    }
    .chart-card ion-card-title {
      font-size: 1rem;
      font-weight: 600;
    }
    .chart-card.reloading {
      opacity: 0.5;
      transition: opacity 0.2s;
    }
    .filters {
      max-width: 360px;
      margin: 8px 20px 0;
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
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    PageStateComponent,
    BarListComponent,
    LineChartComponent,
  ],
})
export class AdminDashboardPage {
  private readonly admin = inject(AdminService);

  readonly period = signal<Period>(30);
  readonly reloading = signal(false);
  readonly stats = new Loader((ctx) => this.admin.stats(ctx));
  /** Snapshot charts do not depend on the period: loaded with the 30-day request once */
  readonly snapshot = new Loader((ctx) => this.admin.charts(30, ctx));
  readonly activity = new Loader((ctx) => this.admin.charts(this.period(), ctx));

  readonly tiles: Tile[] = [
    { key: 'pendingShops', label: 'ร้านรอยืนยัน', link: '/admin/shops' },
    { key: 'shops', label: 'ร้านค้าทั้งหมด' },
    { key: 'seekers', label: 'ผู้หางาน', link: '/admin/users' },
    { key: 'openJobs', label: 'ประกาศที่เปิดรับ', link: '/admin/jobs' },
    { key: 'applications', label: 'ใบสมัครทั้งหมด' },
    { key: 'openReports', label: 'รายงานที่รอจัดการ', link: '/admin/reports' },
  ];

  readonly lineSeries: LineSeries[] = [
    { key: 'users', label: 'ผู้ใช้ใหม่', color: '--viz-series-1' },
    { key: 'jobs', label: 'ประกาศใหม่', color: '--viz-series-2' },
    { key: 'applications', label: 'ใบสมัครใหม่', color: '--viz-series-3' },
  ];

  ionViewWillEnter(): void {
    void this.stats.load();
    void this.snapshot.load();
    void this.activity.load();
  }

  async refresh(event: RefresherCustomEvent): Promise<void> {
    await Promise.all([this.stats.load(), this.snapshot.load(), this.activity.load()]);
    await event.target.complete();
  }

  /** Keeps the current chart on screen (dimmed) while the new period loads */
  async setPeriod(period: Period): Promise<void> {
    this.period.set(Number(period) as Period);
    this.reloading.set(true);
    try {
      this.activity.set(await this.admin.charts(this.period(), silentErrors()));
    } catch {
      // keep the previous chart; the refresher / next visit retries
    } finally {
      this.reloading.set(false);
    }
  }

  bars(rows: { name: string; value: number }[]): BarItem[] {
    return rows.map((r) => ({ name: r.name, value: r.value }));
  }

  statusBars(c: DashboardCharts): BarItem[] {
    return (Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((k) => ({ name: STATUS_LABEL[k], value: c.shopStatus[k] }));
  }

  totalShops(c: DashboardCharts): number {
    return Object.values(c.shopStatus).reduce((a, b) => a + b, 0);
  }

  points(a: DashboardCharts): LinePoint[] {
    return a.daily.map((d) => ({ date: d.date, values: { users: d.users, jobs: d.jobs, applications: d.applications } }));
  }

  sum(a: DashboardCharts, key: 'users' | 'jobs' | 'applications'): string {
    return a.daily.reduce((t, d) => t + d[key], 0).toLocaleString('th-TH');
  }
}
