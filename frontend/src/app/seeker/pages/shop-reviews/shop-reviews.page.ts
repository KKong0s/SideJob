import { Component, computed, inject, input } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

import { ReviewListComponent } from '../../../shared/components/review-list/review-list.component';
import { ReviewService } from '../../../shared/services/review.service';

/** Public reviews of a shop (from the job detail page) */
@Component({
  selector: 'app-shop-reviews',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/seeker/search" text="กลับ"></ion-back-button></ion-buttons>
        <ion-title>รีวิว{{ name() ? ' · ' + name() : 'ร้าน' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <app-review-list [fetch]="fetch" [reportable]="true"></app-review-list>
    </ion-content>
  `,
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, ReviewListComponent],
})
export class ShopReviewsPage {
  private readonly reviews = inject(ReviewService);

  /** Route param :id and query ?name= */
  readonly id = input.required<string>();
  readonly name = input<string>();
  readonly shopId = computed(() => Number(this.id()));

  readonly fetch = (page: number, ctx?: Parameters<ReviewService['shopReviews']>[2]) => this.reviews.shopReviews(this.shopId(), page, ctx);
}
