import { Component, input, output } from '@angular/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonNote } from '@ionic/angular';

import { ReviewInput, ReviewSummary } from '../../models/review.model';
import { thaiDate } from '../../utils/format';
import { ReviewFormComponent } from '../review-form/review-form.component';
import { StarsComponent } from '../stars/stars.component';

interface ReviewState {
  status: string;
  reviewOpen: boolean;
  reviewDeadline: string | null;
  myReview?: ReviewSummary | null;
  theirReview?: ReviewSummary | null;
}

/** Reviews of one completed application: form while the 14-day window is open, then both reviews */
@Component({
  selector: 'app-application-reviews',
  template: `
    @if (app().status === 'completed') {
      <ion-card>
        <ion-card-header><ion-card-title>รีวิว</ion-card-title></ion-card-header>
        <ion-card-content>
          @if (app().myReview; as mine) {
            <div class="review">
              <p class="who">รีวิวของคุณถึง{{ otherName() }}</p>
              <app-stars [value]="mine.rating"></app-stars>
              @if (mine.comment) { <p class="comment">{{ mine.comment }}</p> }
            </div>
          } @else if (app().reviewOpen) {
            <app-review-form [title]="'ให้คะแนน' + otherName()" [deadline]="app().reviewDeadline" [send]="send()" (done)="done.emit()"></app-review-form>
          } @else {
            <ion-note>เลยกำหนดรีวิว (14 วันหลังงานเสร็จ) แล้ว</ion-note>
          }

          @if (app().theirReview; as theirs) {
            <div class="review">
              <p class="who">{{ otherName() }}รีวิวคุณ · {{ thaiDate(theirs.createdAt) }}</p>
              <app-stars [value]="theirs.rating"></app-stars>
              @if (theirs.comment) { <p class="comment">{{ theirs.comment }}</p> }
            </div>
          }
        </ion-card-content>
      </ion-card>
    }
  `,
  styles: `
    .review {
      margin-top: 12px;
    }
    .review:first-child {
      margin-top: 0;
    }
    .who {
      margin: 0 0 2px;
      font-weight: 600;
      color: var(--ion-text-color);
    }
    .comment {
      margin: 4px 0 0;
      white-space: pre-line;
      color: var(--ion-text-color);
    }
  `,
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonNote, StarsComponent, ReviewFormComponent],
})
export class ApplicationReviewsComponent {
  readonly app = input.required<ReviewState>();
  /** "ร้าน" or "ผู้สมัคร" */
  readonly otherName = input('อีกฝ่าย');
  readonly send = input.required<(review: ReviewInput) => Promise<void>>();
  readonly done = output<void>();
  readonly thaiDate = thaiDate;
}
