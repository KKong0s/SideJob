import { HttpContext } from '@angular/common/http';
import { Component, OnInit, inject, input } from '@angular/core';
import { AlertController, IonButton, IonIcon, IonItem, IonLabel, IonList, IonNote, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chatbubblesOutline, flagOutline } from 'ionicons/icons';

import { Page } from '../../models/page.model';
import { Review } from '../../models/review.model';
import { ReviewService } from '../../services/review.service';
import { thaiDate } from '../../utils/format';
import { PagedList } from '../../utils/paged-list';
import { PageStateComponent } from '../page-state/page-state.component';
import { StarsComponent } from '../stars/stars.component';
import { openReportDialog } from '../report-dialog';

/** Reviews with a "load more" button (used inside pages that already scroll). Optional report button per review. */
@Component({
  selector: 'app-review-list',
  template: `
    <app-page-state [state]="list.state()" emptyIcon="chatbubbles-outline" emptyText="ยังไม่มีรีวิว" (retry)="list.reload()">
      <ion-list lines="full">
        @for (r of list.items(); track r.id) {
          <ion-item>
            <ion-label class="ion-text-wrap">
              <div class="top">
                <app-stars [value]="r.rating"></app-stars>
                <ion-note>{{ thaiDate(r.createdAt) }}</ion-note>
              </div>
              @if (r.comment) {
                <p class="comment">{{ r.comment }}</p>
              }
              <p class="meta">{{ r.reviewerName }} · {{ r.jobTitle }}</p>
            </ion-label>
            @if (reportable()) {
              <ion-button slot="end" fill="clear" color="medium" size="small" (click)="report(r)" aria-label="รายงานรีวิวนี้">
                <ion-icon slot="icon-only" name="flag-outline"></ion-icon>
              </ion-button>
            }
          </ion-item>
        }
      </ion-list>
      @if (list.hasNext()) {
        <ion-button expand="block" fill="clear" (click)="list.loadMore()">ดูรีวิวเพิ่ม</ion-button>
      }
    </app-page-state>
  `,
  styles: `
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .comment {
      color: var(--ion-text-color) !important;
      margin: 4px 0;
      white-space: pre-line;
    }
    .meta {
      font-size: 0.8rem;
    }
  `,
  imports: [IonList, IonItem, IonLabel, IonNote, IonButton, IonIcon, PageStateComponent, StarsComponent],
})
export class ReviewListComponent implements OnInit {
  private readonly reviews = inject(ReviewService);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);

  readonly fetch = input.required<(page: number, context?: HttpContext) => Promise<Page<Review>>>();
  readonly reportable = input(false);

  readonly list = new PagedList<Review>((page, ctx) => this.fetch()(page, ctx));
  readonly thaiDate = thaiDate;

  constructor() {
    addIcons({ chatbubblesOutline, flagOutline });
  }

  ngOnInit(): void {
    void this.list.reload();
  }

  report(r: Review): void {
    void openReportDialog(this.alerts, this.toasts, this.reviews, 'review', r.id, 'รายงานรีวิวนี้');
  }
}
