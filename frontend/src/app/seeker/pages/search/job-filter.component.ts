import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';

import { WEEKDAYS, WEEKDAY_SHORT, WageUnit, Weekday } from '../../../shared/models/job.model';
import { EMPTY_FILTER, JobFilter } from '../../../shared/models/search.model';

/** Filter sheet: wage range / unit and work days. Category is picked with the chips on the search page. */
@Component({
  selector: 'app-job-filter',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-button (click)="cancel()">ยกเลิก</ion-button></ion-buttons>
        <ion-title>ตัวกรอง</ion-title>
        <ion-buttons slot="end"><ion-button (click)="clear()">ล้าง</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <h3>ค่าจ้างต่อ</h3>
      <ion-segment [value]="wageUnit() ?? 'any'" (ionChange)="setUnit($any($event.detail.value))">
        <ion-segment-button value="any"><ion-label>ทั้งหมด</ion-label></ion-segment-button>
        <ion-segment-button value="hour"><ion-label>ชั่วโมง</ion-label></ion-segment-button>
        <ion-segment-button value="day"><ion-label>วัน</ion-label></ion-segment-button>
        <ion-segment-button value="job"><ion-label>งาน</ion-label></ion-segment-button>
      </ion-segment>

      <h3>ช่วงค่าจ้าง (บาท)</h3>
      <div class="row">
        <ion-input type="number" inputmode="numeric" label="ต่ำสุด" labelPlacement="stacked" fill="outline" [min]="0" [(ngModel)]="wageMin"></ion-input>
        <ion-input type="number" inputmode="numeric" label="สูงสุด" labelPlacement="stacked" fill="outline" [min]="0" [(ngModel)]="wageMax"></ion-input>
      </div>
      @if (!wageUnit() && (wageMin || wageMax)) {
        <p class="hint">แนะนำให้เลือกหน่วยค่าจ้างด้วย เพื่อเทียบค่าจ้างได้ถูกต้อง</p>
      }

      <h3>วันทำงาน</h3>
      <div class="days">
        @for (day of weekdays; track day) {
          <ion-chip [outline]="!workDays().includes(day)" [color]="workDays().includes(day) ? 'primary' : 'medium'" (click)="toggleDay(day)">
            {{ dayLabel[day] }}
          </ion-chip>
        }
      </div>
      <p class="hint">แสดงงานที่ทำงานในวันที่เลือกอย่างน้อย 1 วัน</p>
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ion-button expand="block" class="ion-margin-horizontal" (click)="apply()">ใช้ตัวกรอง</ion-button>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: `
    h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: 20px 0 8px;
    }
    h3:first-child {
      margin-top: 0;
    }
    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .days {
      display: flex;
      flex-wrap: wrap;
    }
    .hint {
      margin: 4px 0 0;
      font-size: 0.85rem;
      color: var(--ion-color-medium);
    }
  `,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonInput,
    IonChip,
    IonFooter,
  ],
})
export class JobFilterComponent implements OnInit {
  private readonly modal = inject(ModalController);

  @Input() filter: JobFilter = EMPTY_FILTER;

  readonly wageUnit = signal<WageUnit | null>(null);
  readonly workDays = signal<Weekday[]>([]);
  wageMin: number | null = null;
  wageMax: number | null = null;

  readonly weekdays = WEEKDAYS;
  readonly dayLabel = WEEKDAY_SHORT;

  ngOnInit(): void {
    this.wageUnit.set(this.filter.wageUnit);
    this.workDays.set([...this.filter.workDays]);
    this.wageMin = this.filter.wageMin;
    this.wageMax = this.filter.wageMax;
  }

  setUnit(value: WageUnit | 'any'): void {
    this.wageUnit.set(value === 'any' ? null : value);
  }

  toggleDay(day: Weekday): void {
    this.workDays.update((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day]));
  }

  clear(): void {
    this.wageUnit.set(null);
    this.workDays.set([]);
    this.wageMin = null;
    this.wageMax = null;
  }

  apply(): void {
    const num = (v: number | null) => (v === null || (v as unknown) === '' || Number.isNaN(Number(v)) ? null : Math.max(0, Number(v)));
    let wageMin = num(this.wageMin);
    let wageMax = num(this.wageMax);
    if (wageMin !== null && wageMax !== null && wageMin > wageMax) [wageMin, wageMax] = [wageMax, wageMin];
    const result: JobFilter = {
      categoryId: this.filter.categoryId,
      wageUnit: this.wageUnit(),
      wageMin,
      wageMax,
      workDays: this.workDays(),
    };
    void this.modal.dismiss(result, 'confirm');
  }

  cancel(): void {
    void this.modal.dismiss(null, 'cancel');
  }
}
