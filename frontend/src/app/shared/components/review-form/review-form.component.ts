import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonNote, IonSpinner, IonTextarea } from '@ionic/angular';

import { ReviewInput } from '../../models/review.model';
import { thaiDateTime } from '../../utils/format';
import { StarsComponent } from '../stars/stars.component';

/** Star rating + comment. The parent sends it (send input) and gets `done` after success. */
@Component({
  selector: 'app-review-form',
  template: `
    <div class="review-form">
      <p class="title">{{ title() }}</p>
      <app-stars [editable]="true" [(value)]="rating"></app-stars>
      <ion-textarea
        fill="outline"
        label="ความคิดเห็น (ไม่บังคับ)"
        labelPlacement="floating"
        [autoGrow]="true"
        [counter]="true"
        [maxlength]="1000"
        [(ngModel)]="comment"
      ></ion-textarea>
      @if (deadline()) {
        <ion-note>รีวิวได้ถึง {{ thaiDateTime(deadline()) }} และรีวิวได้ครั้งเดียว</ion-note>
      }
      <ion-button expand="block" [disabled]="!rating() || busy()" (click)="submit()">
        @if (busy()) { <ion-spinner name="dots"></ion-spinner> } @else { ส่งรีวิว }
      </ion-button>
    </div>
  `,
  styles: `
    .review-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .title {
      margin: 0;
      font-weight: 600;
      color: var(--ion-text-color);
    }
  `,
  imports: [FormsModule, IonTextarea, IonButton, IonNote, IonSpinner, StarsComponent],
})
export class ReviewFormComponent {
  readonly title = input('ให้คะแนน');
  readonly deadline = input<string | null>(null);
  readonly send = input.required<(review: ReviewInput) => Promise<void>>();
  readonly done = output<void>();

  readonly rating = signal<number | null>(null);
  readonly busy = signal(false);
  comment = '';
  readonly thaiDateTime = thaiDateTime;

  async submit(): Promise<void> {
    const rating = this.rating();
    if (!rating) return;
    this.busy.set(true);
    try {
      await this.send()({ rating, comment: this.comment.trim() || undefined });
      this.done.emit();
    } catch {
      // the interceptor shows the error toast
    } finally {
      this.busy.set(false);
    }
  }
}
