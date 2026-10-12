import { Component, input, output } from '@angular/core';
import { IonButton, IonIcon, IonItem, IonLabel, IonList, IonSkeletonText, IonThumbnail } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, cloudOfflineOutline, fileTrayOutline, refreshOutline } from 'ionicons/icons';

import { LoadState } from '../../utils/paged-list';

/**
 * The four data states every page shows: loading skeleton, empty, error, offline.
 * Content is projected only when the state is 'ready'.
 *
 *   <app-page-state [state]="list.state()" emptyText="..." actionText="..." (action)="..." (retry)="list.reload()">
 *     ...items...
 *   </app-page-state>
 */
@Component({
  selector: 'app-page-state',
  template: `
    @switch (state()) {
      @case ('loading') {
        @if (skeleton() !== 'list') {
          <!-- Same shape as app-job-card rows so nothing jumps when the data lands -->
          <div class="job-skeletons" [class.grid]="skeleton() === 'job-grid'" aria-busy="true" aria-label="กำลังโหลด">
            @for (row of skeletonRows; track $index) {
              <div class="job-skeleton">
                <div class="lines">
                  <ion-skeleton-text [animated]="true" class="line title"></ion-skeleton-text>
                  <ion-skeleton-text [animated]="true" class="line" style="width: 48%"></ion-skeleton-text>
                  <ion-skeleton-text [animated]="true" class="line" style="width: 62%"></ion-skeleton-text>
                </div>
                <ion-skeleton-text [animated]="true" class="pill"></ion-skeleton-text>
              </div>
            }
          </div>
        } @else {
        <ion-list lines="none" aria-busy="true" aria-label="กำลังโหลด">
          @for (row of skeletonRows; track $index) {
            <ion-item>
              @if (thumbnail()) {
                <ion-thumbnail slot="start"><ion-skeleton-text [animated]="true"></ion-skeleton-text></ion-thumbnail>
              }
              <ion-label>
                <h3><ion-skeleton-text [animated]="true" style="width: 70%"></ion-skeleton-text></h3>
                <p><ion-skeleton-text [animated]="true" style="width: 45%"></ion-skeleton-text></p>
                <p><ion-skeleton-text [animated]="true" style="width: 30%"></ion-skeleton-text></p>
              </ion-label>
            </ion-item>
          }
        </ion-list>
        }
      }
      @case ('empty') {
        <div class="state">
          <ion-icon [name]="emptyIcon()" aria-hidden="true"></ion-icon>
          <h3>{{ emptyText() }}</h3>
          @if (emptyHint()) {
            <p>{{ emptyHint() }}</p>
          }
          @if (actionText()) {
            <ion-button fill="outline" (click)="action.emit()">{{ actionText() }}</ion-button>
          }
        </div>
      }
      @case ('error') {
        <div class="state">
          <ion-icon name="alert-circle-outline" color="danger" aria-hidden="true"></ion-icon>
          <h3>โหลดข้อมูลไม่สำเร็จ</h3>
          <p>เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง</p>
          <ion-button fill="outline" (click)="retry.emit()">
            <ion-icon slot="start" name="refresh-outline"></ion-icon>ลองใหม่
          </ion-button>
        </div>
      }
      @case ('offline') {
        <div class="state">
          <ion-icon name="cloud-offline-outline" color="medium" aria-hidden="true"></ion-icon>
          <h3>ไม่มีการเชื่อมต่ออินเทอร์เน็ต</h3>
          <p>ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง</p>
          <ion-button fill="outline" (click)="retry.emit()">
            <ion-icon slot="start" name="refresh-outline"></ion-icon>ลองใหม่
          </ion-button>
        </div>
      }
      @default {
        <ng-content></ng-content>
      }
    }
  `,
  styles: `
    .state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 48px 24px;
      gap: 4px;
      animation: sj-fade var(--sj-dur-enter) var(--sj-ease-out);
    }
    .state ion-icon {
      animation: sj-rise 360ms var(--sj-ease-out) 60ms backwards;
    }
    .job-skeletons.grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 4px 24px;
    }
    .job-skeleton {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 18px 16px;
      border-bottom: 1.5px solid var(--sj-divider);
    }
    .job-skeleton .lines {
      flex: 1;
      min-width: 0;
    }
    .job-skeleton .line {
      height: 14px;
      margin: 0 0 8px;
      border-radius: 999px;
    }
    .job-skeleton .line.title {
      width: 72%;
      height: 18px;
      margin-bottom: 10px;
    }
    .job-skeleton .pill {
      flex: none;
      width: 84px;
      height: 36px;
      margin: 0;
      border-radius: 999px;
    }
    @media (max-width: 767px) {
      .job-skeletons.grid {
        grid-template-columns: 1fr;
      }
    }
    .state ion-icon {
      font-size: 56px;
      color: var(--ion-color-medium);
      margin-bottom: 8px;
    }
    .state h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 600;
    }
    .state p {
      margin: 0 0 12px;
      color: var(--ion-color-medium);
    }
  `,
  imports: [IonList, IonItem, IonLabel, IonSkeletonText, IonThumbnail, IonIcon, IonButton],
})
export class PageStateComponent {
  readonly state = input.required<LoadState>();
  readonly emptyIcon = input('file-tray-outline');
  readonly emptyText = input('ยังไม่มีข้อมูล');
  readonly emptyHint = input('');
  readonly actionText = input('');
  readonly thumbnail = input(false);
  /** 'job' draws skeletons shaped like app-job-card rows; 'job-grid' lays them out like the search grid */
  readonly skeleton = input<'list' | 'job' | 'job-grid'>('list');

  readonly action = output<void>();
  readonly retry = output<void>();

  readonly skeletonRows = [1, 2, 3, 4, 5];

  constructor() {
    addIcons({ alertCircleOutline, cloudOfflineOutline, fileTrayOutline, refreshOutline });
  }
}
