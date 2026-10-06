import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { bookmark, bookmarkOutline } from 'ionicons/icons';

import { JobCardComponent } from '../../../shared/components/job-card/job-card.component';
import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { SavedJob } from '../../../shared/models/search.model';
import { SeekerService } from '../../../shared/services/seeker.service';
import { PagedList } from '../../../shared/utils/paged-list';

@Component({
  selector: 'app-saved',
  template: `
    <ion-header>
      <ion-toolbar><ion-title>งานที่บันทึกไว้</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="list.refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <app-page-state
        [state]="list.state()"
        [thumbnail]="true"
        emptyIcon="bookmark-outline"
        emptyText="ยังไม่มีงานที่บันทึกไว้"
        emptyHint="กดไอคอนบุ๊กมาร์กในหน้ารายละเอียดงานเพื่อเก็บไว้ดูทีหลัง"
        actionText="ไปค้นหางาน"
        (action)="router.navigateByUrl('/seeker/search')"
        (retry)="list.reload()"
      >
        <ion-list>
          @for (job of list.items(); track job.id) {
            <app-job-card [job]="job" [shopName]="job.shop.name" [shopImage]="job.shop.imagePath" (click)="open(job)">
              <ng-container end>
                <ion-button fill="clear" size="small" (click)="remove(job, $event)" aria-label="นำออกจากงานที่บันทึก">
                  <ion-icon slot="icon-only" name="bookmark"></ion-icon>
                </ion-button>
                @if (!job.acceptingApplications) {
                  <ion-badge color="medium">ปิดรับแล้ว</ion-badge>
                }
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
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonList,
    IonButton,
    IonIcon,
    IonBadge,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    JobCardComponent,
    PageStateComponent,
  ],
})
export class SavedPage {
  private readonly seeker = inject(SeekerService);
  readonly router = inject(Router);
  readonly list = new PagedList<SavedJob>((page, ctx) => this.seeker.savedJobs(page, ctx));

  constructor() {
    addIcons({ bookmark, bookmarkOutline });
  }

  ionViewWillEnter(): void {
    void this.list.reload();
  }

  open(job: SavedJob): void {
    void this.router.navigate(['/seeker/jobs', job.id]);
  }

  async remove(job: SavedJob, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.seeker.unsave(job.id);
      this.list.update((items) => items.filter((j) => j.id !== job.id));
    } catch {
      // the interceptor shows the error toast
    }
  }
}
