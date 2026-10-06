import { Component, input } from '@angular/core';
import { IonAvatar, IonBadge, IonIcon, IonItem, IonLabel, IonNote } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personCircleOutline } from 'ionicons/icons';

import { environment } from '../../../environments/environment';
import { APPLICATION_STATUS_COLOR, APPLICATION_STATUS_LABEL, Applicant } from '../../shared/models/application.model';
import { timeAgo } from '../../shared/utils/format';

/** One applicant row (applicants tab and dashboard) */
@Component({
  selector: 'app-applicant-item',
  template: `
    <ion-item [button]="true" [detail]="false">
      <ion-avatar slot="start">
        @if (applicant().seeker.avatarPath) {
          <img [src]="uploadsUrl + '/' + applicant().seeker.avatarPath" alt="" />
        } @else {
          <ion-icon name="person-circle-outline" class="placeholder" aria-hidden="true"></ion-icon>
        }
      </ion-avatar>
      <ion-label>
        <h3>{{ applicant().seeker.fullName }} @if (applicant().seeker.age) { <span class="age">· {{ applicant().seeker.age }} ปี</span> }</h3>
        <p>{{ applicant().job.title }}</p>
        @if (applicant().seeker.skills) {
          <p class="skills">{{ applicant().seeker.skills }}</p>
        }
      </ion-label>
      <div slot="end" class="end">
        <ion-badge [color]="statusColor[applicant().status]">{{ statusLabel[applicant().status] }}</ion-badge>
        <ion-note>{{ timeAgo(applicant().appliedAt) }}</ion-note>
      </div>
    </ion-item>
  `,
  styles: `
    .placeholder {
      width: 100%;
      height: 100%;
      color: var(--ion-color-medium);
    }
    .age {
      color: var(--ion-color-medium);
      font-weight: normal;
    }
    .skills {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .end {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      font-size: 0.75rem;
    }
  `,
  imports: [IonItem, IonAvatar, IonIcon, IonLabel, IonBadge, IonNote],
})
export class ApplicantItemComponent {
  readonly applicant = input.required<Applicant>();

  readonly uploadsUrl = environment.uploadsUrl;
  readonly statusLabel = APPLICATION_STATUS_LABEL;
  readonly statusColor = APPLICATION_STATUS_COLOR;
  readonly timeAgo = timeAgo;

  constructor() {
    addIcons({ personCircleOutline });
  }
}
