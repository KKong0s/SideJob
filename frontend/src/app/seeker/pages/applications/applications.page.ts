import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { documentTextOutline } from 'ionicons/icons';

import { JobCardComponent } from '../../../shared/components/job-card/job-card.component';
import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { APPLICATION_STATUS_COLOR, APPLICATION_STATUS_LABEL, MyApplication } from '../../../shared/models/application.model';
import { SeekerService } from '../../../shared/services/seeker.service';
import { timeAgo } from '../../../shared/utils/format';
import { PagedList } from '../../../shared/utils/paged-list';

const FILTERS = {
  active: 'pending,accepted',
  done: 'completed,rejected,cancelled',
  all: '',
} as const;
type Filter = keyof typeof FILTERS;

@Component({
  selector: 'app-applications',
  template: `
    <ion-header>
      <ion-toolbar><ion-title>ใบสมัครของฉัน</ion-title></ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="filter()" (ionChange)="setFilter($any($event.detail.value))">
          <ion-segment-button value="active">กำลังดำเนินการ</ion-segment-button>
          <ion-segment-button value="done">ที่ผ่านมา</ion-segment-button>
          <ion-segment-button value="all">ทั้งหมด</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="list.refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <app-page-state
        [state]="list.state()"
        [thumbnail]="true"
        emptyIcon="document-text-outline"
        [emptyText]="filter() === 'active' ? 'ยังไม่มีใบสมัครที่กำลังดำเนินการ' : 'ยังไม่มีใบสมัคร'"
        actionText="ไปค้นหางาน"
        (action)="router.navigateByUrl('/seeker/search')"
        (retry)="list.reload()"
      >
        <ion-list>
          @for (app of list.items(); track app.id) {
            <app-job-card [job]="app.job" [shopName]="app.job.shop.name" [shopImage]="app.job.shop.imagePath" (click)="open(app)">
              <p meta><ion-note>สมัคร {{ timeAgo(app.appliedAt) }}</ion-note></p>
              <ng-container end>
                <ion-badge [color]="statusColor[app.status]">{{ statusLabel[app.status] }}</ion-badge>
              </ng-container>
            </app-job-card>
          }
        </ion-list>
      </app-page-state>
      <ion-infinite-scroll [disabled]="!list.hasNext()" (ionInfinite)="list.loadMore($event)">
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  `,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonSegment,
    IonSegmentButton,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonList,
    IonBadge,
    IonNote,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    JobCardComponent,
    PageStateComponent,
  ],
})
export class ApplicationsPage {
  private readonly seeker = inject(SeekerService);
  readonly router = inject(Router);

  readonly filter = signal<Filter>('active');
  readonly list = new PagedList<MyApplication>((page, ctx) => this.seeker.applications(FILTERS[this.filter()], page, ctx));

  readonly statusLabel = APPLICATION_STATUS_LABEL;
  readonly statusColor = APPLICATION_STATUS_COLOR;
  readonly timeAgo = timeAgo;

  constructor() {
    addIcons({ documentTextOutline });
  }

  ionViewWillEnter(): void {
    void this.list.reload();
  }

  setFilter(filter: Filter): void {
    this.filter.set(filter);
    void this.list.reload();
  }

  open(app: MyApplication): void {
    void this.router.navigate(['/seeker/applications', app.id]);
  }
}
