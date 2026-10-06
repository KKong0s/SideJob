import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ModalController,
  NavController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronDown, lockClosedOutline } from 'ionicons/icons';

import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { openGeoPicker } from '../../../shared/components/geo-picker/geo-picker.component';
import { JobInput, OwnJob, ScheduleType, WEEKDAYS, WEEKDAY_SHORT, WageUnit, Weekday } from '../../../shared/models/job.model';
import { GeoService } from '../../../shared/services/geo.service';
import { JobsService } from '../../../shared/services/jobs.service';
import { ShopService } from '../../../shared/services/shop.service';
import { toApiError } from '../../../shared/utils/api-error';
import { todayIso } from '../../../shared/utils/format';
import { LoadState, errorState } from '../../../shared/utils/paged-list';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Create (/shop/jobs/new) or edit (/shop/jobs/:id/edit) a job post */
@Component({
  selector: 'app-job-form',
  templateUrl: 'job-form.page.html',
  styleUrls: ['job-form.page.scss'],
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonSegment,
    IonSegmentButton,
    IonChip,
    IonLabel,
    IonIcon,
    IonNote,
    IonButton,
    IonSpinner,
    PageStateComponent,
  ],
})
export class JobFormPage implements OnInit {
  private readonly shops = inject(ShopService);
  private readonly modals = inject(ModalController);
  private readonly toasts = inject(ToastController);
  private readonly nav = inject(NavController);
  private readonly router = inject(Router);
  readonly geo = inject(GeoService);
  readonly jobs = inject(JobsService);

  /** Route param :id (absent when creating) */
  readonly id = input<string>();
  readonly isEdit = computed(() => !!this.id());

  readonly state = signal<LoadState>('loading');
  readonly locked = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly workDays = signal<Weekday[]>([]);
  readonly workDaysTouched = signal(false);

  readonly weekdays = WEEKDAYS;
  readonly weekdayLabel = WEEKDAY_SHORT;
  readonly today = todayIso();
  readonly minExpiry = todayIso(1);
  readonly maxExpiry = todayIso(60);
  readonly maxWorkDate = todayIso(365);

