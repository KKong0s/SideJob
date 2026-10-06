import { Component, computed, input, signal } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, close } from 'ionicons/icons';

import { environment } from '../../../../environments/environment';
import { JobImage } from '../../models/job.model';

/** Job sample photos: a scrollable strip; tapping one opens it full screen with previous / next */
@Component({
  selector: 'app-job-gallery',
  template: `
    @if (images().length) {
      <div class="strip" role="list" aria-label="รูปตัวอย่างงาน">
        @for (img of images(); track img.id; let i = $index) {
          <button type="button" class="thumb" role="listitem" (click)="open(i)" [attr.aria-label]="'ดูรูปที่ ' + (i + 1)">
            <img [src]="url(img)" alt="" loading="lazy" />
          </button>
        }
      </div>

      <ion-modal [isOpen]="index() !== null" (didDismiss)="index.set(null)">
        <ng-template>
          <ion-header>
            <ion-toolbar color="dark">
              <ion-title>รูป {{ (index() ?? 0) + 1 }} / {{ images().length }}</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="index.set(null)" aria-label="ปิด"><ion-icon slot="icon-only" name="close"></ion-icon></ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content color="dark">
            @if (current(); as img) {
              <div class="viewer">
                <img [src]="url(img)" alt="รูปตัวอย่างงาน" />
                @if (images().length > 1) {
                  <ion-button class="nav prev" fill="clear" color="light" (click)="step(-1)" aria-label="รูปก่อนหน้า">
                    <ion-icon slot="icon-only" name="chevron-back"></ion-icon>
                  </ion-button>
                  <ion-button class="nav next" fill="clear" color="light" (click)="step(1)" aria-label="รูปถัดไป">
                    <ion-icon slot="icon-only" name="chevron-forward"></ion-icon>
                  </ion-button>
                }
              </div>
            }
          </ion-content>
        </ng-template>
      </ion-modal>
    }
  `,
  styles: `
    .strip {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 0 16px 8px;
      scroll-snap-type: x mandatory;
    }
    .thumb {
      flex: 0 0 auto;
      width: 140px;
      height: 105px;
      padding: 0;
      border: 0;
      border-radius: 10px;
      overflow: hidden;
      scroll-snap-align: start;
      background: var(--ion-color-light);
      cursor: pointer;
    }
    .thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .viewer {
      position: relative;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .viewer img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      font-size: 1.5rem;
    }
    .prev {
      left: 4px;
    }
    .next {
      right: 4px;
    }
  `,
  imports: [IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent],
})
export class JobGalleryComponent {
  readonly images = input<JobImage[]>([]);
  readonly index = signal<number | null>(null);
  readonly current = computed(() => {
    const i = this.index();
    return i === null ? null : (this.images()[i] ?? null);
  });

  constructor() {
    addIcons({ chevronBack, chevronForward, close });
  }

  url(img: JobImage): string {
    return `${environment.uploadsUrl}/${img.path}`;
  }

  open(i: number): void {
    this.index.set(i);
  }

  step(delta: number): void {
    const n = this.images().length;
    this.index.update((i) => ((i ?? 0) + delta + n) % n);
  }
}
