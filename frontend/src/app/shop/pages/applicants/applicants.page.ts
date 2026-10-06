import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  IonButtons,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeCircle, peopleOutline } from 'ionicons/icons';

import { BellButtonComponent } from '../../../shared/components/bell-button/bell-button.component';
import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { Applicant } from '../../../shared/models/application.model';
import { ShopService } from '../../../shared/services/shop.service';
import { PagedList } from '../../../shared/utils/paged-list';
import { ApplicantItemComponent } from '../../components/applicant-item.component';

type Filter = 'pending' | 'accepted' | 'all';

/** All applicants of the shop's jobs; ?jobId= narrows it to one job (from the job detail page) */
@Component({
  selector: 'app-applicants',
  template: `
    <ion-header>
      <ion-toolbar><ion-title>ผู้สมัคร</ion-title>
        <ion-buttons slot="end"><app-bell-button></app-bell-button></ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="filter()" (ionChange)="setFilter($any($event.detail.value))">
          <ion-segment-button value="pending">รอพิจารณา</ion-segment-button>
          <ion-segment-button value="accepted">รับแล้ว</ion-segment-button>
          <ion-segment-button value="all">ทั้งหมด</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
      @if (jobFilter(); as job) {
        <ion-toolbar>
          <ion-chip (click)="clearJob()" color="primary">
            <ion-label>เฉพาะ: {{ job.title }}</ion-label>
            <ion-icon name="close-circle"></ion-icon>
          </ion-chip>
        </ion-toolbar>
      }
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="list.refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <app-page-state
        [state]="list.state()"
        [thumbnail]="true"
        emptyIcon="people-outline"
        [emptyText]="filter() === 'pending' ? 'ไม่มีผู้สมัครที่รอพิจารณา' : 'ยังไม่มีผู้สมัคร'"
        emptyHint="ผู้หางานที่สมัครงานของร้านจะแสดงที่นี่"
        actionText="ดูประกาศของฉัน"
        (action)="router.navigateByUrl('/shop/jobs')"
        (retry)="list.reload()"
      >
        <ion-list>
          @for (a of list.items(); track a.id) {
            <app-applicant-item [applicant]="a" (click)="open(a)"></app-applicant-item>
          }
        </ion-list>
      </app-page-state>
      <ion-infinite-scroll [disabled]="!list.hasNext()" (ionInfinite)="list.loadMore($event)">
        <ion-infinite-scroll-content></ion-infinite-scroll-content>
      </ion-infinite-scroll>
    </ion-content>
  `,
  imports: [
    BellButtonComponent,
    IonButtons,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonSegment,
    IonSegmentButton,
    IonChip,
    IonLabel,
    IonIcon,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonList,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    ApplicantItemComponent,
    PageStateComponent,
  ],
})
export class ApplicantsPage {
  private readonly shops = inject(ShopService);
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);

  readonly filter = signal<Filter>('pending');
  readonly jobFilter = signal<{ id: number; title: string } | null>(null);
  readonly list = new PagedList<Applicant>((page, ctx) =>
    this.shops.applications(
      { status: this.filter() === 'all' ? '' : this.filter(), jobId: this.jobFilter()?.id ?? null, page },
      ctx,
    ),
  );

  constructor() {
    addIcons({ closeCircle, peopleOutline });
  }

  async ionViewWillEnter(): Promise<void> {
    const jobId = Number(this.route.snapshot.queryParamMap.get('jobId'));
    if (jobId && jobId !== this.jobFilter()?.id) {
      // Coming from a job: show all its applicants, labelled with the job title
      this.filter.set('all');
      this.jobFilter.set({ id: jobId, title: '' });
      this.shops.job(jobId).then(
        (job) => this.jobFilter.set({ id: job.id, title: job.title }),
        () => undefined,
      );
    }
    await this.list.reload();
  }

  setFilter(filter: Filter): void {
    this.filter.set(filter);
    void this.list.reload();
  }

  clearJob(): void {
    this.jobFilter.set(null);
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
    void this.list.reload();
  }

  open(a: Applicant): void {
    void this.router.navigate(['/shop/applicants', a.id]);
  }
}