  readonly form = inject(FormBuilder).group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    categoryId: [null as number | null, Validators.required],
    description: ['', [Validators.required, Validators.maxLength(5000)]],
    provinceId: [null as number | null, Validators.required],
    districtId: [null as number | null, Validators.required],
    wage: [null as number | null, [Validators.required, Validators.min(1), Validators.max(100000)]],
    wageUnit: ['hour' as WageUnit, Validators.required],
    scheduleType: ['weekly' as ScheduleType, Validators.required],
    startDate: [''],
    endDate: [''],
    startTime: ['09:00', [Validators.required, Validators.pattern(TIME)]],
    endTime: ['17:00', [Validators.required, Validators.pattern(TIME)]],
    minAge: [null as number | null, [Validators.min(18), Validators.max(60)]],
    expiresOn: [todayIso(30)],
  });

  readonly scheduleType = signal<ScheduleType>('weekly');

  constructor() {
    addIcons({ chevronDown, lockClosedOutline });
  }

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      await Promise.all([this.geo.load(), this.jobs.loadCategories()]);
      if (this.isEdit()) {
        this.fill(await this.shops.job(Number(this.id())));
      } else {
        // New jobs default to the shop's own location
        const shop = await this.shops.getProfile();
        this.form.patchValue({ provinceId: shop.provinceId, districtId: shop.districtId });
      }
      this.state.set('ready');
    } catch (err) {
      this.state.set(errorState(err));
    }
  }

  private fill(job: OwnJob): void {
    this.form.patchValue({
      title: job.title,
      categoryId: job.category.id,
      description: job.description,
      provinceId: job.provinceId,
      districtId: job.districtId,
      wage: job.wage,
      wageUnit: job.wageUnit,
      scheduleType: job.scheduleType,
      startDate: job.startDate ?? '',
      endDate: job.endDate ?? '',
      startTime: job.startTime,
      endTime: job.endTime,
      minAge: job.minAge,
    });
    this.scheduleType.set(job.scheduleType);
    this.workDays.set(job.scheduleType === 'weekly' ? job.workDays : []);
    this.locked.set(job.locked);
    if (job.locked) {
      for (const name of ['wage', 'wageUnit', 'scheduleType', 'startDate', 'endDate', 'startTime', 'endTime'] as const) {
        this.form.controls[name].disable();
      }
    }
  }

  setScheduleType(type: ScheduleType): void {
    this.form.controls.scheduleType.setValue(type);
    this.scheduleType.set(type);
  }

  toggleDay(day: Weekday): void {
    if (this.locked()) return;
    this.workDaysTouched.set(true);
    this.workDays.update((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day]));
  }

  async chooseProvince(): Promise<void> {
    const control = this.form.controls.provinceId;
    const result = await openGeoPicker(this.modals, { mode: 'province', selected: control.value ? [control.value] : [] });
    control.markAsTouched();
    if (!result || result[0] === control.value) return;
    control.setValue(result[0]);
    this.form.controls.districtId.reset(null);
  }

  async chooseDistrict(): Promise<void> {
    const provinceId = this.form.controls.provinceId.value;
    if (!provinceId) return this.chooseProvince();
    const control = this.form.controls.districtId;
    const result = await openGeoPicker(this.modals, { mode: 'district', provinceId, selected: control.value ? [control.value] : [] });
    control.markAsTouched();
    if (result) control.setValue(result[0]);
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  /** Cross-field checks the validators above cannot express */
  private scheduleError(): string {
    const v = this.form.getRawValue();
    if (v.startTime === v.endTime) return 'เวลาเริ่มและเวลาเลิกงานต้องไม่ซ้ำกัน';
    if (v.scheduleType === 'dates') {
      if (!v.startDate || !v.endDate) return 'กรุณาเลือกวันเริ่มและวันสิ้นสุดงาน';
      if (v.endDate < v.startDate) return 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มงาน';
    } else if (this.workDays().length === 0) {
      return 'กรุณาเลือกวันทำงานอย่างน้อย 1 วัน';
    }
    if (!this.isEdit() && (!v.expiresOn || v.expiresOn < this.minExpiry || v.expiresOn > this.maxExpiry)) {
      return 'วันหมดอายุประกาศต้องอยู่ระหว่างพรุ่งนี้ถึง 60 วันข้างหน้า';
    }
    return '';
  }

  async submit(): Promise<void> {
    this.workDaysTouched.set(true);
    this.form.markAllAsTouched();
    const problem = this.form.invalid ? 'กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบและถูกต้อง' : this.scheduleError();
    this.error.set(problem);
    if (problem) return;

    const v = this.form.getRawValue();
    const input: JobInput = {
      title: v.title!.trim(),
      description: v.description!.trim(),
      categoryId: v.categoryId!,
      provinceId: v.provinceId!,
      districtId: v.districtId!,
      wage: Number(v.wage),
      wageUnit: v.wageUnit!,
      scheduleType: v.scheduleType!,
      startDate: v.scheduleType === 'dates' ? v.startDate : null,
      endDate: v.scheduleType === 'dates' ? v.endDate : null,
      workDays: v.scheduleType === 'weekly' ? this.workDays() : [],
      startTime: v.startTime!,
      endTime: v.endTime!,
      minAge: v.minAge ? Number(v.minAge) : null,
    };
    if (!this.isEdit()) input.expiresOn = v.expiresOn!;

    this.busy.set(true);
    try {
      if (this.isEdit()) {
        await this.shops.updateJob(Number(this.id()), input);
        await this.toast('บันทึกการแก้ไขแล้ว');
        this.nav.back();
      } else {
        const job = await this.shops.createJob(input);
        await this.toast('โพสต์ประกาศแล้ว');
        await this.router.navigate(['/shop/jobs', job.id], { replaceUrl: true });
      }
    } catch (err) {
      this.error.set(toApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }

  private async toast(message: string): Promise<void> {
    const t = await this.toasts.create({ message, color: 'success', duration: 2000, position: 'top' });
    await t.present();
  }
}
