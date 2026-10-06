import { Component, computed, input } from '@angular/core';
import { IonIcon, IonItem, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { calendarOutline, cashOutline, locationOutline, timeOutline } from 'ionicons/icons';

import { environment } from '../../../../environments/environment';
import { Job, daysText, locationText, timeText, wageText } from '../../models/job.model';

/** One job row in a list. Optional shop line for seeker lists; put badges in the "end" slot. */
@Component({
  selector: 'app-job-card',
  template: `
    <ion-item [button]="true" [detail]="false" lines="full" class="job-card">
      @if (shopName()) {
        <div slot="start" class="thumb">
          @if (shopImage()) {
            <img [src]="uploadsUrl + '/' + shopImage()" alt="" />
          } @else {
            <span>{{ shopName()!.slice(0, 1) }}</span>
          }
        </div>
      }
      <ion-label>
        <h2 class="title">{{ job().title }}</h2>
        @if (shopName()) {
          <p class="shop">{{ shopName() }}</p>
        }
        <p class="wage"><ion-icon name="cash-outline" aria-hidden="true"></ion-icon>{{ wage() }}</p>
        <p><ion-icon name="location-outline" aria-hidden="true"></ion-icon>{{ location() }}</p>
        <p><ion-icon name="calendar-outline" aria-hidden="true"></ion-icon>{{ days() }} · {{ time() }}</p>
        <ng-content select="[meta]"></ng-content>
      </ion-label>
      <div slot="end" class="end"><ng-content select="[end]"></ng-content></div>
    </ion-item>
  `,
  styles: `
    .job-card {
      --padding-top: 8px;
      --padding-bottom: 8px;
    }
    .title {
      font-weight: 600;
      white-space: normal;
    }
    .shop {
      color: var(--ion-color-step-700, var(--ion-color-medium));
    }
    .wage {
      color: var(--ion-color-success-shade) !important;
      font-weight: 600;
    }
    p {
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: normal;
    }
    p ion-icon {
      flex-shrink: 0;
    }
    .thumb {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      overflow: hidden;
      background: var(--ion-color-primary-tint);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.2rem;
      align-self: flex-start;
      margin-top: 8px;
    }
    .thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .end {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      align-self: flex-start;
      margin-top: 10px;
    }
  `,
  imports: [IonItem, IonLabel, IonIcon],
})
export class JobCardComponent {
  readonly job = input.required<Job>();
  readonly shopName = input<string | null>(null);
  readonly shopImage = input<string | null>(null);

  readonly uploadsUrl = environment.uploadsUrl;
  readonly wage = computed(() => wageText(this.job()));
  readonly location = computed(() => locationText(this.job()));
  readonly days = computed(() => daysText(this.job()));
  readonly time = computed(() => timeText(this.job()));

  constructor() {
    addIcons({ cashOutline, locationOutline, calendarOutline, timeOutline });
  }
}
