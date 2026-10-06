import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { thaiDateTime } from '../../../shared/utils/format';
import { PagedList } from '../../../shared/utils/paged-list';
import { ACTION_LABEL, AdminLog, AdminLogFilters, TARGET_LABEL } from '../../admin.model';
import { AdminService } from '../../admin.service';

interface LogFilter {
  adminId: string;
  action: string;
  targetType: string;
  from: string;
  to: string;
}

const EMPTY_FILTER: LogFilter = { adminId: '', action: '', targetType: '', from: '', to: '' };

/** Read-only audit log with filters (admin, action, target type, date range) */
@Component({
  selector: 'app-admin-logs',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button></ion-menu-button></ion-buttons>
        <ion-title>Audit log</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="list.refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-grid class="filters">
        <ion-row>
          <ion-col size="12" size-md="4">
            <ion-select label="แอดมิน" labelPlacement="stacked" fill="outline" interface="popover" [(ngModel)]="filter.adminId">
              <ion-select-option value="">ทั้งหมด</ion-select-option>
              @for (a of options()?.admins ?? []; track a.id) {
                <ion-select-option [value]="'' + a.id">{{ a.email }}</ion-select-option>
              }
            </ion-select>
          </ion-col>
          <ion-col size="6" size-md="4">
            <ion-select label="การกระทำ" labelPlacement="stacked" fill="outline" interface="popover" [(ngModel)]="filter.action">
              <ion-select-option value="">ทั้งหมด</ion-select-option>
              @for (a of options()?.actions ?? []; track a) {
                <ion-select-option [value]="a">{{ actionLabel(a) }}</ion-select-option>
              }
            </ion-select>
          </ion-col>
          <ion-col size="6" size-md="4">
            <ion-select label="ประเภทเป้าหมาย" labelPlacement="stacked" fill="outline" interface="popover" [(ngModel)]="filter.targetType">
              <ion-select-option value="">ทั้งหมด</ion-select-option>
              @for (t of options()?.targetTypes ?? []; track t) {
                <ion-select-option [value]="t">{{ targetLabel(t) }}</ion-select-option>
              }
            </ion-select>
          </ion-col>
          <ion-col size="6" size-md="4">
            <ion-input type="date" label="ตั้งแต่วันที่" labelPlacement="stacked" fill="outline" [(ngModel)]="filter.from"></ion-input>
          </ion-col>
          <ion-col size="6" size-md="4">
            <ion-input type="date" label="ถึงวันที่" labelPlacement="stacked" fill="outline" [(ngModel)]="filter.to"></ion-input>
          </ion-col>
          <ion-col size="12" size-md="4" class="filter-buttons">
            <ion-button (click)="apply()">กรอง</ion-button>
            <ion-button fill="clear" color="medium" (click)="clear()">ล้าง</ion-button>
          </ion-col>
        </ion-row>
      </ion-grid>

      <app-page-state [state]="list.state()" emptyIcon="document-text-outline" emptyText="ไม่พบรายการ" (retry)="list.reload()">
        <ion-list>
          @for (log of list.items(); track log.id) {
            <ion-item>
              <ion-label class="ion-text-wrap">
                <h3>
                  <strong>{{ actionLabel(log.action) }}</strong> · {{ targetLabel(log.targetType) }} #{{ log.targetId }}
                </h3>
                <p>{{ log.admin.email }} · {{ thaiDateTime(log.createdAt) }}</p>
                @if (log.reason) {
                  <p>เหตุผล: {{ log.reason }}</p>
                }
              </ion-label>
              <ion-note slot="end">{{ log.action }}</ion-note>
            </ion-item>
          }
        </ion-list>
      </app-page-state>
      <ion-infinite-scroll [disabled]="!list.hasNext()" (ionInfinite)="list.loadMore($event)">
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  `,
  styles: `
    .filters {
      max-width: 960px;
      margin: 0;
    }
    .filter-buttons {
      display: flex;
      align-items: center;
    }
  `,
  imports: [
    FormsModule,
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
    IonSelect,
    IonSelectOption,
    IonInput,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    PageStateComponent,
  ],
})
export class AdminLogsPage {
  private readonly admin = inject(AdminService);

  readonly options = signal<AdminLogFilters | null>(null);
  filter: LogFilter = { ...EMPTY_FILTER };
  private applied: LogFilter = { ...EMPTY_FILTER };

  readonly list = new PagedList<AdminLog>((page, ctx) => this.admin.logs({ ...this.applied, page }, ctx));
  readonly thaiDateTime = thaiDateTime;

  constructor() {
    void this.list.reload();
    this.admin.logFilters().then(
      (o) => this.options.set(o),
      () => undefined,
    );
  }

  apply(): void {
    this.applied = { ...this.filter };
    void this.list.reload();
  }

  clear(): void {
    this.filter = { ...EMPTY_FILTER };
    this.apply();
  }

  actionLabel(action: string): string {
    return ACTION_LABEL[action] ?? action;
  }

  targetLabel(type: string): string {
    return TARGET_LABEL[type] ?? type;
  }
}
